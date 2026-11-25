import { and, eq } from "drizzle-orm";
import { connection } from "next/server";
import { getSession, type SessionUser } from "./auth";
import { db } from "./db";
import { ensureStash } from "./ensure";
import { memberships, venues } from "./schema";

export async function requireUser() {
  await connection();
  await ensureStash();
  const user = await getSession();
  if (!user) return null;
  return user;
}

export async function canAccessVenue(user: SessionUser, venueId: string) {
  if (user.role === "admin") return true;
  const row = await db().query.memberships.findFirst({
    where: and(eq(memberships.userId, user.id), eq(memberships.venueId, venueId)),
  });
  return Boolean(row);
}

export async function getVenueBySlug(slug: string) {
  await ensureStash();
  return db().query.venues.findFirst({ where: eq(venues.slug, slug) });
}

export async function listVenuesForUser(user: SessionUser) {
  await ensureStash();
  if (user.role === "admin") {
    return db().query.venues.findMany();
  }
  const rows = await db().query.memberships.findMany({
    where: eq(memberships.userId, user.id),
  });
  const ids = new Set(rows.map((r) => r.venueId));
  const all = await db().query.venues.findMany();
  return all.filter((v) => ids.has(v.id));
}
