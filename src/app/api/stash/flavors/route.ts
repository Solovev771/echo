import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessVenue, getVenueBySlug, requireUser } from "@/stash/access";
import { db } from "@/stash/db";
import { ensureStash } from "@/stash/ensure";
import { id } from "@/stash/ids";
import { brands, flavors, stock } from "@/stash/schema";

const schema = z.object({
  venueSlug: z.string().min(1),
  brandId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  await ensureStash();
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Нужен вход" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте название" }, { status: 400 });
  }

  const venue = await getVenueBySlug(parsed.data.venueSlug);
  if (!venue || !(await canAccessVenue(user, venue.id))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const brand = await db().query.brands.findFirst({
    where: eq(brands.id, parsed.data.brandId),
  });
  if (!brand) return NextResponse.json({ error: "Бренд не найден" }, { status: 404 });

  const name = parsed.data.name.trim();
  const existing = await db().query.flavors.findFirst({
    where: and(eq(flavors.brandId, brand.id), eq(flavors.name, name)),
  });
  if (existing) {
    return NextResponse.json({ error: "Такой аромат уже есть" }, { status: 409 });
  }

  const flavorId = id("fl");
  await db().insert(flavors).values({
    id: flavorId,
    brandId: brand.id,
    name,
  });
  await db().insert(stock).values({
    id: id("st"),
    venueId: venue.id,
    flavorId,
    grams: 0,
    updatedAt: new Date(),
  });

  return NextResponse.json({ ok: true, id: flavorId });
}
