import { ChevronRight, PackagePlus, Plus, Truck } from "lucide-react";
import Link from "next/link";
import { requireVenueAccess } from "@/stash/access";
import { moscowDate, moscowTime, positions } from "@/stash/format";
import { formatGrams } from "@/stash/stock-level";
import { listSupplies } from "@/stash/supplies";

export default async function SuppliesPage({
  params,
}: {
  params: Promise<{ venue: string }>;
}) {
  const { venue: slug } = await params;
  const { venue } = await requireVenueAccess(slug);
  const rows = await listSupplies(venue.id);

  return (
    <div className="max-w-3xl space-y-5 md:space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.28em] text-[#f0a65a] uppercase">{venue.name}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold md:text-3xl">Поставки</h1>
          <NewSupplyLink slug={slug} />
        </div>
        <p className="mt-1 text-sm text-[var(--aura-muted)]">
          Приём табака от поставщика: всё, что пришло, вносится одним документом и сразу
          прибавляется к остаткам.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#121110]/85 px-6 py-12 text-center">
          <Truck className="size-10 text-[var(--aura-muted)]" aria-hidden />
          <p className="font-semibold">Поставок пока не было</p>
          <p className="max-w-xs text-sm text-[var(--aura-muted)]">
            Когда привезут табак, нажмите «Поставка», отметьте ароматы и граммы — остатки
            обновятся автоматически.
          </p>
          <NewSupplyLink slug={slug} className="mt-2" />
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-white/10 bg-[#121110]/85">
          {rows.map((s, i) => (
            <li key={s.id} className={i > 0 ? "border-t border-white/6" : ""}>
              <Link
                href={`/stash/${slug}/supplies/${s.id}`}
                className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.03]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                  <PackagePlus className="size-4.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {s.supplier || "Без поставщика"}
                  </span>
                  <span className="block truncate text-xs text-[var(--aura-muted)]">
                    {moscowDate(s.createdAt)}, {moscowTime(s.createdAt)} · {s.userName}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold text-emerald-300 tabular-nums">
                    +{formatGrams(s.totalGrams)}
                  </span>
                  <span className="block text-[11px] text-[var(--aura-muted)]">
                    {positions(s.lineCount)}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-[var(--aura-muted)] transition group-hover:text-[#f0a65a]"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewSupplyLink({ slug, className = "" }: { slug: string; className?: string }) {
  return (
    <Link
      href={`/stash/${slug}/supplies/new`}
      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--aura-glow)] px-4 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.98] md:h-10 ${className}`}
    >
      <Plus className="size-4" aria-hidden />
      Поставка
    </Link>
  );
}
