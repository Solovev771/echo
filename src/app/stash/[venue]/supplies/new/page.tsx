import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SupplyForm } from "@/components/stash/supply-form";
import { requireVenueAccess } from "@/stash/access";
import { db } from "@/stash/db";
import { brands, flavors, stock } from "@/stash/schema";

export default async function NewSupplyPage({
  params,
}: {
  params: Promise<{ venue: string }>;
}) {
  const { venue: slug } = await params;
  const { venue } = await requireVenueAccess(slug);

  const [brandRows, flavorRows, stockRows] = await Promise.all([
    db().query.brands.findMany({ orderBy: [asc(brands.sortOrder), asc(brands.name)] }),
    db().query.flavors.findMany({ orderBy: [asc(flavors.name)] }),
    db().query.stock.findMany({ where: eq(stock.venueId, venue.id) }),
  ]);
  const gramsByFlavor = new Map(stockRows.map((s) => [s.flavorId, s.grams]));

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
        <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Новая поставка</h1>
        <p className="mt-1 text-sm text-[var(--aura-muted)]">
          Выберите бренд и аромат, укажите граммы и добавьте в список. Когда всё внесено —
          проведите поставку.
        </p>
      </header>

      <SupplyForm
        venueSlug={slug}
        venueName={venue.name}
        brands={brandRows.map((b) => ({ id: b.id, name: b.name }))}
        flavors={flavorRows.map((f) => ({
          id: f.id,
          name: f.name,
          brandId: f.brandId,
          grams: gramsByFlavor.get(f.id) ?? 0,
        }))}
      />
    </div>
  );
}
