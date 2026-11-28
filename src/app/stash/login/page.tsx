"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { AuraPulse } from "@/components/stash/aura-pulse";

const fieldStyle: CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(0,0,0,.5)",
  color: "#f5f5f5",
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 12,
  padding: "12px",
  fontSize: 16,
};

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
    <div
      style={{ position: "relative" }}
    >
    {loading ? <AuraPulse label="Входим…" /> : null}
    <div
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-8"
      style={{ maxWidth: 512, margin: "0 auto", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 16px", boxSizing: "border-box" }}
    >
      <p
        className="mb-2 text-center text-[11px] tracking-[0.28em] text-[var(--aura-amber)] uppercase"
        style={{ margin: "0 0 8px", textAlign: "center", letterSpacing: "0.28em", textTransform: "uppercase", color: "#d4782a", fontSize: 11 }}
      >
        HookahPlace
      </p>
      <h1
        className="mb-1 text-center text-3xl font-semibold tracking-[0.2em]"
        style={{ margin: "0 0 4px", textAlign: "center", fontSize: 30, fontWeight: 650, letterSpacing: "0.2em" }}
      >
        AURA
      </h1>
      <p
        className="mb-8 text-center text-sm text-[var(--aura-muted)]"
        style={{ margin: "0 0 32px", textAlign: "center", color: "#a8a8a8", fontSize: 14 }}
      >
        Склад · вход
      </p>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-white/10 bg-[#121110] p-5"
        style={{ display: "grid", gap: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "#121110", padding: 20 }}
      >
        <label className="block space-y-1.5" style={{ display: "grid", gap: 6 }}>
          <span className="text-xs text-[var(--aura-muted)]" style={{ color: "#a8a8a8", fontSize: 12 }}>
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 text-base outline-none md:text-sm focus:border-[var(--aura-amber)]"
            style={fieldStyle}
          />
        </label>
        <label className="block space-y-1.5" style={{ display: "grid", gap: 6 }}>
          <span className="text-xs text-[var(--aura-muted)]" style={{ color: "#a8a8a8", fontSize: 12 }}>
            Пароль
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 text-base outline-none md:text-sm focus:border-[var(--aura-amber)]"
            style={fieldStyle}
          />
        </label>
        {error ? <p className="text-sm text-red-400" style={{ margin: 0, color: "#f87171", fontSize: 14 }}>{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--aura-glow)] px-3 py-3 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
          style={{
            width: "100%",
            border: 0,
            borderRadius: 12,
            background: "#e86a17",
            color: "#111",
            padding: "12px",
            fontSize: 14,
            fontWeight: 650,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Входим…" : "Войти"}
        </button>
      </form>
    </div>
    </div>
  );
}
