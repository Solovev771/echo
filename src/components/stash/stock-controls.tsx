"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { stockLevel } from "@/stash/stock-level";

export function useStockAdjust(venueSlug: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function adjust(flavorId: string, delta: number) {
    setBusy(flavorId);
    setError("");
    try {
      const res = await fetch("/api/stash/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueSlug, flavorId, deltaGrams: delta }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Не удалось изменить остаток");
        return;
      }
      router.refresh();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setBusy(null);
    }
  }

  return { adjust, busy, error };
}

export function StockBadge({ grams }: { grams: number }) {
  const level = stockLevel(grams);
  const styles = {
    ok: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
    low: "bg-[var(--aura-amber)]/20 text-[#f0a65a] ring-[var(--aura-amber)]/40",
    out: "bg-red-500/15 text-red-300 ring-red-400/25",
  }[level];
  return (
    <span
      className={`inline-flex min-w-[4.5rem] justify-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums ring-1 ring-inset ${styles}`}
    >
      {grams.toLocaleString("ru-RU")} г
    </span>
  );
}

export function StockStepper({
  disabled,
  onAdjust,
}: {
  disabled?: boolean;
  onAdjust: (delta: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAdjust(-20)}
        className="flex h-10 min-w-10 items-center justify-center gap-0.5 rounded-lg border border-white/15 px-2 text-xs text-[var(--aura-white)]/85 transition hover:border-white/30 hover:bg-white/5 active:scale-95 disabled:opacity-40 md:h-8 md:min-w-8"
        aria-label="Списать 20 г"
      >
        <Minus className="size-3.5" aria-hidden />
        <span className="tabular-nums">20</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAdjust(50)}
        className="flex h-10 min-w-10 items-center justify-center gap-0.5 rounded-lg border border-[var(--aura-amber)]/45 bg-[var(--aura-amber)]/10 px-2 text-xs font-medium text-[#f0a65a] transition hover:bg-[var(--aura-amber)]/20 active:scale-95 disabled:opacity-40 md:h-8 md:min-w-8"
        aria-label="Добавить 50 г"
      >
        <Plus className="size-3.5" aria-hidden />
        <span className="tabular-nums">50</span>
      </button>
    </div>
  );
}
