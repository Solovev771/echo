import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { RunningLowList } from "@/components/stash/running-low-list";
import { requireVenueAccess } from "@/stash/access";
import { LOW_STOCK_GRAMS, loadRunningLow, stockLevel } from "@/stash/stock-summary";

export default async function RunningLowPage({
  params,
}: {
  params: Promise<{ venue: string }>;
}) {
  const { venue: slug } = await params;
  const { venue } = await requireVenueAccess(slug);
  const rows = await loadRunningLow(venue.id);
  const low = rows.filter((r) => stockLevel(r.grams) === "low");
  const out = rows.filter((r) => stockLevel(r.grams) === "out");

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.28em] text-[#f0a65a] uppercase">{venue.name}</p>
        <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Заканчивается</h1>
        <p className="mt-1 text-sm text-[var(--aura-muted)]">
          Ароматы, которых меньше {LOW_STOCK_GRAMS} г или нет совсем. Пополняйте прямо отсюда.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#121110]/85 px-6 py-12 text-center">
          <CheckCircle2 className="size-10 text-emerald-300" aria-hidden />
          <p className="font-semibold">Всё в наличии</p>
          <p className="max-w-xs text-sm text-[var(--aura-muted)]">
            Ни один аромат не опустился ниже {LOW_STOCK_GRAMS} г.
          </p>
          <Link
            href={`/stash/${venue.slug}`}
            className="mt-2 rounded-xl bg-white/8 px-4 py-2.5 text-sm transition hover:bg-white/12"
          >
            К складу
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {low.length > 0 ? (
            <RunningLowList
              venueSlug={venue.slug}
              title="Мало"
              hint={`меньше ${LOW_STOCK_GRAMS} г`}
              rows={low}
            />
          ) : null}
          {out.length > 0 ? (
            <RunningLowList
              venueSlug={venue.slug}
              title="Закончились"
              hint="0 г"
              rows={out}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
