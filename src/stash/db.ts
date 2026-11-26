import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

function databaseUrl() {
  const url = (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "").trim();
  if (url) return url;
  if (process.env.VERCEL) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }
  return "file:data/stash.db";
}

const globalForDb = globalThis as unknown as {
  stashClient?: ReturnType<typeof createClient>;
  stashClientUrl?: string;
};

function client() {
  const url = databaseUrl();
  if (!globalForDb.stashClient || globalForDb.stashClientUrl !== url) {
    globalForDb.stashClient = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
    });
    globalForDb.stashClientUrl = url;
  }
  return globalForDb.stashClient;
}

export function db() {
  return drizzle(client(), { schema });
}

export function raw() {
  return client();
}
