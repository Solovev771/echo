import type { Metadata, Viewport } from "next";
import { StashShell, type ShellVenue } from "@/components/stash/stash-shell";
import { getSession } from "@/stash/auth";
import { listVenuesForUser } from "@/stash/access";
import { ensureStash } from "@/stash/ensure";
import { loadVenueBrandStock } from "@/stash/stock-summary";

export const instant = false;

export const metadata: Metadata = {
  title: "Аура · Склад",
  description: "Склад табака HookahPlace Aura — две точки, бренды и остатки.",
  appleWebApp: { capable: true, title: "Аура · Склад", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function StashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureStash();
  const user = await getSession();
  const venues = user ? await listVenuesForUser(user) : [];

  const shellVenues: ShellVenue[] = await Promise.all(
    venues.map(async (v) => {
      const { strip } = await loadVenueBrandStock(v.id);
      return {
        slug: v.slug,
        name: v.name,
        address: v.address,
        attentionCount: strip.lowCount + strip.outCount,
      };
    }),
  );

  return (
    <div className="min-h-dvh bg-[var(--aura-black)] text-[var(--aura-white)] antialiased">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 100% 0%, rgba(232,106,23,0.16), transparent 55%), radial-gradient(ellipse 55% 40% at 0% 100%, rgba(212,120,42,0.09), transparent 50%)",
        }}
      />
      <div className="relative">
        {user && shellVenues.length > 0 ? (
          <StashShell venues={shellVenues} user={{ name: user.name, role: user.role }}>
            {children}
          </StashShell>
        ) : (
          <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pt-6 pb-10">{children}</div>
        )}
      </div>
    </div>
  );
}
