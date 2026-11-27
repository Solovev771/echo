import { and, desc, eq, inArray } from "drizzle-orm";
import type { SessionUser } from "./auth";
import { db, raw } from "./db";
import { id } from "./ids";
import { brands, movements, type MovementKind } from "./schema";

type FlavorRef = { id: string; name: string; brandId: string };

export type MovementInput = {
  venueId: string;
  flavor: FlavorRef;
  brandName?: string;
  user: SessionUser;
  kind: MovementKind;
  delta?: number;
  gramsAfter?: number;
  note?: string | null;
};

async function brandNameFor(brandId: string) {
  const brand = await db().query.brands.findFirst({ where: eq(brands.id, brandId) });
  return brand?.name ?? "";
}

export async function recordMovement(input: MovementInput) {
  const brandName = input.brandName ?? (await brandNameFor(input.flavor.brandId));
  await db()
    .insert(movements)
    .values({
      id: id("mv"),
      venueId: input.venueId,
      flavorId: input.flavor.id,
      flavorName: input.flavor.name,
      brandId: input.flavor.brandId,
      brandName,
      userId: input.user.id,
      userName: input.user.name,
      kind: input.kind,
      delta: input.delta ?? 0,
      gramsAfter: input.gramsAfter ?? 0,
      note: input.note?.trim() || null,
      createdAt: new Date(),
    });
}

/**
 * Applies either a relative change (deltaGrams) or an inventory count (setGrams)
 * and journals it. Stock never goes below zero.
 */
export async function applyStockChange({
  venueId,
  flavor,
  user,
  deltaGrams,
  setGrams,
  note,
}: {
  venueId: string;
  flavor: FlavorRef;
  user: SessionUser;
  deltaGrams?: number;
  setGrams?: number;
  note?: string | null;
}) {
  const kind: MovementKind =
    setGrams !== undefined ? "set" : (deltaGrams ?? 0) >= 0 ? "in" : "out";
  const brandName = await brandNameFor(flavor.brandId);
  const now = Date.now();
  const movementId = id("mv");
  const nextExpr = setGrams !== undefined ? "MAX(0, ?)" : "MAX(0, grams + ?)";
  const amount = setGrams !== undefined ? setGrams : (deltaGrams ?? 0);
  const where = "venue_id = ? AND flavor_id = ?";

  // One write transaction: concurrent changes from several phones must not
  // overwrite each other (read-then-write loses updates over Turso's network).
  const results = await raw().batch(
    [
      {
        sql: `INSERT INTO stock (id, venue_id, flavor_id, grams, updated_at)
              VALUES (?, ?, ?, 0, ?) ON CONFLICT(venue_id, flavor_id) DO NOTHING`,
        args: [id("st"), venueId, flavor.id, now],
      },
      {
        sql: `INSERT INTO movements (id, venue_id, flavor_id, flavor_name, brand_id, brand_name,
                user_id, user_name, kind, delta, grams_after, note, created_at)
              SELECT ?, venue_id, flavor_id, ?, ?, ?, ?, ?, ?, ${nextExpr} - grams, ${nextExpr}, ?, ?
              FROM stock WHERE ${where}`,
        args: [
          movementId,
          flavor.name,
          flavor.brandId,
          brandName,
          user.id,
          user.name,
          kind,
          amount,
          amount,
          note?.trim() || null,
          now,
          venueId,
          flavor.id,
        ],
      },
      {
        sql: `UPDATE stock SET grams = ${nextExpr}, updated_at = ? WHERE ${where}`,
        args: [amount, now, venueId, flavor.id],
      },
      {
        sql: "SELECT delta, grams_after FROM movements WHERE id = ?",
        args: [movementId],
      },
    ],
    "write",
  );

  const journal = results[3].rows[0];
  const after = Number(journal?.grams_after ?? 0);
  const before = after - Number(journal?.delta ?? 0);
  return { before, after, kind };
}

export type MovementRow = typeof movements.$inferSelect;

export async function loadMovements(
  venueId: string,
  kinds: MovementKind[] | null,
  limit = 300,
): Promise<MovementRow[]> {
  return db().query.movements.findMany({
    where: kinds
      ? and(eq(movements.venueId, venueId), inArray(movements.kind, kinds))
      : eq(movements.venueId, venueId),
    orderBy: [desc(movements.createdAt)],
    limit,
  });
}
