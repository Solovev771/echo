import { formatGrams, type VenueStockStrip } from "@/stash/stock-summary";

export function VenueSummaryStrip({ strip }: { strip: VenueStockStrip }) {
  const parts = [
    `${strip.brandsWithStock} бренд${pluralBrand(strip.brandsWithStock)} с остатком`,
    formatGrams(strip.totalGrams),
  ];
  if (strip.lowCount > 0) {
    parts.push(`${strip.lowCount} мало`);
  }

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--aura-muted)]">
      {parts.map((part, i) => (
        <span key={part} className="inline-flex items-center gap-2">
          {i > 0 ? <span className="text-white/20" aria-hidden>·</span> : null}
          <span
            className={
              i === parts.length - 1 && strip.lowCount > 0
                ? "text-[var(--aura-amber)]"
                : undefined
            }
          >
            {part}
          </span>
        </span>
      ))}
    </p>
  );
}

function pluralBrand(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "а";
  return "ов";
}
