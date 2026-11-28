import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessVenue } from "@/stash/access";
import { apiUser, apiVenue, jsonError, readBody } from "@/stash/api";
import { db } from "@/stash/db";
import { id } from "@/stash/ids";
import { recordMovement } from "@/stash/movements";
import { isPackGrams, PACK_GRAMS_ERROR } from "@/stash/packs";
import { brands, flavors, lines, stock } from "@/stash/schema";

const nameSchema = z.string().trim().min(1).max(80);
const lineSchema = z.string().trim().min(1).max(40);
const packSchema = z
  .number()
  .int()
  .refine(isPackGrams, PACK_GRAMS_ERROR);
const priceSchema = z.number().int().min(0).max(10_000_000_00);

const createSchema = z.object({
  venueSlug: z.string().min(1),
  brandId: z.string().min(1),
  name: nameSchema,
  lineName: lineSchema,
  packGrams: packSchema,
  priceKopecks: priceSchema,
});

const renameSchema = z.object({
  venueSlug: z.string().min(1),
  flavorId: z.string().min(1),
  name: nameSchema,
  lineName: lineSchema,
  packGrams: packSchema,
  priceKopecks: priceSchema,
});

const deleteSchema = z.object({
  venueSlug: z.string().min(1),
  flavorId: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth.ok) return auth.response;
  const body = await readBody(
    request,
    createSchema,
    "Проверьте линейку, название, грамовку (20–250) и цену",
  );
  if (!body.ok) return body.response;

  const venue = await apiVenue(auth.user, body.data.venueSlug);
  if (!venue) return jsonError("Нет доступа", 403);

  const brand = await db().query.brands.findFirst({ where: eq(brands.id, body.data.brandId) });
  if (!brand) return jsonError("Бренд не найден", 404);

  const name = body.data.name;
  const line = await ensureLine(brand.id, body.data.lineName);
  const existing = await db().query.flavors.findFirst({
    where: and(
      eq(flavors.brandId, brand.id),
      eq(flavors.lineId, line.id),
      eq(flavors.name, name),
      eq(flavors.packGrams, body.data.packGrams),
    ),
  });
  if (existing) return jsonError("Такая позиция уже есть: та же линейка, аромат и грамовка", 409);

  const flavorId = id("fl");
  await db().insert(flavors).values({
    id: flavorId,
    brandId: brand.id,
    lineId: line.id,
    name,
    packGrams: body.data.packGrams,
    priceKopecks: body.data.priceKopecks,
  });
  await db().insert(stock).values({
    id: id("st"),
    venueId: venue.id,
    flavorId,
    grams: 0,
    updatedAt: new Date(),
  });
  await recordMovement({
    venueId: venue.id,
    flavor: { id: flavorId, name, brandId: brand.id },
    brandName: brand.name,
    user: auth.user,
    kind: "create",
  });

  return NextResponse.json({ ok: true, id: flavorId });
}

export async function PATCH(request: Request) {
  const auth = await apiUser();
  if (!auth.ok) return auth.response;
  const body = await readBody(request, renameSchema, "Проверьте название");
  if (!body.ok) return body.response;

  const venue = await apiVenue(auth.user, body.data.venueSlug);
  if (!venue) return jsonError("Нет доступа", 403);

  const flavor = await db().query.flavors.findFirst({ where: eq(flavors.id, body.data.flavorId) });
  if (!flavor) return jsonError("Аромат не найден", 404);

  const name = body.data.name;
  const line = await ensureLine(flavor.brandId, body.data.lineName);
  const unchanged =
    name === flavor.name &&
    line.id === flavor.lineId &&
    body.data.packGrams === flavor.packGrams &&
    body.data.priceKopecks === flavor.priceKopecks;
  if (unchanged) return NextResponse.json({ ok: true });
  const clash = await db().query.flavors.findFirst({
    where: and(
      eq(flavors.brandId, flavor.brandId),
      eq(flavors.lineId, line.id),
      eq(flavors.name, name),
      eq(flavors.packGrams, body.data.packGrams),
      ne(flavors.id, flavor.id),
    ),
  });
  if (clash) return jsonError("Такая позиция уже есть: та же линейка, аромат и грамовка", 409);

  await db()
    .update(flavors)
    .set({
      name,
      lineId: line.id,
      packGrams: body.data.packGrams,
      priceKopecks: body.data.priceKopecks,
    })
    .where(eq(flavors.id, flavor.id));
  const row = await db().query.stock.findFirst({
    where: and(eq(stock.venueId, venue.id), eq(stock.flavorId, flavor.id)),
  });
  await recordMovement({
    venueId: venue.id,
    flavor: { ...flavor, name },
    user: auth.user,
    kind: "rename",
    gramsAfter: row?.grams ?? 0,
    note: `Было: ${flavor.name}`,
  });

  return NextResponse.json({ ok: true });
}

async function ensureLine(brandId: string, lineName: string) {
  const name = lineName.trim().replace(/\s+/g, " ");
  const existing = await db().query.lines.findFirst({
    where: and(eq(lines.brandId, brandId), eq(lines.name, name)),
  });
  if (existing) return existing;
  await db()
    .insert(lines)
    .values({ id: id("ln"), brandId, name, sortOrder: 0 })
    .onConflictDoNothing();
  const row = await db().query.lines.findFirst({
    where: and(eq(lines.brandId, brandId), eq(lines.name, name)),
  });
  if (!row) throw new Error("Не удалось сохранить линейку");
  return row;
}

export async function DELETE(request: Request) {
  const auth = await apiUser();
  if (!auth.ok) return auth.response;
  const body = await readBody(request, deleteSchema);
  if (!body.ok) return body.response;

  const venue = await apiVenue(auth.user, body.data.venueSlug);
  if (!venue) return jsonError("Нет доступа", 403);

  const flavor = await db().query.flavors.findFirst({ where: eq(flavors.id, body.data.flavorId) });
  if (!flavor) return jsonError("Аромат не найден", 404);

  const rows = await db().query.stock.findMany({ where: eq(stock.flavorId, flavor.id) });
  for (const row of rows) {
    if (row.grams > 0 && !(await canAccessVenue(auth.user, row.venueId))) {
      return jsonError(
        "На другой точке этот аромат ещё есть в наличии — удалить может только администратор",
        403,
      );
    }
  }

  await db().delete(stock).where(eq(stock.flavorId, flavor.id));
  await db().delete(flavors).where(eq(flavors.id, flavor.id));

  const venueIds = new Set([venue.id, ...rows.map((r) => r.venueId)]);
  for (const venueId of venueIds) {
    const grams = rows.find((r) => r.venueId === venueId)?.grams ?? 0;
    await recordMovement({
      venueId,
      flavor,
      user: auth.user,
      kind: "delete",
      delta: -grams,
      gramsAfter: 0,
    });
  }

  return NextResponse.json({ ok: true });
}
