import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { after } from "next/server";
import { StashShell, type ShellVenue } from "@/components/stash/stash-shell";
import { listVenuesForUser, requireUser } from "@/stash/access";
import { ensureStash } from "@/stash/ensure";
import { runAutonomousMixes } from "@/stash/mix-ai";
import { attentionCounts } from "@/stash/stock-summary";

export const metadata: Metadata = {
  title: "Аура · Склад",
  description: "Склад табака HookahPlace Aura — две точки, бренды и остатки.",
  manifest: "/stash/manifest.webmanifest",
  icons: {
    icon: [{ url: "/stash/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/stash/icons/apple-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Аура · Склад", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function StashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<StashBoot />}>
      <StashFrame>{children}</StashFrame>
    </Suspense>
  );
}

function StashBoot() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0b0b0b] text-[#f5f5f5]">
      <p className="text-sm font-semibold tracking-[0.28em]">AURA</p>
    </div>
  );
}

async function StashFrame({ children }: { children: React.ReactNode }) {
  await ensureStash();
  const user = await requireUser();
  const venues = user ? await listVenuesForUser(user) : [];
  const counts = await attentionCounts(venues.map((v) => v.id));
  if (venues.some((v) => v.mixAuto)) after(() => runAutonomousMixes());

  const shellVenues: ShellVenue[] = venues.map((v) => ({
    slug: v.slug,
    name: v.name,
    address: v.address,
    attentionCount: counts.get(v.id) ?? 0,
  }));

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
