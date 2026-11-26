import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import {
  login,
  SESSION_COOKIE_OPTIONS,
  STASH_COOKIE,
} from "@/stash/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function clientError(err: unknown) {
  const message = err instanceof Error ? err.message : "Ошибка сервера";
  if (message.includes("STASH_SESSION_SECRET")) {
    return {
      error: "Сервер не настроен: не задан STASH_SESSION_SECRET в Vercel",
      status: 500,
    };
  }
  if (
    message.includes("TURSO_DATABASE_URL") ||
    message.includes("TURSO_AUTH_TOKEN") ||
    message.includes("URL_INVALID") ||
    message.includes("LIBSQL") ||
    /turso|libsql/i.test(message)
  ) {
    return {
      error: "Сервер не настроен: проверьте TURSO_DATABASE_URL и TURSO_AUTH_TOKEN в Vercel",
      status: 500,
    };
  }
  return { error: "Ошибка входа, попробуйте ещё раз", status: 500 };
}

export async function POST(request: Request) {
  try {
    await connection();
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Проверьте email и пароль" }, { status: 400 });
    }
    const result = await login(parsed.data.email, parsed.data.password);
    if (!result) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    const response = NextResponse.json({
      ok: true,
      user: { name: result.user.name, role: result.user.role },
    });
    response.cookies.set(STASH_COOKIE, result.token, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (err) {
    console.error("[stash/login]", err instanceof Error ? err.message : err);
    const { error, status } = clientError(err);
    return NextResponse.json({ error }, { status });
  }
}
