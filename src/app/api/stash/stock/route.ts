import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessVenue, getVenueBySlug, requireUser } from "@/stash/access";
import { db } from "@/stash/db";
import { ensureStash } from "@/stash/ensure";
import { id } from "@/stash/ids";
import { flavors, stock } from "@/stash/schema";

const schema = z.object({
  venueSlug: z.string().min(1),
  flavorId: z.string().min(1),
  deltaGrams: z.number().int(),
});

export async function POST(request: Request) {
  await ensureStash();
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Нужен вход" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const venue = await getVenueBySlug(parsed.data.venueSlug);
  if (!venue || !(await canAccessVenue(user, venue.id))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const flavor = await db().query.flavors.findFirst({
    where: eq(flavors.id, parsed.data.flavorId),
  });
  if (!flavor) return NextResponse.json({ error: "Аромат не найден" }, { status: 404 });

  let row = await db().query.stock.findFirst({
    where: and(
      eq(stock.venueId, venue.id),
      eq(stock.flavorId, parsed.data.flavorId),
    ),
  });

  const nextGrams = Math.max(0, (row?.grams ?? 0) + parsed.data.deltaGrams);
  const now = new Date();

  if (!row) {
    await db().insert(stock).values({
      id: id("st"),
      venueId: venue.id,
      flavorId: parsed.data.flavorId,
      grams: nextGrams,
      updatedAt: now,
    });
  } else {
    await db()
      .update(stock)
      .set({ grams: nextGrams, updatedAt: now })
      .where(eq(stock.id, row.id));
  }

  return NextResponse.json({ ok: true, grams: nextGrams });
}
