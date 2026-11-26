import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { db } from "./db";
import { ensureStash } from "./ensure";
import { users } from "./schema";

export const STASH_COOKIE = "aura_stash_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff";
};

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

function secret() {
  const value = process.env.STASH_SESSION_SECRET?.trim();
  if (!value) {
    throw new Error("STASH_SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(value);
}

export async function signSessionToken(user: SessionUser) {
  await connection();
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function createSession(user: SessionUser) {
  const token = await signSessionToken(user);
  const jar = await cookies();
  jar.set(STASH_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

export async function destroySession() {
  await connection();
  const jar = await cookies();
  jar.delete(STASH_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  await connection();
  const jar = await cookies();
  const token = jar.get(STASH_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      (payload.role !== "admin" && payload.role !== "staff")
    ) {
      return null;
    }
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function login(email: string, password: string) {
  await connection();
  await ensureStash();
  const user = await db().query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
  });
  if (!user) return null;
  const ok = await compare(password, user.passwordHash);
  if (!ok) return null;
  const session: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "admin" | "staff",
  };
  const token = await signSessionToken(session);
  return { user: session, token };
}
