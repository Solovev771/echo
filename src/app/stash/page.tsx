import Link from "next/link";
import { redirect } from "next/navigation";
import { listVenuesForUser, requireUser } from "@/stash/access";
import { LogoutButton } from "@/components/stash/logout-button";

export default async function StashHomePage() {
  const user = await requireUser();
  if (!user) redirect("/stash/login");

  const venues = await listVenuesForUser(user);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.28em] text-[var(--aura-amber)] uppercase">
            HookahPlace Aura
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Склад</h1>
          <p className="mt-1 text-sm text-[var(--aura-muted)]">
            {user.name} · {user.role === "admin" ? "админ" : "сотрудник"}
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="space-y-3">
        <h2 className="text-xs tracking-wider text-[var(--aura-muted)] uppercase">Точки</h2>
        {venues.map((venue) => (
          <Link
            key={venue.id}
            href={`/stash/${venue.slug}`}
            className="block rounded-2xl border border-white/10 bg-black/35 px-4 py-4 transition hover:border-[var(--aura-amber)]/50"
          >
            <div className="text-lg font-medium">{venue.name}</div>
            <div className="mt-1 text-sm text-[var(--aura-muted)]">{venue.address}</div>
          </Link>
        ))}
        {venues.length === 0 ? (
          <p className="text-sm text-[var(--aura-muted)]">Нет доступа к точкам.</p>
        ) : null}
      </section>
    </div>
  );
}
