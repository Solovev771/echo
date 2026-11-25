import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

function databaseUrl() {
  return process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:data/stash.db";
}

const globalForDb = globalThis as unknown as {
  stashClient?: ReturnType<typeof createClient>;
};

function client() {
  if (!globalForDb.stashClient) {
    globalForDb.stashClient = createClient({
      url: databaseUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return globalForDb.stashClient;
}

export function db() {
  return drizzle(client(), { schema });
}

export function raw() {
  return client();
}
