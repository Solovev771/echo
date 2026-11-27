"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StashLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stash/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const raw = await res.text();
      let data: { ok?: boolean; error?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as { ok?: boolean; error?: string }) : {};
      } catch {
        setError("Сервер вернул ошибку. Обновите страницу и попробуйте снова.");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Не удалось войти");
        return;
      }
      router.replace("/stash");
      router.refresh();
    } catch {
      setError("Не удалось связаться с сервером. Проверьте интернет и обновите страницу.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80dvh] flex-col justify-center">
      <p className="mb-2 text-center text-[11px] tracking-[0.28em] text-[var(--aura-amber)] uppercase">
        HookahPlace
      </p>
      <h1 className="mb-1 text-center text-3xl font-semibold tracking-[0.2em]">AURA</h1>
      <p className="mb-8 text-center text-sm text-[var(--aura-muted)]">Склад · вход</p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur">
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--aura-muted)]">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 text-base outline-none md:text-sm focus:border-[var(--aura-amber)]"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--aura-muted)]">Пароль</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 text-base outline-none md:text-sm focus:border-[var(--aura-amber)]"
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--aura-glow)] px-3 py-3 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? "Входим…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
