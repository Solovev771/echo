"use client";

import Link from "next/link";
import { FlavorControls } from "@/components/stash/flavor-actions";
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
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121110]/85">
      <div className="flex items-baseline justify-between gap-3 border-b border-white/8 px-4 py-3">
        <h2 className="font-semibold">
          {title} <span className="text-sm font-normal text-[var(--aura-muted)]">{rows.length}</span>
        </h2>
        <p className="text-xs text-[var(--aura-muted)]">{hint}</p>
      </div>
      <ul>
        {rows.map((row, i) => (
          <li
            key={row.flavorId}
            className={`flex items-center gap-2 px-4 py-2.5 ${i > 0 ? "border-t border-white/6" : ""}`}
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
            <FlavorControls
              venueSlug={venueSlug}
              flavor={{ id: row.flavorId, name: row.flavorName, grams: row.grams }}
              editable={false}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
