import { asc } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VenueSummaryStrip } from "@/components/stash/venue-summary-strip";
import { canAccessVenue, getVenueBySlug, requireUser } from "@/stash/access";
import { db } from "@/stash/db";
import { brands } from "@/stash/schema";
import {
  formatBrandStockLine,
  loadVenueBrandStock,
  type BrandStockSummary,
} from "@/stash/stock-summary";

export default async function VenueBrandsPage({
  params,
}: {
  params: Promise<{ venue: string }>;
}) {
  const { venue: slug } = await params;
  const user = await requireUser();
  if (!user) redirect("/stash/login");

  const venue = await getVenueBySlug(slug);
  if (!venue) redirect("/stash");
  if (!(await canAccessVenue(user, venue.id))) redirect("/stash");

  const list = await db().query.brands.findMany({
    orderBy: [asc(brands.sortOrder), asc(brands.name)],
  });
  const { byBrand, strip } = await loadVenueBrandStock(venue.id);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link href="/stash" className="text-xs text-[var(--aura-muted)] md:hidden">
          ← Точки
        </Link>
        <h1 className="text-2xl font-semibold">{venue.name}</h1>
        <p className="text-sm text-[var(--aura-muted)]">{venue.address}</p>
        <VenueSummaryStrip strip={strip} />
      </header>

      <section className="space-y-2">
        <h2 className="text-xs tracking-wider text-[var(--aura-muted)] uppercase">
          Бренды
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/35">
          {list.map((brand, i) => {
            const summary: BrandStockSummary = byBrand.get(brand.id) ?? {
              brandId: brand.id,
              flavorCount: 0,
              totalGrams: 0,
              lowCount: 0,
            };
            const line = formatBrandStockLine(summary);
            return (
              <Link
                key={brand.id}
                href={`/stash/${slug}/${brand.id}`}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition hover:bg-white/5 ${
                  i > 0 ? "border-t border-white/8" : ""
                }`}
              >
                <span className="min-w-0 truncate font-medium">{brand.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--aura-muted)]">
                  <span
                    className={
                      summary.lowCount > 0
                        ? "text-[var(--aura-amber)]"
                        : undefined
                    }
                  >
                    {line}
                  </span>
                  <span className="text-[var(--aura-muted)]/70">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
