import type { InStatement } from "@libsql/client";
import { and, asc, desc, eq } from "drizzle-orm";
import type { SessionUser } from "./auth";
import { db, raw } from "./db";
import { id } from "./ids";
import { supplies, supplyLines } from "./schema";

export const MAX_SUPPLY_LINES = 200;
export const MAX_LINE_GRAMS = 100_000;

export type SupplyLineInput =
  | { flavorId: string; grams: number }
  | { brandId: string; newFlavorName: string; grams: number };

type ResolvedLine = {
  /** Existing flavor id, or null when the flavor is created by this supply. */
  flavorId: string | null;
  newId: string;
  brandId: string;
  brandName: string;
  flavorName: string;
  grams: number;
};

export class SupplyError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const normalize = (name: string) => name.trim().replace(/\s+/g, " ");

async function resolveLines(lines: SupplyLineInput[]): Promise<ResolvedLine[]> {
  const [brandRows, flavorRows] = await Promise.all([
    db().query.brands.findMany(),
    db().query.flavors.findMany(),
  ]);
  const brandName = new Map(brandRows.map((b) => [b.id, b.name]));
  const flavorById = new Map(flavorRows.map((f) => [f.id, f]));
  const flavorByKey = new Map(
    flavorRows.map((f) => [`${f.brandId}\u0000${f.name.toLowerCase()}`, f]),
  );

  const merged = new Map<string, ResolvedLine>();
  for (const line of lines) {
    let resolved: Omit<ResolvedLine, "grams" | "newId">;
    if ("flavorId" in line) {
      const flavor = flavorById.get(line.flavorId);
      if (!flavor) throw new SupplyError("Один из ароматов не найден — обновите страницу", 404);
      resolved = {
        flavorId: flavor.id,
        brandId: flavor.brandId,
        brandName: brandName.get(flavor.brandId) ?? "",
        flavorName: flavor.name,
      };
    } else {
      const brand = brandName.get(line.brandId);
      if (brand === undefined) throw new SupplyError("Бренд не найден — обновите страницу", 404);
      const name = normalize(line.newFlavorName);
      const existing = flavorByKey.get(`${line.brandId}\u0000${name.toLowerCase()}`);
      resolved = existing
        ? { flavorId: existing.id, brandId: existing.brandId, brandName: brand, flavorName: existing.name }
        : { flavorId: null, brandId: line.brandId, brandName: brand, flavorName: name };
    }
    const key = resolved.flavorId ?? `new\u0000${resolved.brandId}\u0000${resolved.flavorName.toLowerCase()}`;
    const current = merged.get(key);
    if (current) {
      current.grams += line.grams;
    } else {
      merged.set(key, { ...resolved, newId: id("fl"), grams: line.grams });
    }
  }

  const result = [...merged.values()];
  if (result.some((l) => l.grams > MAX_LINE_GRAMS)) {
    throw new SupplyError(`Слишком много в одной строке: максимум ${MAX_LINE_GRAMS / 1000} кг`);
  }
  return result;
}

/**
 * Posts a whole delivery in ONE write transaction: the supply, its lines, any new
 * flavors, stock increments and journal rows either all land or none do, and
 * concurrent stock changes can't interleave with it.
 */
export async function postSupply({
  venueId,
  user,
  supplier,
  note,
  lines,
}: {
  venueId: string;
  user: SessionUser;
  supplier?: string | null;
  note?: string | null;
  lines: SupplyLineInput[];
}) {
  const resolved = await resolveLines(lines);
  const supplyId = id("sup");
  const now = Date.now();
  const supplierName = supplier?.trim() || null;
  const movementNote = supplierName ? `Поставка: ${supplierName}` : "Поставка";
  const totalGrams = resolved.reduce((sum, l) => sum + l.grams, 0);

  const statements: InStatement[] = [
    {
      sql: `INSERT INTO supplies (id, venue_id, supplier, note, user_id, user_name, total_grams, line_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [supplyId, venueId, supplierName, note?.trim() || null, user.id, user.name, totalGrams, resolved.length, now],
    },
  ];

  for (const line of resolved) {
    // New flavors are referenced by (brand, name) so a flavor created concurrently
    // under the same name is reused instead of failing the whole supply.
    let flavorExpr = "?";
    let flavorArgs: string[] = [line.flavorId ?? ""];
    if (!line.flavorId) {
      statements.push({
        sql: `INSERT INTO flavors (id, brand_id, name) VALUES (?, ?, ?)
              ON CONFLICT(brand_id, name) DO NOTHING`,
        args: [line.newId, line.brandId, line.flavorName],
      });
      flavorExpr = "(SELECT id FROM flavors WHERE brand_id = ? AND name = ?)";
      flavorArgs = [line.brandId, line.flavorName];
    }

    statements.push(
      {
        sql: `INSERT INTO supply_lines (id, supply_id, flavor_id, flavor_name, brand_id, brand_name, grams)
              VALUES (?, ?, ${flavorExpr}, ?, ?, ?, ?)`,
        args: [id("sl"), supplyId, ...flavorArgs, line.flavorName, line.brandId, line.brandName, line.grams],
      },
      {
        sql: `INSERT INTO stock (id, venue_id, flavor_id, grams, updated_at)
              VALUES (?, ?, ${flavorExpr}, 0, ?) ON CONFLICT(venue_id, flavor_id) DO NOTHING`,
        args: [id("st"), venueId, ...flavorArgs, now],
      },
      {
        sql: `INSERT INTO movements (id, venue_id, flavor_id, flavor_name, brand_id, brand_name,
                user_id, user_name, kind, delta, grams_after, note, supply_id, created_at)
              SELECT ?, venue_id, flavor_id, ?, ?, ?, ?, ?, 'in', ?, grams + ?, ?, ?, ?
              FROM stock WHERE venue_id = ? AND flavor_id = ${flavorExpr}`,
        args: [
          id("mv"),
          line.flavorName,
          line.brandId,
          line.brandName,
          user.id,
          user.name,
          line.grams,
          line.grams,
          movementNote,
          supplyId,
          now,
          venueId,
          ...flavorArgs,
        ],
      },
      {
        sql: `UPDATE stock SET grams = grams + ?, updated_at = ?
              WHERE venue_id = ? AND flavor_id = ${flavorExpr}`,
        args: [line.grams, now, venueId, ...flavorArgs],
      },
    );
  }

  await raw().batch(statements, "write");
  return { id: supplyId, totalGrams, lineCount: resolved.length };
}

export type SupplyRow = typeof supplies.$inferSelect;
export type SupplyLineRow = typeof supplyLines.$inferSelect;

export async function listSupplies(venueId: string, limit = 200): Promise<SupplyRow[]> {
  return db().query.supplies.findMany({
    where: eq(supplies.venueId, venueId),
    orderBy: [desc(supplies.createdAt)],
    limit,
  });
}

export async function getSupply(venueId: string, supplyId: string) {
  const supply = await db().query.supplies.findFirst({
    where: and(eq(supplies.id, supplyId), eq(supplies.venueId, venueId)),
  });
  if (!supply) return null;
  const lines = await db().query.supplyLines.findMany({
    where: eq(supplyLines.supplyId, supply.id),
    orderBy: [asc(supplyLines.brandName), asc(supplyLines.flavorName)],
  });
  return { supply, lines };
}
