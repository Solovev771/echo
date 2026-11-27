/** Flavors with positive stock below this are "low". A venue can pick one of these. */
export const LOW_STOCK_OPTIONS = [50, 100, 200] as const;
export type LowStockGrams = (typeof LOW_STOCK_OPTIONS)[number];
export const LOW_STOCK_GRAMS: LowStockGrams = 50;

export function isLowStockGrams(value: number): value is LowStockGrams {
  return (LOW_STOCK_OPTIONS as readonly number[]).includes(value);
}

export type StockLevel = "ok" | "low" | "out";

export function stockLevel(grams: number, lowGrams: number = LOW_STOCK_GRAMS): StockLevel {
  if (grams <= 0) return "out";
  if (grams < lowGrams) return "low";
  return "ok";
}

export function formatGrams(grams: number): string {
  return `${grams.toLocaleString("ru-RU")} г`;
}

export function shortVenueName(name: string): string {
  const parts = name.split("·");
  return parts[parts.length - 1].trim();
}
