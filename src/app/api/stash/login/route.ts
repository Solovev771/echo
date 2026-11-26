import { NextResponse } from "next/server";
import { z } from "zod";
import { login } from "@/stash/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Проверьте email и пароль" }, { status: 400 });
    }
    const user = await login(parsed.data.email, parsed.data.password);
    if (!user) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, user: { name: user.name, role: user.role } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка сервера";
    const isConfig =
      message.includes("STASH_SESSION_SECRET") ||
      message.includes("TURSO") ||
      message.includes("URL_INVALID");
    return NextResponse.json(
      {
        error: isConfig
          ? "Сервер не настроен: проверьте переменные окружения в Vercel"
          : "Ошибка входа, попробуйте ещё раз",
      },
      { status: 500 },
    );
  }
}
