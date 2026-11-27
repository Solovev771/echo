import { and, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/stash/api";
import { db } from "@/stash/db";
import { id } from "@/stash/ids";
import { brands, flavors } from "@/stash/schema";

const nameSchema = z.string().trim().min(1).max(60);

const createSchema = z.object({ name: nameSchema });
const renameSchema = z.object({ brandId: z.string().min(1), name: nameSchema });
const deleteSchema = z.object({ brandId: z.string().min(1) });

async function nameTaken(name: string, exceptId?: string) {
  const lower = name.toLowerCase();
  const row = await db().query.brands.findFirst({
    where: exceptId
      ? and(sql`lower(${brands.name}) = ${lower}`, ne(brands.id, exceptId))
      : sql`lower(${brands.name}) = ${lower}`,
  });
  return Boolean(row);
}

export async function POST(request: Request) {
  const auth = await apiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await readBody(request, createSchema, "Проверьте название бренда");
  if (!body.ok) return body.response;

  if (await nameTaken(body.data.name)) return jsonError("Такой бренд уже есть", 409);

  const [{ maxOrder }] = await db()
    .select({ maxOrder: sql<number>`coalesce(max(${brands.sortOrder}), -1)` })
    .from(brands);
  const brandId = id("br");
  await db()
    .insert(brands)
    .values({ id: brandId, name: body.data.name, sortOrder: Number(maxOrder) + 1 });

  return NextResponse.json({ ok: true, id: brandId });
}

export async function PATCH(request: Request) {
  const auth = await apiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await readBody(request, renameSchema, "Проверьте название бренда");
  if (!body.ok) return body.response;

  const brand = await db().query.brands.findFirst({ where: eq(brands.id, body.data.brandId) });
  if (!brand) return jsonError("Бренд не найден", 404);
  if (await nameTaken(body.data.name, brand.id)) return jsonError("Такой бренд уже есть", 409);

  await db().update(brands).set({ name: body.data.name }).where(eq(brands.id, brand.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await apiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await readBody(request, deleteSchema);
  if (!body.ok) return body.response;

  const brand = await db().query.brands.findFirst({ where: eq(brands.id, body.data.brandId) });
  if (!brand) return jsonError("Бренд не найден", 404);

  const flavor = await db().query.flavors.findFirst({ where: eq(flavors.brandId, brand.id) });
  if (flavor) {
    return jsonError("В бренде есть ароматы — сначала удалите их, потом сам бренд", 409);
  }

  await db().delete(brands).where(eq(brands.id, brand.id));
  return NextResponse.json({ ok: true });
}
