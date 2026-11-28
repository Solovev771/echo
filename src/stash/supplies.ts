import type { InStatement } from "@libsql/client";
import { and, asc, desc, eq } from "drizzle-orm";
import type { SessionUser } from "./auth";
import { db, raw } from "./db";
import { id } from "./ids";
import { isPackGrams, PACK_GRAMS_ERROR } from "./packs";
import { supplies, supplyLines } from "./schema";

export const MAX_SUPPLY_LINES = 200;
export const MAX_LINE_GRAMS = 100_000;
export const MAX_PACKS = 500;

export type SupplyLineInput =
  | { flavorId: string; packs: number; priceKopecks?: number }
  | {
      brandId: string;
      lineName: string;
      newFlavorName: string;
      packGrams: number;
      priceKopecks: number;
      packs: number;
    };

type ResolvedLine = {
  /** Existing flavor id, or null when the flavor is created by this supply. */
  flavorId: string | null;
  newId: string;
  brandId: string;
  brandName: string;
  lineName: string;
  flavorName: string;
  packGrams: number;
  priceKopecks: number | null;
  packs: number;
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
  const [brandRows, flavorRows, lineRows] = await Promise.all([
    db().query.brands.findMany(),
    db().query.flavors.findMany(),
    db().query.lines.findMany(),
  ]);
  const brandName = new Map(brandRows.map((b) => [b.id, b.name]));
  const lineNameById = new Map(lineRows.map((l) => [l.id, l.name]));
  const flavorById = new Map(flavorRows.map((f) => [f.id, f]));
  const flavorByKey = new Map(
    flavorRows.map((f) => [
      `${f.brandId}\u0000${lineNameById.get(f.lineId) ?? ""}\u0000${f.name.toLowerCase()}\u0000${f.packGrams}`,
      f,
    ]),
  );

  const merged = new Map<string, ResolvedLine>();
  for (const line of lines) {
    let resolved: Omit<ResolvedLine, "grams" | "newId" | "packs">;
    if ("flavorId" in line) {
      const flavor = flavorById.get(line.flavorId);
      if (!flavor) throw new SupplyError("Один из ароматов не найден — обновите страницу", 404);
      if (!isPackGrams(flavor.packGrams)) {
        throw new SupplyError(`У «${flavor.name}» не указана грамовка. Откройте бренд и заполните позицию.`);
      }
      const nextPrice =
        "priceKopecks" in line && typeof line.priceKopecks === "number"
          ? line.priceKopecks
          : flavor.priceKopecks;
      resolved = {
        flavorId: flavor.id,
        brandId: flavor.brandId,
        brandName: brandName.get(flavor.brandId) ?? "",
        lineName: lineNameById.get(flavor.lineId) ?? "",
        flavorName: flavor.name,
        packGrams: flavor.packGrams,
        priceKopecks: nextPrice,
      };
    } else {
      const brand = brandName.get(line.brandId);
      if (brand === undefined) throw new SupplyError("Бренд не найден — обновите страницу", 404);
      if (!isPackGrams(line.packGrams)) {
        throw new SupplyError(PACK_GRAMS_ERROR);
      }
      const name = normalize(line.newFlavorName);
      const lineName = normalize(line.lineName);
      const existing = flavorByKey.get(
        `${line.brandId}\u0000${lineName}\u0000${name.toLowerCase()}\u0000${line.packGrams}`,
      );
      resolved = existing
        ? {
            flavorId: existing.id,
            brandId: existing.brandId,
            brandName: brand,
            lineName,
            flavorName: existing.name,
            packGrams: existing.packGrams,
            priceKopecks: existing.priceKopecks ?? line.priceKopecks,
          }
        : {
            flavorId: null,
            brandId: line.brandId,
            brandName: brand,
            lineName,
            flavorName: name,
            packGrams: line.packGrams,
            priceKopecks: line.priceKopecks,
          };
    }
    const key =
      resolved.flavorId ??
      `new\u0000${resolved.brandId}\u0000${resolved.lineName.toLowerCase()}\u0000${resolved.flavorName.toLowerCase()}\u0000${resolved.packGrams}`;
    const current = merged.get(key);
    if (current) {
      current.packs += line.packs;
      current.grams += line.packs * resolved.packGrams;
    } else {
      merged.set(key, {
        ...resolved,
        newId: id("fl"),
        packs: line.packs,
        grams: line.packs * resolved.packGrams,
      });
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
    let flavorArgs: Array<string | number> = [line.flavorId ?? ""];
    if (line.flavorId && line.priceKopecks != null) {
      statements.push({
        sql: `UPDATE flavors SET price_kopecks = ? WHERE id = ?`,
        args: [line.priceKopecks, line.flavorId],
      });
    }
    if (!line.flavorId && line.lineName) {
      const lineId = id("ln");
      statements.push(
        {
          sql: `INSERT INTO lines (id, brand_id, name, sort_order) VALUES (?, ?, ?, 0)
                ON CONFLICT(brand_id, name) DO NOTHING`,
          args: [lineId, line.brandId, line.lineName],
        },
        {
          sql: `INSERT INTO flavors (id, brand_id, line_id, name, pack_grams, price_kopecks)
                SELECT ?, ?, id, ?, ?, ? FROM lines WHERE brand_id = ? AND name = ?
                ON CONFLICT(brand_id, line_id, name, pack_grams) DO UPDATE SET
                  price_kopecks = COALESCE(excluded.price_kopecks, flavors.price_kopecks)`,
          args: [
            line.newId,
            line.brandId,
            line.flavorName,
            line.packGrams,
            line.priceKopecks,
            line.brandId,
            line.lineName,
          ],
        },
      );
      flavorExpr = `(SELECT f.id FROM flavors f
                     JOIN lines l ON l.id = f.line_id
                     WHERE f.brand_id = ? AND l.name = ? AND f.name = ? AND f.pack_grams = ?)`;
      flavorArgs = [line.brandId, line.lineName, line.flavorName, line.packGrams];
    } else if (!line.flavorId) {
      statements.push({
        sql: `INSERT INTO flavors (id, brand_id, line_id, name, pack_grams, price_kopecks)
              VALUES (?, ?, '', ?, ?, ?)
              ON CONFLICT(brand_id, line_id, name, pack_grams) DO UPDATE SET
                price_kopecks = COALESCE(excluded.price_kopecks, flavors.price_kopecks)`,
        args: [line.newId, line.brandId, line.flavorName, line.packGrams, line.priceKopecks],
      });
      flavorExpr = `(SELECT id FROM flavors WHERE brand_id = ? AND line_id = '' AND name = ? AND pack_grams = ?)`;
      flavorArgs = [line.brandId, line.flavorName, line.packGrams];
    }

    const journalName = line.packGrams ? `${line.flavorName} · ${line.packGrams} г` : line.flavorName;
    statements.push(
      {
        sql: `INSERT INTO supply_lines (
                id, supply_id, flavor_id, flavor_name, brand_id, brand_name,
                line_name, pack_grams, price_kopecks, packs, grams
              ) VALUES (?, ?, ${flavorExpr}, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id("sl"),
          supplyId,
          ...flavorArgs,
          line.flavorName,
          line.brandId,
          line.brandName,
          line.lineName,
          line.packGrams,
          line.priceKopecks,
          line.packs,
          line.grams,
        ],
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
          journalName,
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
