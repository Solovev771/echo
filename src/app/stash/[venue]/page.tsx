import { asc } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canAccessVenue, getVenueBySlug, requireUser } from "@/stash/access";
import { db } from "@/stash/db";
import { brands } from "@/stash/schema";

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

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link href="/stash" className="text-xs text-[var(--aura-muted)]">
          ← Точки
        </Link>
        <h1 className="text-2xl font-semibold">{venue.name}</h1>
        <p className="text-sm text-[var(--aura-muted)]">{venue.address}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xs tracking-wider text-[var(--aura-muted)] uppercase">Бренды</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/35">
          {list.map((brand, i) => (
            <Link
              key={brand.id}
              href={`/stash/${slug}/${brand.id}`}
              className={`flex items-center justify-between px-4 py-3.5 text-sm transition hover:bg-white/5 ${
                i > 0 ? "border-t border-white/8" : ""
              }`}
            >
              <span>{brand.name}</span>
              <span className="text-[var(--aura-muted)]">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
