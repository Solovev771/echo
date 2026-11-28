import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/stash/api";
import { db } from "@/stash/db";
import { readSupplyImages } from "@/stash/invoice-ocr";

export const maxDuration = 60;

const schema = z.object({
  images: z.array(z.string().min(32).max(1_200_000)).min(1).max(3),
});

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth.ok) return auth.response;
  const body = await readBody(request, schema, "Не получилось прочитать файл. Пришлите JPG или PDF до трёх страниц.");
  if (!body.ok) return body.response;

  const brands = await db().query.brands.findMany();
  const known = brands.map((brand) => ({ id: brand.id, name: brand.name }));
  const sheet = await readSupplyImages(body.data.images, known);
  if (sheet.rows.length === 0) {
    return jsonError("На бланке не нашлось позиций. Снимите таблицу ближе или впишите строки вручную.", 422);
  }
  return NextResponse.json({ ok: true, ...sheet });
}
