import { desc, eq } from "drizzle-orm";
import { MixStudio } from "@/components/stash/mix-studio";
import { requireVenueAccess } from "@/stash/access";
import { db } from "@/stash/db";
import { maybeAutonomousMix, parseNoteNames } from "@/stash/mix-ai";
import { mixes } from "@/stash/schema";

export default async function MixesPage({
  params,
}: {
  params: Promise<{ venue: string }>;
}) {
  const { venue: slug } = await params;
  const { user, venue } = await requireVenueAccess(slug);
  if (venue.mixAuto) await maybeAutonomousMix(venue);

  const rows = await db().query.mixes.findMany({
    where: eq(mixes.venueId, venue.id),
    orderBy: [desc(mixes.createdAt)],
  });

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.28em] text-[#f0a65a] uppercase">{venue.name}</p>
        <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Миксы</h1>
        <p className="mt-1 text-sm text-[var(--aura-muted)]">
          Чаша из того, что сейчас лежит на точке. Голос как у Special. Гости увидят микс только после «На меню».
        </p>
      </header>
      <MixStudio
        venueSlug={venue.slug}
        admin={user.role === "admin"}
        modelReady={Boolean(process.env.AURA_AI_API_KEY?.trim())}
        mixAuto={venue.mixAuto === 1}
        mixPublish={venue.mixPublish === 1}
        mixes={rows.map((row) => ({
          id: row.id,
          name: row.name,
          zone: row.zone,
          character: row.character,
          profile: row.profile,
          story: row.story,
          notes: parseNoteNames(row.notes),
          status: row.status,
          source: row.source,
        }))}
      />
    </div>
  );
}
