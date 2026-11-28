import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, apiVenue, jsonError, readBody } from "@/stash/api";
import { db } from "@/stash/db";
import { composeForVenue, maybeAutonomousMix, saveMix } from "@/stash/mix-ai";
import { mixes, venues } from "@/stash/schema";

const schema = z.object({
  venueSlug: z.string().min(1),
  action: z.enum(["generate", "publish", "hide", "remove", "settings"]),
  mixId: z.string().optional(),
  mixAuto: z.boolean().optional(),
  mixPublish: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth.ok) return auth.response;
  const body = await readBody(request, schema, "Не получилось сохранить микс");
  if (!body.ok) return body.response;

  const venue = await apiVenue(auth.user, body.data.venueSlug);
  if (!venue) return jsonError("Нет доступа", 403);

  if (body.data.action === "settings") {
    if (auth.user.role !== "admin") return jsonError("Только для администратора", 403);
    const mixAuto = body.data.mixAuto ? 1 : 0;
    const mixPublish = mixAuto && body.data.mixPublish ? 1 : 0;
    await db().update(venues).set({ mixAuto, mixPublish }).where(eq(venues.id, venue.id));
    const created = mixAuto ? await maybeAutonomousMix({ id: venue.id, mixAuto, mixPublish }) : null;
    return NextResponse.json({ ok: true, mixAuto, mixPublish, created: Boolean(created) });
  }

  if (body.data.action === "generate") {
    try {
      const mix = await composeForVenue(venue.id);
      const row = await saveMix(venue.id, mix, "draft");
      return NextResponse.json({ ok: true, id: row.id, source: row.source });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не получилось собрать микс";
      return jsonError(message, 400);
    }
  }

  if (auth.user.role !== "admin") return jsonError("Только для администратора", 403);
  if (!body.data.mixId) return jsonError("Не указан микс", 400);
  const mix = await db().query.mixes.findFirst({
    where: eq(mixes.id, body.data.mixId),
  });
  if (!mix || mix.venueId !== venue.id) return jsonError("Микс не найден", 404);

  if (body.data.action === "remove") {
    if (mix.status !== "draft") return jsonError("Сначала снимите микс с меню", 400);
    await db().delete(mixes).where(eq(mixes.id, mix.id));
    return NextResponse.json({ ok: true });
  }

  await db()
    .update(mixes)
    .set({ status: body.data.action === "publish" ? "menu" : "draft" })
    .where(eq(mixes.id, mix.id));
  return NextResponse.json({ ok: true });
}
