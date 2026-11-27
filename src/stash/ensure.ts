import { compare, hash } from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { connection } from "next/server";
import { db, raw } from "./db";
import { id } from "./ids";
import { brands, memberships, users, venues } from "./schema";
import { SEED_BRANDS, SEED_VENUES } from "./seed-brands";

let ready: Promise<void> | null = null;

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
  ]);
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

  // Seed brands only into an empty table so admin renames/deletions stick.
  const anyBrand = await database.query.brands.findFirst();
  if (!anyBrand) {
    await database.insert(brands).values(
      SEED_BRANDS.map((name, order) => ({ id: id("br"), name, sortOrder: order })),
    );
  }

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
        await migrate();
        await seed();
      } catch (err) {
        ready = null;
        throw err;
      }
    })();
  }
  return ready;
}
