import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, apiVenue, jsonError, readBody } from "@/stash/api";
import { db } from "@/stash/db";
import { applyStockChange } from "@/stash/movements";
import { flavors } from "@/stash/schema";

const MAX_GRAMS = 100_000;

const schema = z
  .object({
    venueSlug: z.string().min(1),
    flavorId: z.string().min(1),
    deltaGrams: z.number().int().min(-MAX_GRAMS).max(MAX_GRAMS).optional(),
    setGrams: z.number().int().min(0).max(MAX_GRAMS).optional(),
    note: z.string().trim().max(200).optional(),
  })
  .refine((v) => (v.deltaGrams === undefined) !== (v.setGrams === undefined))
  .refine((v) => v.deltaGrams !== 0);

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth.ok) return auth.response;
  const body = await readBody(request, schema, "Укажите количество граммов");
  if (!body.ok) return body.response;
  const { venueSlug, flavorId, deltaGrams, setGrams, note } = body.data;

  const venue = await apiVenue(auth.user, venueSlug);
  if (!venue) return jsonError("Нет доступа", 403);

  const flavor = await db().query.flavors.findFirst({ where: eq(flavors.id, flavorId) });
  if (!flavor) return jsonError("Аромат не найден", 404);

  const result = await applyStockChange({
    venueId: venue.id,
    flavor,
    user: auth.user,
    deltaGrams,
    setGrams,
    note,
  });
  return NextResponse.json({ ok: true, grams: result.after });
}
