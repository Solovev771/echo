import { asc } from "drizzle-orm";
import { AlertTriangle, Layers, Package, Plus, Scale } from "lucide-react";
import Link from "next/link";
import { AddBrandButton } from "@/components/stash/brand-admin";
import { BrandTable, type BrandRow } from "@/components/stash/brand-table";
import { StatCard } from "@/components/stash/stat-card";
import { requireVenueAccess } from "@/stash/access";
import { db } from "@/stash/db";
import { brands } from "@/stash/schema";
import { formatGrams, loadVenueBrandStock } from "@/stash/stock-summary";

export default async function VenueBrandsPage({
  params,
}: {
  params: Promise<{ venue: string }>;
}) {
  const { venue: slug } = await params;
  const { user, venue } = await requireVenueAccess(slug);

  const list = await db().query.brands.findMany({
    orderBy: [asc(brands.sortOrder), asc(brands.name)],
  });
  const { byBrand, strip } = await loadVenueBrandStock(venue.id);

  const rows: BrandRow[] = list.flatMap((brand) => {
    const s = byBrand.get(brand.id);
    if (!s || s.flavorCount === 0) return [];
    return [
      {
        id: brand.id,
        name: brand.name,
        flavorCount: s.flavorCount,
        totalGrams: s.totalGrams,
        attention: s.lowCount + s.outCount,
      },
    ];
  });
  const attention = strip.lowCount + strip.outCount;

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.28em] text-[#f0a65a] uppercase">{venue.name}</p>
        <div className="mt-1 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
          <h1 className="text-2xl font-semibold md:text-3xl">Склад</h1>
          <div className="flex flex-wrap gap-2">
            {user.role === "admin" ? <AddBrandButton venueSlug={venue.slug} /> : null}
            <Link
              href={`/stash/${venue.slug}/supplies/new`}
              className="flex h-11 items-center gap-1.5 rounded-xl bg-[var(--aura-glow)] px-4 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.98] md:h-10"
            >
              <Plus className="size-4" aria-hidden />
              Поставка
            </Link>
          </div>
        </div>
        <p className="mt-1 text-sm text-[var(--aura-muted)]">
          Остатки табака по брендам. Откройте бренд, чтобы списать или пополнить.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        <StatCard icon={Layers} label="Брендов" value={String(strip.brandCount)} />
        <StatCard
          icon={Package}
          label="Позиций"
          value={strip.flavorCount.toLocaleString("ru-RU")}
        />
        <StatCard
          icon={Scale}
          label="На складе"
          value={formatGrams(strip.totalGrams)}
          tone="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="Заканчивается"
          value={attention.toLocaleString("ru-RU")}
          tone="amber"
          href={`/stash/${venue.slug}/low`}
        />
      </div>

      <BrandTable venueSlug={venue.slug} rows={rows} />
    </div>
  );
}
