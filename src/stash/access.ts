import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSession, type SessionUser } from "./auth";
import { db } from "./db";
import { ensureStash } from "./ensure";
import { memberships, users, venues } from "./schema";

export async function requireUser() {
  await connection();
  await ensureStash();
  const session = await getSession();
  if (!session) return null;
  const row = await db().query.users.findFirst({ where: eq(users.id, session.id) });
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
  } satisfies SessionUser;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user || user.role !== "admin") return null;
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

export async function requireVenueAccess(slug: string) {
  const user = await requireUser();
  if (!user) redirect("/stash/login");
  const venue = await getVenueBySlug(slug);
  if (!venue || !(await canAccessVenue(user, venue.id))) redirect("/stash");
  return { user, venue };
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
