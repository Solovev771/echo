import { eq } from "drizzle-orm";
import { db } from "./db";
import { stock } from "./schema";
import { stockLevel } from "./stock-level";

export { formatGrams, LOW_STOCK_GRAMS, stockLevel } from "./stock-level";

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

export async function loadVenueBrandStock(
  venueId: string,
): Promise<{ byBrand: Map<string, BrandStockSummary>; strip: VenueStockStrip }> {
  const [brandRows, flavorRows, stockRows] = await Promise.all([
    db().query.brands.findMany(),
    db().query.flavors.findMany(),
    db().query.stock.findMany({ where: eq(stock.venueId, venueId) }),
  ]);

  const gramsByFlavor = new Map(stockRows.map((s) => [s.flavorId, s.grams]));
  const byBrand = new Map<string, BrandStockSummary>();

  for (const flavor of flavorRows) {
    const grams = gramsByFlavor.get(flavor.id) ?? 0;
    const current = byBrand.get(flavor.brandId) ?? emptyBrandSummary(flavor.brandId);
    current.flavorCount += 1;
    current.totalGrams += grams;
    const level = stockLevel(grams);
    if (level === "low") current.lowCount += 1;
    if (level === "out") current.outCount += 1;
    byBrand.set(flavor.brandId, current);
  }

  const strip: VenueStockStrip = {
    brandCount: brandRows.length,
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
}

export type RunningLowRow = {
  flavorId: string;
  flavorName: string;
  brandId: string;
  brandName: string;
  grams: number;
  packGrams: number;
};

/** Flavors at a venue that are low or out, low first, then by brand and name. */
export async function loadRunningLow(venueId: string): Promise<RunningLowRow[]> {
  const [brandRows, flavorRows, stockRows] = await Promise.all([
    db().query.brands.findMany(),
    db().query.flavors.findMany(),
    db().query.stock.findMany({ where: eq(stock.venueId, venueId) }),
  ]);
  const brandName = new Map(brandRows.map((b) => [b.id, b.name]));
  const gramsByFlavor = new Map(stockRows.map((s) => [s.flavorId, s.grams]));

  return flavorRows
    .map((f) => ({
      flavorId: f.id,
      flavorName: f.name,
      brandId: f.brandId,
      brandName: brandName.get(f.brandId) ?? "",
      grams: gramsByFlavor.get(f.id) ?? 0,
      packGrams: f.packGrams,
    }))
    .filter((row) => stockLevel(row.grams) !== "ok")
    .sort((a, b) => {
      const la = stockLevel(a.grams) === "low" ? 0 : 1;
      const lb = stockLevel(b.grams) === "low" ? 0 : 1;
      if (la !== lb) return la - lb;
      return (
        a.brandName.localeCompare(b.brandName, "ru") ||
        a.flavorName.localeCompare(b.flavorName, "ru")
      );
    });
}