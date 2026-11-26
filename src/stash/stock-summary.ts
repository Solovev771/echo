import { eq } from "drizzle-orm";
import { db } from "./db";
import { flavors, stock } from "./schema";

/** Flavors with positive stock below this are "low". */
export const LOW_STOCK_GRAMS = 50;

export type BrandStockSummary = {
  brandId: string;
  flavorCount: number;
  totalGrams: number;
  lowCount: number;
};

export type VenueStockStrip = {
  brandsWithStock: number;
  totalGrams: number;
  lowCount: number;
};

export function formatGrams(grams: number): string {
  return `${grams.toLocaleString("ru-RU")} г`;
}

export function formatBrandStockLine(summary: BrandStockSummary): string {
  if (summary.flavorCount === 0) return "нет ароматов";
  const base = `${summary.flavorCount} аром. · ${formatGrams(summary.totalGrams)}`;
  if (summary.lowCount > 0) {
    return `${base} · ${summary.lowCount} мало`;
  }
  return base;
}

export async function loadVenueBrandStock(
  venueId: string,
): Promise<{ byBrand: Map<string, BrandStockSummary>; strip: VenueStockStrip }> {
  const [flavorRows, stockRows] = await Promise.all([
    db().query.flavors.findMany(),
    db().query.stock.findMany({ where: eq(stock.venueId, venueId) }),
  ]);

  const gramsByFlavor = new Map(stockRows.map((s) => [s.flavorId, s.grams]));
  const byBrand = new Map<string, BrandStockSummary>();

  for (const flavor of flavorRows) {
    const grams = gramsByFlavor.get(flavor.id) ?? 0;
    const current = byBrand.get(flavor.brandId) ?? {
      brandId: flavor.brandId,
      flavorCount: 0,
      totalGrams: 0,
      lowCount: 0,
    };
    current.flavorCount += 1;
    current.totalGrams += grams;
    if (grams > 0 && grams < LOW_STOCK_GRAMS) current.lowCount += 1;
    byBrand.set(flavor.brandId, current);
  }

  let brandsWithStock = 0;
  let totalGrams = 0;
  let lowCount = 0;
  for (const summary of byBrand.values()) {
    if (summary.totalGrams > 0) brandsWithStock += 1;
    totalGrams += summary.totalGrams;
    lowCount += summary.lowCount;
  }

  return {
    byBrand,
    strip: { brandsWithStock, totalGrams, lowCount },
  };
}
