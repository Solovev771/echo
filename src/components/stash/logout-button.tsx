"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-[var(--aura-muted)]"
      onClick={async () => {
        await fetch("/api/stash/logout", { method: "POST" });
        router.replace("/stash/login");
        router.refresh();
      }}
    >
      Выйти
    </button>
  );
}
