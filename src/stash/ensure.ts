import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
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
  ]);
}

async function seed() {
  const database = db();
  const now = new Date();

  for (const venue of SEED_VENUES) {
    const existing = await database.query.venues.findFirst({
      where: eq(venues.slug, venue.slug),
    });
    if (!existing) {
      await database.insert(venues).values({
        id: id("ven"),
        slug: venue.slug,
        name: venue.name,
        address: venue.address,
      });
    }
  }

  let order = 0;
  for (const name of SEED_BRANDS) {
    const existing = await database.query.brands.findFirst({
      where: eq(brands.name, name),
    });
    if (!existing) {
      await database.insert(brands).values({
        id: id("br"),
        name,
        sortOrder: order,
      });
    }
    order += 1;
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

  const allVenues = await database.query.venues.findMany();

  for (const admin of adminSpecs) {
    let user = await database.query.users.findFirst({
      where: eq(users.email, admin.email),
    });
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
      user = await database.query.users.findFirst({
        where: eq(users.id, userId),
      });
    }
    if (!user) continue;
    for (const venue of allVenues) {
      const membership = await database.query.memberships.findFirst({
        where: (m, { and, eq: e }) =>
          and(e(m.userId, user!.id), e(m.venueId, venue.id)),
      });
      if (!membership) {
        await database.insert(memberships).values({
          id: id("mem"),
          userId: user.id,
          venueId: venue.id,
        });
      }
    }
  }
}

export function ensureStash() {
  if (!ready) {
    ready = (async () => {
      await migrate();
      await seed();
    })();
  }
  return ready;
}
