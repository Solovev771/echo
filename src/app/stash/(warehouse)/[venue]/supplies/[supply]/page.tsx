import { ArrowLeft, CheckCircle2, Package, Scale } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/stash/stat-card";
import { requireVenueAccess } from "@/stash/access";
import { moscowDateTime } from "@/stash/format";
import { formatPrice } from "@/stash/packs";
import { formatGrams } from "@/stash/stock-level";
import { getSupply, type SupplyLineRow } from "@/stash/supplies";

export default async function SupplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ venue: string; supply: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const [{ venue: slug, supply: supplyId }, { done }] = await Promise.all([params, searchParams]);
  const { venue } = await requireVenueAccess(slug);
  const found = await getSupply(venue.id, supplyId);
  if (!found) redirect(`/stash/${slug}/supplies`);
  const { supply, lines } = found;

  const byBrand = new Map<string, { name: string; lines: SupplyLineRow[]; grams: number }>();
  for (const line of lines) {
    const group = byBrand.get(line.brandId) ?? { name: line.brandName, lines: [], grams: 0 };
    group.lines.push(line);
    group.grams += line.grams;
    byBrand.set(line.brandId, group);
  }
  const groups = [...byBrand.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));

  return (
    <div className="max-w-3xl space-y-5 md:space-y-6">
      <header>
        <Link
          href={`/stash/${slug}/supplies`}
          className="-ml-2 mb-2 flex h-9 w-fit items-center gap-1.5 rounded-lg px-2 text-sm text-[var(--aura-muted)] transition hover:text-[var(--aura-white)]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Поставки
        </Link>
        <p className="text-[11px] tracking-[0.28em] text-[#f0a65a] uppercase">{venue.name}</p>
        <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
          {supply.supplier || "Поставка"}
        </h1>
        <p className="mt-1 text-sm text-[var(--aura-muted)]">
          {moscowDateTime(supply.createdAt)} · принял(а) {supply.userName}
        </p>
      </header>

      {done ? (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-500/12 px-4 py-3 text-sm text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          Поставка проведена — остатки уже обновлены.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 md:gap-3">
        <StatCard icon={Package} label="Позиций" value={String(supply.lineCount)} />
        <StatCard icon={Scale} label="Всего" value={formatGrams(supply.totalGrams)} tone="green" />
      </div>

      {supply.note ? (
        <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-[var(--aura-white)]/85 italic">
          «{supply.note}»
        </p>
      ) : null}

      <div className="space-y-3">
        {groups.map((group) => (
          <section
            key={group.name}
            className="overflow-hidden rounded-2xl border border-white/10 bg-[#121110]/85"
          >
            <div className="flex items-baseline justify-between gap-3 border-b border-white/8 px-4 py-3">
              <h2 className="font-semibold">{group.name}</h2>
              <span className="text-xs text-[var(--aura-muted)] tabular-nums">
                {formatGrams(group.grams)}
              </span>
            </div>
            <ul>
              {group.lines.map((line, i) => (
                <li
                  key={line.id}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-white/6" : ""}`}
                >
                  <span className="min-w-0">
                    {line.lineName ? (
                      <span className="block truncate text-[11px] tracking-[0.08em] text-[var(--aura-muted)] uppercase">
                        {line.lineName}
                      </span>
                    ) : null}
                    <span className="block text-sm break-words">{line.flavorName}</span>
                    {line.packGrams ? (
                      <span className="block text-xs text-[var(--aura-muted)] tabular-nums">
                        {line.packs} × {line.packGrams} г · {formatPrice(line.priceKopecks)} за пачку
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-emerald-300 tabular-nums">
                    +{formatGrams(line.grams)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
