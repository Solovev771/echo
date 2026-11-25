import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandPanel } from "@/components/stash/brand-panel";
import { canAccessVenue, getVenueBySlug, requireUser } from "@/stash/access";
import { db } from "@/stash/db";
import { brands, flavors, stock } from "@/stash/schema";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ venue: string; brand: string }>;
}) {
  const { venue: slug, brand: brandId } = await params;
  const user = await requireUser();
  if (!user) redirect("/stash/login");

  const venue = await getVenueBySlug(slug);
  if (!venue) redirect("/stash");
  if (!(await canAccessVenue(user, venue.id))) redirect("/stash");

  const brand = await db().query.brands.findFirst({
    where: eq(brands.id, brandId),
  });
  if (!brand) redirect(`/stash/${slug}`);

  const flavorRows = await db().query.flavors.findMany({
    where: eq(flavors.brandId, brand.id),
    orderBy: [asc(flavors.name)],
  });
  const stockRows = await db().query.stock.findMany({
    where: and(eq(stock.venueId, venue.id)),
  });
  const gramsByFlavor = new Map(stockRows.map((s) => [s.flavorId, s.grams]));

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link href={`/stash/${slug}`} className="text-xs text-[var(--aura-muted)]">
          ← Бренды
        </Link>
        <h1 className="text-2xl font-semibold">{brand.name}</h1>
        <p className="text-sm text-[var(--aura-muted)]">{venue.name}</p>
      </header>

      <BrandPanel
        venueSlug={slug}
        brandId={brand.id}
        brandName={brand.name}
        initialFlavors={flavorRows.map((f) => ({
          id: f.id,
          name: f.name,
          grams: gramsByFlavor.get(f.id) ?? 0,
        }))}
      />
    </div>
  );
}
