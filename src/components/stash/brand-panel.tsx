"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-xs tracking-wider text-[var(--aura-muted)] uppercase">
          {brandName}
        </h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск аромата"
          className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm outline-none focus:border-[var(--aura-amber)]"
        />
      </div>

      <form onSubmit={addFlavor} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Новый аромат"
          required
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm outline-none focus:border-[var(--aura-amber)]"
        />
        <button
          type="submit"
          disabled={busy === "add"}
          className="rounded-xl bg-[var(--aura-glow)] px-4 text-sm font-medium text-black disabled:opacity-60"
        >
          +
        </button>
      </form>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/35">
        {flavors.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--aura-muted)]">
            Пока пусто — добавьте аромат.
          </p>
        ) : (
          flavors.map((flavor, i) => (
            <div
              key={flavor.id}
              className={`flex items-center gap-3 px-3 py-3 ${
                i > 0 ? "border-t border-white/8" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{flavor.name}</div>
                <div className="text-xs text-[var(--aura-muted)]">{flavor.grams} г</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={busy === flavor.id}
                  onClick={() => adjust(flavor.id, -20)}
                  className="h-9 w-9 rounded-lg border border-white/15 text-sm"
                >
                  −
                </button>
                <button
                  type="button"
                  disabled={busy === flavor.id}
                  onClick={() => adjust(flavor.id, 50)}
                  className="h-9 rounded-lg border border-[var(--aura-amber)]/40 px-2.5 text-xs text-[var(--aura-amber)]"
                >
                  +50г
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
