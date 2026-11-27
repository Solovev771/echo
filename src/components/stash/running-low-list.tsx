"use client";

import Link from "next/link";
import { StockBadge, StockStepper, useStockAdjust } from "@/components/stash/stock-controls";
import type { RunningLowRow } from "@/stash/stock-summary";

export function RunningLowList({
  venueSlug,
  title,
  hint,
  rows,
}: {
  venueSlug: string;
  title: string;
  hint: string;
  rows: RunningLowRow[];
}) {
  const { adjust, busy, error } = useStockAdjust(venueSlug);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121110]/85">
      <div className="flex items-baseline justify-between gap-3 border-b border-white/8 px-4 py-3">
        <h2 className="font-semibold">
          {title} <span className="text-sm font-normal text-[var(--aura-muted)]">{rows.length}</span>
        </h2>
        <p className="text-xs text-[var(--aura-muted)]">{hint}</p>
      </div>
      {error ? <p className="px-4 pt-3 text-sm text-red-400">{error}</p> : null}
      <ul>
        {rows.map((row, i) => (
          <li
            key={row.flavorId}
            className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-white/6" : ""}`}
          >
            <span className="min-w-0 flex-1">
              <Link
                href={`/stash/${venueSlug}/${row.brandId}`}
                className="block truncate text-[11px] tracking-[0.08em] text-[var(--aura-muted)] uppercase hover:text-[#f0a65a]"
              >
                {row.brandName}
              </Link>
              <span className="line-clamp-2 text-sm font-medium break-words">{row.flavorName}</span>
            </span>
            <StockBadge grams={row.grams} />
            <StockStepper
              disabled={busy === row.flavorId}
              onAdjust={(delta) => adjust(row.flavorId, delta)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
