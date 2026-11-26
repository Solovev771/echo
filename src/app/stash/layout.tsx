import type { Metadata } from "next";
import { StashSideNav } from "@/components/stash/stash-side-nav";
import { getSession } from "@/stash/auth";
import { listVenuesForUser } from "@/stash/access";
import { ensureStash } from "@/stash/ensure";

export const instant = false;

export const metadata: Metadata = {
  title: "Аура · Склад",
  description: "Склад табака HookahPlace Aura — две точки, бренды и остатки.",
};

export default async function StashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureStash();
  const user = await getSession();
  const venues = user ? await listVenuesForUser(user) : [];
  const showSideNav = Boolean(user && venues.length > 0);

  return (
    <div className="min-h-dvh bg-[var(--aura-black)] text-[var(--aura-white)] antialiased">
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 100% 0%, rgba(232,106,23,0.22), transparent 55%), radial-gradient(ellipse 60% 40% at 0% 100%, rgba(212,120,42,0.12), transparent 50%)",
        }}
      />
      <div className="relative mx-auto min-h-dvh w-full max-w-lg px-4 pb-10 pt-6 md:max-w-5xl">
        {showSideNav ? (
          <div className="md:grid md:grid-cols-[11rem_minmax(0,1fr)] md:gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
            <aside className="mb-6 hidden md:block">
              <StashSideNav
                venues={venues.map((v) => ({ slug: v.slug, name: v.name }))}
              />
            </aside>
            <div className="min-w-0">{children}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
