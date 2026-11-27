import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessVenue } from "@/stash/access";
import { apiUser, apiVenue, jsonError, readBody } from "@/stash/api";
import { db } from "@/stash/db";
import { id } from "@/stash/ids";
import { recordMovement } from "@/stash/movements";
import { brands, flavors, stock } from "@/stash/schema";

const nameSchema = z.string().trim().min(1).max(80);

const createSchema = z.object({
  venueSlug: z.string().min(1),
  brandId: z.string().min(1),
  name: nameSchema,
});

const renameSchema = z.object({
  venueSlug: z.string().min(1),
  flavorId: z.string().min(1),
  name: nameSchema,
});

const deleteSchema = z.object({
  venueSlug: z.string().min(1),
  flavorId: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth.ok) return auth.response;
  const body = await readBody(request, createSchema, "Проверьте название");
  if (!body.ok) return body.response;

  const venue = await apiVenue(auth.user, body.data.venueSlug);
  if (!venue) return jsonError("Нет доступа", 403);

  const brand = await db().query.brands.findFirst({ where: eq(brands.id, body.data.brandId) });
  if (!brand) return jsonError("Бренд не найден", 404);

  const name = body.data.name;
  const existing = await db().query.flavors.findFirst({
    where: and(eq(flavors.brandId, brand.id), eq(flavors.name, name)),
  });
  if (existing) return jsonError("Такой аромат уже есть", 409);

  const flavorId = id("fl");
  await db().insert(flavors).values({ id: flavorId, brandId: brand.id, name });
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
  if (name === flavor.name) return NextResponse.json({ ok: true });
  const clash = await db().query.flavors.findFirst({
    where: and(eq(flavors.brandId, flavor.brandId), eq(flavors.name, name), ne(flavors.id, flavor.id)),
  });
  if (clash) return jsonError("Такой аромат уже есть", 409);

  await db().update(flavors).set({ name }).where(eq(flavors.id, flavor.id));
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
