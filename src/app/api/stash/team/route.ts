import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isEnvAdmin } from "@/stash/admins";
import { apiUser, jsonError, readBody } from "@/stash/api";
import { db } from "@/stash/db";
import { id } from "@/stash/ids";
import { memberships, users } from "@/stash/schema";

const nameSchema = z.string().trim().min(1).max(60);
const passwordSchema = z.string().min(8).max(100);
const venueIdsSchema = z.array(z.string().min(1)).max(20);

const createSchema = z.object({
  name: nameSchema,
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  venueIds: venueIdsSchema,
});

const updateSchema = z.object({
  userId: z.string().min(1),
  name: nameSchema.optional(),
  password: passwordSchema.optional(),
  venueIds: venueIdsSchema.optional(),
});

const deleteSchema = z.object({ userId: z.string().min(1) });

async function setVenues(userId: string, venueIds: string[]) {
  const known = new Set((await db().query.venues.findMany()).map((v) => v.id));
  const wanted = [...new Set(venueIds)].filter((v) => known.has(v));
  await db().delete(memberships).where(eq(memberships.userId, userId));
  if (wanted.length > 0) {
    await db()
      .insert(memberships)
      .values(wanted.map((venueId) => ({ id: id("mem"), userId, venueId })));
  }
}

export async function POST(request: Request) {
  const auth = await apiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await readBody(
    request,
    createSchema,
    "Проверьте имя, email и пароль (минимум 8 символов)",
  );
  if (!body.ok) return body.response;
  const { name, email, password, venueIds } = body.data;

  const existing = await db().query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return jsonError("Сотрудник с таким email уже есть", 409);

  const userId = id("usr");
  await db()
    .insert(users)
    .values({
      id: userId,
      email,
      name,
      passwordHash: await hash(password, 10),
      role: "staff",
      createdAt: new Date(),
    });
  await setVenues(userId, venueIds);

  return NextResponse.json({ ok: true, id: userId });
}

export async function PATCH(request: Request) {
  const auth = await apiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await readBody(request, updateSchema, "Проверьте данные (пароль — минимум 8 символов)");
  if (!body.ok) return body.response;
  const { userId, name, password, venueIds } = body.data;

  const target = await db().query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) return jsonError("Сотрудник не найден", 404);

  if (password !== undefined && isEnvAdmin(target.email)) {
    return jsonError("Пароль этого администратора задаётся в настройках Vercel", 409);
  }

  const patch: Partial<typeof users.$inferInsert> = {};
  if (name !== undefined) patch.name = name;
  if (password !== undefined) patch.passwordHash = await hash(password, 10);
  if (Object.keys(patch).length > 0) {
    await db().update(users).set(patch).where(eq(users.id, userId));
  }
  if (venueIds !== undefined && target.role !== "admin") {
    await setVenues(userId, venueIds);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await apiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await readBody(request, deleteSchema);
  if (!body.ok) return body.response;

  const target = await db().query.users.findFirst({ where: eq(users.id, body.data.userId) });
  if (!target) return jsonError("Сотрудник не найден", 404);
  if (target.id === auth.user.id) return jsonError("Нельзя удалить самого себя", 409);
  if (isEnvAdmin(target.email)) {
    return jsonError("Основных администраторов удалить нельзя", 409);
  }

  await db().delete(memberships).where(eq(memberships.userId, target.id));
  await db().delete(users).where(eq(users.id, target.id));
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const auth = await apiUser("admin");
  if (!auth.ok) return auth.response;
  const [userRows, memberRows, venueRows] = await Promise.all([
    db().query.users.findMany(),
    db().query.memberships.findMany(),
    db().query.venues.findMany(),
  ]);
  const venueSlug = new Map(venueRows.map((v) => [v.id, v.slug]));
  return NextResponse.json({
    users: userRows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      venues: memberRows
        .filter((m) => m.userId === u.id)
        .map((m) => venueSlug.get(m.venueId))
        .filter(Boolean),
    })),
  });
}
