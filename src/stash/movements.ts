import { and, desc, eq, inArray } from "drizzle-orm";
import type { SessionUser } from "./auth";
import { db } from "./db";
import { id } from "./ids";
import { brands, movements, stock, type MovementKind } from "./schema";

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
  const row = await db().query.stock.findFirst({
    where: and(eq(stock.venueId, venueId), eq(stock.flavorId, flavor.id)),
  });
  const before = row?.grams ?? 0;
  const after =
    setGrams !== undefined ? Math.max(0, setGrams) : Math.max(0, before + (deltaGrams ?? 0));
  const now = new Date();

  if (!row) {
    await db().insert(stock).values({
      id: id("st"),
      venueId,
      flavorId: flavor.id,
      grams: after,
      updatedAt: now,
    });
  } else {
    await db().update(stock).set({ grams: after, updatedAt: now }).where(eq(stock.id, row.id));
  }

  const kind: MovementKind =
    setGrams !== undefined ? "set" : (deltaGrams ?? 0) >= 0 ? "in" : "out";
  await recordMovement({
    venueId,
    flavor,
    user,
    kind,
    delta: after - before,
    gramsAfter: after,
    note,
  });

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
