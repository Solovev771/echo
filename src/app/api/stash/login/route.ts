import { NextResponse } from "next/server";
import { z } from "zod";
import { login } from "@/stash/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
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
}
