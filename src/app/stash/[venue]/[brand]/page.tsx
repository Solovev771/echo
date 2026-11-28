import { asc, eq } from "drizzle-orm";
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Package, Scale } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMenu } from "@/components/stash/brand-admin";
import { BrandPanel } from "@/components/stash/brand-panel";
import { StatCard } from "@/components/stash/stat-card";
import { requireVenueAccess } from "@/stash/access";
import { db } from "@/stash/db";
import { brands, flavors, lines, stock } from "@/stash/schema";
import { formatGrams } from "@/stash/stock-summary";
import { isLowStockGrams, LOW_STOCK_GRAMS, stockLevel } from "@/stash/stock-level";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ venue: string; brand: string }>;
}) {
  const { venue: slug, brand: brandId } = await params;
  const { user, venue } = await requireVenueAccess(slug);

  const allBrands = await db().query.brands.findMany({
    orderBy: [asc(brands.sortOrder), asc(brands.name)],
  });
  const index = allBrands.findIndex((b) => b.id === brandId);
  if (index === -1) redirect(`/stash/${slug}`);
  const brand = allBrands[index];
  const prev = allBrands[index - 1] ?? null;
  const next = allBrands[index + 1] ?? null;

  const [flavorRows, stockRows, lineRows] = await Promise.all([
    db().query.flavors.findMany({
      where: eq(flavors.brandId, brand.id),
      orderBy: [asc(flavors.name)],
    }),
    db().query.stock.findMany({ where: eq(stock.venueId, venue.id) }),
    db().query.lines.findMany({ where: eq(lines.brandId, brand.id) }),
  ]);
  const gramsByFlavor = new Map(stockRows.map((s) => [s.flavorId, s.grams]));
  const lineName = new Map(lineRows.map((l) => [l.id, l.name]));
  const rows = flavorRows.map((f) => ({
    id: f.id,
    name: f.name,
    grams: gramsByFlavor.get(f.id) ?? 0,
    lineName: lineName.get(f.lineId) ?? "",
    packGrams: f.packGrams,
    priceKopecks: f.priceKopecks,
  }));
  const lowGrams = isLowStockGrams(venue.lowGrams) ? venue.lowGrams : LOW_STOCK_GRAMS;
  const totalGrams = rows.reduce((sum, r) => sum + r.grams, 0);
  const attention = rows.filter((r) => stockLevel(r.grams, lowGrams) !== "ok").length;

  return (
    <div className="space-y-5 md:space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/stash/${slug}`}
            className="-ml-2 flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-[var(--aura-muted)] transition hover:text-[var(--aura-white)] md:h-9"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Склад
          </Link>
          <div className="flex gap-1.5">
            {user.role === "admin" ? (
              <BrandMenu
                venueSlug={slug}
                brand={{ id: brand.id, name: brand.name }}
                flavorCount={rows.length}
              />
            ) : null}
            <BrandArrow
              href={prev ? `/stash/${slug}/${prev.id}` : null}
              label={prev ? `Предыдущий бренд: ${prev.name}` : "Нет предыдущего"}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </BrandArrow>
            <BrandArrow
              href={next ? `/stash/${slug}/${next.id}` : null}
              label={next ? `Следующий бренд: ${next.name}` : "Нет следующего"}
            >
              <ChevronRight className="size-4" aria-hidden />
            </BrandArrow>
          </div>
        </div>
        <div>
          <p className="text-[11px] tracking-[0.28em] text-[#f0a65a] uppercase">{venue.name}</p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{brand.name}</h1>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <StatCard icon={Package} label="Позиций" value={String(rows.length)} />
        <StatCard icon={Scale} label="На складе" value={formatGrams(totalGrams)} tone="green" />
        <StatCard icon={AlertTriangle} label="Мало / нет" value={String(attention)} tone="amber" />
      </div>

      <BrandPanel venueSlug={slug} brandId={brand.id} initialFlavors={rows} lowGrams={lowGrams} />
    </div>
  );
}

function BrandArrow({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const base =
    "flex size-11 items-center justify-center rounded-lg border border-white/12 md:size-9";
  if (!href) {
    return (
      <span className={`${base} opacity-30`} aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`${base} transition hover:border-[var(--aura-amber)]/45 hover:text-[#f0a65a] active:scale-95`}
    >
      {children}
    </Link>
  );
}
