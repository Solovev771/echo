/** Pack sizes a position can be. Stock is still kept in grams; one pack adds this many. */
export const PACK_GRAMS = [20, 40, 80, 100, 120, 160, 200, 250] as const;
export type PackGrams = (typeof PACK_GRAMS)[number];

export function isPackGrams(value: number): value is PackGrams {
  return (PACK_GRAMS as readonly number[]).includes(value);
}

/** Whole rubles or rubles with up to 2 kopecks, e.g. "890" or "890,50". */
export function parsePriceKopecks(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [rubles, fraction = "0"] = text.split(".");
  const kopecks = Number(rubles) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(kopecks) || kopecks > 10_000_000_00) return null;
  return kopecks;
}

export function formatPrice(kopecks: number | null | undefined): string {
  if (kopecks == null) return "—";
  const rubles = kopecks / 100;
  const text = Number.isInteger(rubles)
    ? rubles.toLocaleString("ru-RU")
    : rubles.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${text} ₽`;
}

export function priceInputValue(kopecks: number | null | undefined): string {
  if (kopecks == null) return "";
  const rubles = kopecks / 100;
  return Number.isInteger(rubles) ? String(rubles) : rubles.toFixed(2).replace(".", ",");
}
