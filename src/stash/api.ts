import { NextResponse } from "next/server";
import type { z } from "zod";
import { canAccessVenue, getVenueBySlug, requireUser } from "./access";
import type { SessionUser } from "./auth";
import { ensureStash } from "./ensure";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

type Fail = { ok: false; response: NextResponse };

export async function readBody<T extends z.ZodType>(
  request: Request,
  schema: T,
  message = "Некорректные данные",
): Promise<{ ok: true; data: z.infer<T> } | Fail> {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { ok: false, response: jsonError(message, 400) };
  return { ok: true, data: parsed.data };
}

export async function apiUser(
  role: "any" | "admin" = "any",
): Promise<{ ok: true; user: SessionUser } | Fail> {
  await ensureStash();
  const user = await requireUser();
  if (!user) return { ok: false, response: jsonError("Нужен вход", 401) };
  if (role === "admin" && user.role !== "admin") {
    return { ok: false, response: jsonError("Только для администратора", 403) };
  }
  return { ok: true, user };
}

export async function apiVenue(user: SessionUser, slug: string) {
  const venue = await getVenueBySlug(slug);
  if (!venue || !(await canAccessVenue(user, venue.id))) return null;
  return venue;
}
