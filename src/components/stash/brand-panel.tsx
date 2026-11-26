"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LOW_STOCK_GRAMS } from "@/stash/stock-summary";

type FlavorRow = {
  id: string;
  name: string;
  grams: number;
};

export function BrandPanel({
  venueSlug,
  brandId,
  brandName,
  initialFlavors,
}: {
  venueSlug: string;
  brandId: string;
  brandName: string;
  initialFlavors: FlavorRow[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const flavors = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return initialFlavors;
    return initialFlavors.filter((f) => f.name.toLowerCase().includes(needle));
  }, [initialFlavors, q]);

  async function addFlavor(e: React.FormEvent) {
    e.preventDefault();
    setBusy("add");
    setError("");
    try {
      const res = await fetch("/api/stash/flavors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueSlug, brandId, name }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Не удалось добавить");
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function adjust(flavorId: string, delta: number) {
    setBusy(flavorId);
    setError("");
    try {
      const res = await fetch("/api/stash/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueSlug, flavorId, deltaGrams: delta }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Ошибка остатка");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xs tracking-wider text-[var(--aura-muted)] uppercase">
          {brandName}
        </h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск аромата"
          className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-[var(--aura-amber)]"
        />
      </div>

      <form onSubmit={addFlavor} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Новый аромат"
          required
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-[var(--aura-amber)]"
        />
        <button
          type="submit"
          disabled={busy === "add"}
          className="shrink-0 rounded-xl bg-[var(--aura-glow)] px-4 py-2.5 text-sm font-medium text-black disabled:opacity-60"
        >
          +
        </button>
      </form>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/35">
        {flavors.length === 0 ? (
          <p className="px-4 py-5 text-sm text-[var(--aura-muted)]">
            Пока пусто — добавьте аромат.
          </p>
        ) : (
          flavors.map((flavor, i) => (
            <div
              key={flavor.id}
              className={`flex items-center gap-3 px-3 py-2 ${
                i > 0 ? "border-t border-white/8" : ""
              }`}
            >
              <div className="min-w-0 flex-1 truncate text-sm">{flavor.name}</div>
              <GramsBadge grams={flavor.grams} />
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={busy === flavor.id}
                  onClick={() => adjust(flavor.id, -20)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-sm disabled:opacity-50"
                  aria-label="Убрать 20 г"
                >
                  −
                </button>
                <button
                  type="button"
                  disabled={busy === flavor.id}
                  onClick={() => adjust(flavor.id, 50)}
                  className="flex h-8 items-center justify-center rounded-lg border border-[var(--aura-amber)]/40 px-2 text-xs text-[var(--aura-amber)] disabled:opacity-50"
                  aria-label="Добавить 50 г"
                >
                  +50
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GramsBadge({ grams }: { grams: number }) {
  const low = grams > 0 && grams < LOW_STOCK_GRAMS;
  const empty = grams <= 0;
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-0.5 text-xs tabular-nums ${
        empty
          ? "bg-white/5 text-[var(--aura-muted)]"
          : low
            ? "bg-[var(--aura-amber)]/20 text-[var(--aura-amber)]"
            : "bg-white/10 text-[var(--aura-white)]"
      }`}
    >
      {grams.toLocaleString("ru-RU")} г
    </span>
  );
}
