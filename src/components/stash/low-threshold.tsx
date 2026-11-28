"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuraPulse } from "@/components/stash/aura-pulse";
import { LOW_STOCK_OPTIONS, type LowStockGrams } from "@/stash/stock-level";

export function LowThresholdSwitch({
  venueSlug,
  value,
}: {
  venueSlug: string;
  value: LowStockGrams;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(next: LowStockGrams) {
    if (next === current || busy) return;
    setBusy(true);
    setError("");
    const previous = current;
    setCurrent(next);
    try {
      const res = await fetch("/api/stash/low-threshold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueSlug, lowGrams: next }),
      });
      if (!res.ok) {
        setCurrent(previous);
        setError("Не удалось сохранить");
        return;
      }
      router.refresh();
    } catch {
      setCurrent(previous);
      setError("Нет связи с сервером");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121110]/85 p-3 md:p-4">
      {busy ? <AuraPulse label="Считаю остатки…" /> : null}
      <p className="text-sm font-medium">Считать «мало», если на точке меньше</p>
      <p className="mt-0.5 text-xs text-[var(--aura-muted)]">Только для этой точки. Ноль грамм всегда «закончилось».</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Порог">
        {LOW_STOCK_OPTIONS.map((grams) => {
          const active = current === grams;
          return (
            <button
              key={grams}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={busy}
              onClick={() => choose(grams)}
              className={`h-11 rounded-xl border text-sm font-semibold tabular-nums transition active:scale-[0.98] disabled:opacity-60 ${
                active
                  ? "border-[var(--aura-amber)]/60 bg-[var(--aura-amber)]/20 text-[#f0a65a]"
                  : "border-white/12 bg-white/5 hover:bg-white/10"
              }`}
            >
              {grams} г
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
