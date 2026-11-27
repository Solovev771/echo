import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, apiVenue, jsonError, readBody } from "@/stash/api";
import { db } from "@/stash/db";
import { isLowStockGrams, LOW_STOCK_OPTIONS } from "@/stash/stock-level";
import { venues } from "@/stash/schema";

const schema = z.object({
  venueSlug: z.string().min(1),
  lowGrams: z.number().int().refine(isLowStockGrams),
});

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth.ok) return auth.response;
  const body = await readBody(
    request,
    schema,
    `Порог может быть ${LOW_STOCK_OPTIONS.join(", ")} г`,
  );
  if (!body.ok) return body.response;

  const venue = await apiVenue(auth.user, body.data.venueSlug);
  if (!venue) return jsonError("Нет доступа", 403);

  await db().update(venues).set({ lowGrams: body.data.lowGrams }).where(eq(venues.id, venue.id));
  return NextResponse.json({ ok: true, lowGrams: body.data.lowGrams });
}
