import { connection } from "next/server";
import { NextResponse } from "next/server";
import { jsonError } from "@/stash/api";
import { ensureStash } from "@/stash/ensure";
import { runAutonomousMixes } from "@/stash/mix-ai";

/** Monday run. Vercel calls this only when CRON_SECRET is set on the server. */
export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return jsonError("Нет доступа", 401);
  }
  await ensureStash();
  const result = await runAutonomousMixes();
  return NextResponse.json({ ok: true, ...result });
}
