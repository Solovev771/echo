import { Suspense } from "react";
import { after } from "next/server";
import { StashBoot } from "@/components/stash/stash-boot";
import { StashShell, type ShellVenue } from "@/components/stash/stash-shell";
import { listVenuesForUser, requireUser } from "@/stash/access";
import { ensureStash } from "@/stash/ensure";
import { runAutonomousMixes } from "@/stash/mix-ai";
import { attentionCounts } from "@/stash/stock-summary";

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<StashBoot />}>
      <WarehouseFrame>{children}</WarehouseFrame>
    </Suspense>
  );
}

async function WarehouseFrame({ children }: { children: React.ReactNode }) {
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

  if (!user || shellVenues.length === 0) {
    return <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pt-6 pb-10">{children}</div>;
  }

  return (
    <StashShell venues={shellVenues} user={{ name: user.name, role: user.role }}>
      {children}
    </StashShell>
  );
}
