import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, raw } from "./db";
import { stock, venues } from "./schema";
import { isLowStockGrams, LOW_STOCK_GRAMS, stockLevel } from "./stock-level";

export { formatGrams, isLowStockGrams, LOW_STOCK_GRAMS, LOW_STOCK_OPTIONS, stockLevel } from "./stock-level";
export type { LowStockGrams } from "./stock-level";

export type BrandStockSummary = {
  brandId: string;
  flavorCount: number;
  totalGrams: number;
  lowCount: number;
  outCount: number;
};

export type VenueStockStrip = {
  brandCount: number;
  brandsWithStock: number;
  flavorCount: number;
  totalGrams: number;
  lowCount: number;
  outCount: number;
};

export function emptyBrandSummary(brandId: string): BrandStockSummary {
  return { brandId, flavorCount: 0, totalGrams: 0, lowCount: 0, outCount: 0 };
}

export const venueLowGrams = cache(async function venueLowGrams(venueId: string): Promise<number> {
  const venue = await db().query.venues.findFirst({ where: eq(venues.id, venueId) });
  return venue && isLowStockGrams(venue.lowGrams) ? venue.lowGrams : LOW_STOCK_GRAMS;
});

export type VenueCard = {
  venueId: string;
  flavorCount: number;
  totalGrams: number;
  attention: number;
};

/** One query for the venue list: positions, grams, and the running-low count. */
export const venueCards = cache(async function venueCards(venueIds: string[]) {
  const cards = new Map<string, VenueCard>();
  if (venueIds.length === 0) return cards;
  const result = await raw().execute({
    sql: `
      SELECT v.id AS venue_id,
        COUNT(s.id) AS flavor_count,
        COALESCE(SUM(s.grams), 0) AS total_grams,
        SUM(CASE
          WHEN s.id IS NULL OR f.pack_grams = 0 THEN 0
          WHEN s.grams <= 0 THEN 1
          WHEN s.grams < CASE
            WHEN v.low_grams IN (50, 100, 200) THEN v.low_grams
            ELSE 50
          END THEN 1
          ELSE 0
        END) AS attention
      FROM venues v
      LEFT JOIN stock s ON s.venue_id = v.id
      LEFT JOIN flavors f ON f.id = s.flavor_id
      WHERE v.id IN (${venueIds.map(() => "?").join(", ")})
      GROUP BY v.id
    `,
    args: venueIds,
  });
  for (const row of result.rows) {
    cards.set(String(row.venue_id), {
      venueId: String(row.venue_id),
      flavorCount: Number(row.flavor_count ?? 0),
      totalGrams: Number(row.total_grams ?? 0),
      attention: Number(row.attention ?? 0),
    });
  }
  return cards;
});

/** One query for the sidebar badge. Missing stock counts as empty. */
export const attentionCounts = cache(async function attentionCounts(venueIds: string[]) {
  const counts = new Map<string, number>();
  if (venueIds.length === 0) return counts;
  const result = await raw().execute({
    sql: `
      SELECT s.venue_id AS venue_id,
        SUM(CASE
          WHEN f.pack_grams = 0 THEN 0
          WHEN s.grams <= 0 THEN 1
          WHEN s.grams < CASE
            WHEN v.low_grams IN (50, 100, 200) THEN v.low_grams
            ELSE 50
          END THEN 1
          ELSE 0
        END) AS attention
      FROM stock s
      JOIN flavors f ON f.id = s.flavor_id
      JOIN venues v ON v.id = s.venue_id
      WHERE s.venue_id IN (${venueIds.map(() => "?").join(", ")})
      GROUP BY s.venue_id
    `,
    args: venueIds,
  });
  for (const row of result.rows) {
    counts.set(String(row.venue_id), Number(row.attention ?? 0));
  }
  return counts;
});

export const loadVenueBrandStock = cache(async function loadVenueBrandStock(
  venueId: string,
): Promise<{ byBrand: Map<string, BrandStockSummary>; strip: VenueStockStrip }> {
  const lowGrams = await venueLowGrams(venueId);
  const [flavorRows, stockRows] = await Promise.all([
    db().query.flavors.findMany(),
    db().query.stock.findMany({ where: eq(stock.venueId, venueId) }),
  ]);

  const gramsByFlavor = new Map(stockRows.map((s) => [s.flavorId, s.grams]));
  const byBrand = new Map<string, BrandStockSummary>();

  for (const flavor of flavorRows) {
    if (!gramsByFlavor.has(flavor.id)) continue;
    const grams = gramsByFlavor.get(flavor.id) ?? 0;
    const current = byBrand.get(flavor.brandId) ?? emptyBrandSummary(flavor.brandId);
    current.flavorCount += 1;
    current.totalGrams += grams;
    if (flavor.packGrams > 0) {
      const level = stockLevel(grams, lowGrams);
      if (level === "low") current.lowCount += 1;
      if (level === "out") current.outCount += 1;
    }
    byBrand.set(flavor.brandId, current);
  }

  const strip: VenueStockStrip = {
    brandCount: [...byBrand.values()].filter((summary) => summary.flavorCount > 0).length,
    brandsWithStock: 0,
    flavorCount: 0,
    totalGrams: 0,
    lowCount: 0,
    outCount: 0,
  };
  for (const summary of byBrand.values()) {
    if (summary.totalGrams > 0) strip.brandsWithStock += 1;
    strip.flavorCount += summary.flavorCount;
    strip.totalGrams += summary.totalGrams;
    strip.lowCount += summary.lowCount;
    strip.outCount += summary.outCount;
  }

  return { byBrand, strip };
});

export type RunningLowRow = {
  flavorId: string;
  flavorName: string;
  brandId: string;
  brandName: string;
  grams: number;
  packGrams: number;
};

/** Flavors at a venue that are low or out, low first, then by brand and name. */
export const loadRunningLow = cache(async function loadRunningLow(venueId: string): Promise<RunningLowRow[]> {
  const lowGrams = await venueLowGrams(venueId);
  const [brandRows, flavorRows, stockRows] = await Promise.all([
    db().query.brands.findMany(),
    db().query.flavors.findMany(),
    db().query.stock.findMany({ where: eq(stock.venueId, venueId) }),
  ]);
  const brandName = new Map(brandRows.map((b) => [b.id, b.name]));
  const gramsByFlavor = new Map(stockRows.map((s) => [s.flavorId, s.grams]));

  return flavorRows
    .filter((f) => gramsByFlavor.has(f.id) && f.packGrams > 0)
    .map((f) => ({
      flavorId: f.id,
      flavorName: f.name,
      brandId: f.brandId,
      brandName: brandName.get(f.brandId) ?? "",
      grams: gramsByFlavor.get(f.id) ?? 0,
      packGrams: f.packGrams,
    }))
    .filter((row) => stockLevel(row.grams, lowGrams) !== "ok")
    .sort((a, b) => {
      const la = stockLevel(a.grams, lowGrams) === "low" ? 0 : 1;
      const lb = stockLevel(b.grams, lowGrams) === "low" ? 0 : 1;
      if (la !== lb) return la - lb;
      return (
        a.brandName.localeCompare(b.brandName, "ru") ||
        a.flavorName.localeCompare(b.flavorName, "ru")
      );
    });
});