/** Admins configured via env vars; ensureStash re-creates them, so they cannot be deleted in the UI. */
export function envAdminEmails(): string[] {
  return [process.env.STASH_ADMIN_EMAIL, process.env.STASH_ADMIN2_EMAIL]
    .map((e) => e?.trim().toLowerCase())
    .filter((e): e is string => Boolean(e));
}

export function isEnvAdmin(email: string) {
  return envAdminEmails().includes(email.trim().toLowerCase());
}
