import { compare, hash } from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { connection } from "next/server";
import { db, raw } from "./db";
import { id } from "./ids";
import { brands, memberships, users, venues } from "./schema";
import { removeExtraKorolevVenue, seedKorolevShelf } from "./korolev-seed";
import { SEED_BRANDS, SEED_VENUES } from "./seed-brands";

let ready: Promise<void> | null = null;

/** Bump when the tables or the seed change. A matching value skips the migration round trips. */
const SCHEMA_VERSION = "7";

async function schemaIsCurrent() {
  try {
    const current = await raw().execute("SELECT value FROM stash_meta WHERE key = 'schema'");
    return String(current.rows[0]?.value ?? "") === SCHEMA_VERSION;
  } catch {
    return false;
  }
}

async function writeSchemaVersion() {
  const sql = raw();
  await sql.execute(
    "CREATE TABLE IF NOT EXISTS stash_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  );
  await sql.execute({
    sql: "INSERT INTO stash_meta (key, value) VALUES ('schema', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [SCHEMA_VERSION],
  });
}

async function migrate() {
  const sql = raw();
  await sql.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      created_at INTEGER NOT NULL
    )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      address TEXT NOT NULL
    )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      venue_id TEXT NOT NULL REFERENCES venues(id)
    )`,
      args: [],
    },
    {
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS membership_user_venue ON memberships(user_id, venue_id)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS flavors (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES brands(id),
      name TEXT NOT NULL
    )`,
      args: [],
    },
    {
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS flavor_brand_name ON flavors(brand_id, name)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id),
      flavor_id TEXT NOT NULL REFERENCES flavors(id),
      grams INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )`,
      args: [],
    },
    {
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS stock_venue_flavor ON stock(venue_id, flavor_id)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS movements (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL,
      flavor_id TEXT NOT NULL,
      flavor_name TEXT NOT NULL,
      brand_id TEXT NOT NULL,
      brand_name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      kind TEXT NOT NULL,
      delta INTEGER NOT NULL DEFAULT 0,
      grams_after INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at INTEGER NOT NULL
    )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS movements_venue_created ON movements(venue_id, created_at)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS supplies (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL,
      supplier TEXT,
      note TEXT,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      total_grams INTEGER NOT NULL,
      line_count INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS supplies_venue_created ON supplies(venue_id, created_at)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS supply_lines (
      id TEXT PRIMARY KEY,
      supply_id TEXT NOT NULL,
      flavor_id TEXT NOT NULL,
      flavor_name TEXT NOT NULL,
      brand_id TEXT NOT NULL,
      brand_name TEXT NOT NULL,
      grams INTEGER NOT NULL
    )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS supply_lines_supply ON supply_lines(supply_id)`,
      args: [],
    },
  ]);

  await sql.execute(`CREATE TABLE IF NOT EXISTS lines (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL REFERENCES brands(id),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`);
  await sql.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS line_brand_name ON lines(brand_id, name)",
  );

  await sql.execute("DROP INDEX IF EXISTS flavor_brand_name");
  await sql.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS flavor_position ON flavors(brand_id, line_id, name, pack_grams)",
  );

  await ensureColumns(sql, [
    ["movements", "supply_id", "TEXT"],
    ["flavors", "line_id", "TEXT NOT NULL DEFAULT ''"],
    ["flavors", "pack_grams", "INTEGER NOT NULL DEFAULT 0"],
    ["flavors", "price_kopecks", "INTEGER"],
    ["supply_lines", "line_name", "TEXT NOT NULL DEFAULT ''"],
    ["supply_lines", "pack_grams", "INTEGER NOT NULL DEFAULT 0"],
    ["supply_lines", "price_kopecks", "INTEGER"],
    ["supply_lines", "packs", "INTEGER NOT NULL DEFAULT 0"],
    ["venues", "low_grams", "INTEGER NOT NULL DEFAULT 50"],
    ["venues", "mix_auto", "INTEGER NOT NULL DEFAULT 0"],
    ["venues", "mix_publish", "INTEGER NOT NULL DEFAULT 0"],
  ]);

  await sql.execute(`CREATE TABLE IF NOT EXISTS mixes (
    id TEXT PRIMARY KEY,
    venue_id TEXT NOT NULL,
    name TEXT NOT NULL,
    zone TEXT NOT NULL,
    character TEXT NOT NULL,
    profile TEXT NOT NULL,
    story TEXT NOT NULL,
    notes TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    source TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`);
  await sql.execute("CREATE INDEX IF NOT EXISTS mix_venue_created ON mixes(venue_id, created_at)");
}

async function ensureColumns(
  sql: ReturnType<typeof raw>,
  columns: Array<[table: string, column: string, definition: string]>,
) {
  const tables = [...new Set(columns.map(([table]) => table))];
  const info = await sql.execute(
    tables.map((table) => `SELECT '${table}' AS t, name AS c FROM pragma_table_info('${table}')`).join(" UNION ALL "),
  );
  const have = new Set(info.rows.map((row) => `${row.t}.${row.c}`));
  for (const [table, column, definition] of columns) {
    if (have.has(`${table}.${column}`)) continue;
    try {
      await sql.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch (err) {
      if (!/duplicate column/i.test(err instanceof Error ? err.message : String(err))) throw err;
    }
  }
}

async function seed() {
  const database = db();
  const now = new Date();

  let allVenues = await database.query.venues.findMany();
  const missingVenues = SEED_VENUES.filter((v) => !allVenues.some((e) => e.slug === v.slug));
  if (missingVenues.length > 0) {
    await database
      .insert(venues)
      .values(missingVenues.map((v) => ({ id: id("ven"), ...v })))
      .onConflictDoNothing();
    allVenues = await database.query.venues.findMany();
  }

  for (const venue of SEED_VENUES) {
    await database
      .update(venues)
      .set({ name: venue.name, address: venue.address })
      .where(eq(venues.slug, venue.slug));
  }
  await removeExtraKorolevVenue();
  allVenues = await database.query.venues.findMany();

  // Seed brands only into an empty table so admin renames/deletions stick.
  const anyBrand = await database.query.brands.findFirst();
  if (!anyBrand) {
    await database.insert(brands).values(
      SEED_BRANDS.map((name, order) => ({ id: id("br"), name, sortOrder: order })),
    );
  }

  await seedKorolevShelf();

  const adminSpecs = [
    {
      email: process.env.STASH_ADMIN_EMAIL?.trim().toLowerCase(),
      password: process.env.STASH_ADMIN_PASSWORD,
      name: "Админ",
    },
    {
      email: process.env.STASH_ADMIN2_EMAIL?.trim().toLowerCase(),
      password: process.env.STASH_ADMIN2_PASSWORD,
      name: "Админ 2",
    },
  ].filter(
    (a): a is { email: string; password: string; name: string } =>
      Boolean(a.email && a.password),
  );
  if (adminSpecs.length === 0) return;

  const existingAdmins = await database.query.users.findMany({
    where: inArray(
      users.email,
      adminSpecs.map((a) => a.email),
    ),
  });

  const adminIds: string[] = [];
  for (const admin of adminSpecs) {
    const user = existingAdmins.find((u) => u.email === admin.email);
    if (!user) {
      const userId = id("usr");
      await database.insert(users).values({
        id: userId,
        email: admin.email,
        name: admin.name,
        passwordHash: await hash(admin.password, 10),
        role: "admin",
        createdAt: now,
      });
      adminIds.push(userId);
      continue;
    }
    adminIds.push(user.id);
    const matches = await compare(admin.password, user.passwordHash);
    if (!matches || user.role !== "admin") {
      await database
        .update(users)
        .set({
          passwordHash: await hash(admin.password, 10),
          role: "admin",
          name: admin.name,
        })
        .where(eq(users.id, user.id));
    }
  }

  const rows = adminIds.flatMap((userId) =>
    allVenues.map((venue) => ({ id: id("mem"), userId, venueId: venue.id })),
  );
  if (rows.length > 0) {
    await database.insert(memberships).values(rows).onConflictDoNothing();
  }
}

export async function ensureStash() {
  await connection();
  if (!ready) {
    ready = (async () => {
      try {
        if (await schemaIsCurrent()) return;
        await migrate();
        await seed();
        await writeSchemaVersion();
      } catch (err) {
        ready = null;
        throw err;
      }
    })();
  }
  return ready;
}
