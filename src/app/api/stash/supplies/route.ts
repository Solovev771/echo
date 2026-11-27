import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, apiVenue, jsonError, readBody } from "@/stash/api";
import { isPackGrams } from "@/stash/packs";
import { MAX_PACKS, MAX_SUPPLY_LINES, postSupply, SupplyError } from "@/stash/supplies";

const packs = z.number().int().min(1).max(MAX_PACKS);
const packGrams = z.number().int().refine(isPackGrams);

const lineSchema = z.union([
  z.object({ flavorId: z.string().min(1), packs }),
  z.object({
    brandId: z.string().min(1),
    lineName: z.string().trim().min(1).max(40),
    newFlavorName: z.string().trim().min(1).max(80),
    packGrams,
    priceKopecks: z.number().int().min(0).max(10_000_000_00),
    packs,
  }),
]);

const schema = z.object({
  venueSlug: z.string().min(1),
  supplier: z.string().trim().max(80).optional(),
  note: z.string().trim().max(300).optional(),
  lines: z.array(lineSchema).min(1).max(MAX_SUPPLY_LINES),
});

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth.ok) return auth.response;
  const body = await readBody(
    request,
    schema,
    `Проверьте строки поставки: от 1 до ${MAX_SUPPLY_LINES} позиций, у каждой линейка, грамовка и число пачек`,
  );
  if (!body.ok) return body.response;

  const venue = await apiVenue(auth.user, body.data.venueSlug);
  if (!venue) return jsonError("Нет доступа", 403);

  try {
    const result = await postSupply({
      venueId: venue.id,
      user: auth.user,
      supplier: body.data.supplier,
      note: body.data.note,
      lines: body.data.lines,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof SupplyError) return jsonError(err.message, err.status);
    throw err;
  }
}
