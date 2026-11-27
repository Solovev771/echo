/** Flavors with positive stock below this are "low". */
export const LOW_STOCK_GRAMS = 50;

export type StockLevel = "ok" | "low" | "out";

export function stockLevel(grams: number): StockLevel {
  if (grams <= 0) return "out";
  if (grams < LOW_STOCK_GRAMS) return "low";
  return "ok";
}

export function formatGrams(grams: number): string {
  return `${grams.toLocaleString("ru-RU")} г`;
}

export function shortVenueName(name: string): string {
  const parts = name.split("·");
  return parts[parts.length - 1].trim();
}
