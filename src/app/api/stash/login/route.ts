import { NextResponse } from "next/server";
import { z } from "zod";
import {
  SESSION_COOKIE,
  createSessionToken,
  login,
  sessionCookieOptions,
} from "@/stash/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function missingEnv(): string[] {
  const keys = [
    "STASH_SESSION_SECRET",
    "TURSO_DATABASE_URL",
    "TURSO_AUTH_TOKEN",
  ] as const;
  return keys.filter((key) => !process.env[key]?.trim());
}

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Проверьте email и пароль" }, { status: 400 });
    }

    const absent = missingEnv();
    if (absent.includes("STASH_SESSION_SECRET")) {
      return NextResponse.json(
        {
          error:
            "Пустой STASH_SESSION_SECRET в Vercel. Откройте переменную, задайте длинную строку, Save, затем Redeploy.",
        },
        { status: 500 },
      );
    }

    const user = await login(parsed.data.email, parsed.data.password);
    if (!user) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    const token = await createSessionToken(user);
    const res = NextResponse.json({
      ok: true,
      user: { name: user.name, role: user.role },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка сервера";
    const absent = missingEnv();
    if (absent.length > 0) {
      return NextResponse.json(
        {
          error: `Не заданы переменные: ${absent.join(", ")}. Проверьте Environment Variables и сделайте Redeploy.`,
        },
        { status: 500 },
      );
    }
    if (message.includes("URL_INVALID") || /turso|libsql/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Не удалось подключиться к Turso. Проверьте TURSO_DATABASE_URL и TURSO_AUTH_TOKEN, затем Redeploy.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Ошибка входа, попробуйте ещё раз" },
      { status: 500 },
    );
  }
}
