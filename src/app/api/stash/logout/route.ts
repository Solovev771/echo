import { NextResponse } from "next/server";
import { connection } from "next/server";
import { STASH_COOKIE } from "@/stash/auth";

export async function POST() {
  await connection();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STASH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
