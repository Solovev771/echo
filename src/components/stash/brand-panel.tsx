"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SearchInput } from "@/components/stash/brand-table";
import { FlavorControls } from "@/components/stash/flavor-actions";
import { PackPicker } from "@/components/stash/flavor-actions";
import { formatPrice, parsePriceKopecks } from "@/stash/packs";
import { stockLevel, type StockLevel } from "@/stash/stock-level";

type FlavorRow = {
  id: string;
  name: string;
  grams: number;
  lineName: string;
  packGrams: number;
  priceKopecks: number | null;
};

type Filter = "all" | Exclude<StockLevel, "ok">;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "low", label: "Мало" },
  { key: "out", label: "Нет" },
];

/** How many positions one page lists. Five is a phone screen; ten is a laptop screen. */
const PAGE_SIZES = [5, 10, 20, 50] as const;

export function BrandPanel({
  venueSlug,
  brandId,
  initialFlavors,
  lowGrams,
}: {
  venueSlug: string;
  brandId: string;
  initialFlavors: FlavorRow[];
  lowGrams: number;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [name, setName] = useState("");
  const [lineName, setLineName] = useState("");
  const [pack, setPack] = useState(0);
  const [price, setPrice] = useState("");
  const [lineFilter, setLineFilter] = useState("all");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const counts = useMemo(() => {
    const c = { all: initialFlavors.length, low: 0, out: 0 };
    for (const f of initialFlavors) {
      const level = stockLevel(f.grams, lowGrams);
      if (level !== "ok") c[level] += 1;
    }
    return c;
  }, [initialFlavors, lowGrams]);

  const lineOptions = useMemo(
    () =>
      [...new Set(initialFlavors.map((f) => f.lineName).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "ru"),
      ),
    [initialFlavors],
  );

  const flavors = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return initialFlavors.filter(
      (f) =>
        (filter === "all" || stockLevel(f.grams, lowGrams) === filter) &&
        (lineFilter === "all" || f.lineName === lineFilter) &&
        (!needle || `${f.lineName} ${f.name}`.toLowerCase().includes(needle)),
    );
  }, [initialFlavors, q, filter, lineFilter, lowGrams]);

  const pageCount = Math.max(1, Math.ceil(flavors.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * pageSize;
  const visibleFlavors = flavors.slice(pageStart, pageStart + pageSize);

  function choosePageSize(next: (typeof PAGE_SIZES)[number]) {
    setPageSize(next);
    setPage(0);
  }

  const priceKopecks = parsePriceKopecks(price);
  const canCreate = Boolean(name.trim() && lineName.trim() && pack && priceKopecks !== null);

  async function addFlavor(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/stash/flavors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueSlug,
          brandId,
          name,
          lineName,
          packGrams: pack,
          priceKopecks,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setAddError(data.error || "Не удалось добавить");
        return;
      }
      setName("");
      setPrice("");
      router.refresh();
    } catch {
      setAddError("Нет связи с сервером");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={addFlavor}
        className="space-y-3 rounded-2xl border border-white/10 bg-[#121110]/85 p-3"
      >
        <p className="px-1 text-[11px] tracking-[0.16em] text-[var(--aura-muted)] uppercase">
          Новая позиция
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={lineName}
            onChange={(e) => setLineName(e.target.value)}
            placeholder="Линейка, например Core"
            list="brand-lines"
            required
            maxLength={40}
            className="h-11 rounded-xl border border-white/12 bg-black/40 px-3 text-base outline-none placeholder:text-[var(--aura-muted)]/70 focus:border-[var(--aura-amber)] md:h-10 md:text-sm"
          />
          <datalist id="brand-lines">
            {lineOptions.map((line) => (
              <option key={line} value={line} />
            ))}
          </datalist>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Аромат"
            required
            maxLength={80}
            className="h-11 rounded-xl border border-white/12 bg-black/40 px-3 text-base outline-none placeholder:text-[var(--aura-muted)]/70 focus:border-[var(--aura-amber)] md:h-10 md:text-sm"
          />
        </div>
        <PackPicker value={pack} onChange={setPack} />
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Цена за пачку</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="Цена за 1 пачку"
              className="h-11 w-full rounded-xl border border-white/12 bg-black/40 px-3 pr-8 text-base outline-none placeholder:text-[var(--aura-muted)]/70 focus:border-[var(--aura-amber)] md:h-10 md:text-sm"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[var(--aura-muted)]">
              ₽
            </span>
          </label>
          <button
            type="submit"
            disabled={adding || !canCreate}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--aura-glow)] px-4 text-sm font-semibold text-black transition hover:brightness-110 active:scale-95 disabled:opacity-50 md:h-10"
          >
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">{adding ? "Добавляю…" : "Добавить"}</span>
          </button>
        </div>
      </form>
      {addError ? <p className="text-sm text-red-400">{addError}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121110]/85">
        <div className="flex flex-col gap-3 border-b border-white/8 p-3 md:flex-row md:items-center md:justify-between md:p-4">
          <SearchInput
            value={q}
            onChange={(value) => {
              setQ(value);
              setPage(0);
            }}
            placeholder="Поиск аромата"
          />
          <div className="flex gap-1.5" role="tablist" aria-label="Фильтр остатков">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setFilter(f.key);
                    setPage(0);
                  }}
                  className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm transition md:flex-none ${
                    active
                      ? "bg-[var(--aura-amber)]/20 text-[#f0a65a] ring-1 ring-inset ring-[var(--aura-amber)]/40"
                      : "bg-white/5 text-[var(--aura-white)]/75 hover:bg-white/10"
                  }`}
                >
                  {f.label}
                  <span className="text-xs tabular-nums opacity-70">{counts[f.key]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {lineOptions.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto border-b border-white/8 px-3 py-2">
            {["all", ...lineOptions].map((line) => {
              const active = lineFilter === line;
              return (
                <button
                  key={line}
                  type="button"
                  onClick={() => {
                    setLineFilter(line);
                    setPage(0);
                  }}
                  className={`h-9 shrink-0 rounded-lg px-3 text-sm transition ${
                    active
                      ? "bg-white/12 text-[var(--aura-white)]"
                      : "text-[var(--aura-muted)] hover:bg-white/5"
                  }`}
                >
                  {line === "all" ? "Все линейки" : line}
                </button>
              );
            })}
          </div>
        ) : null}

        {flavors.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--aura-muted)]">
            {initialFlavors.length === 0
              ? "Ароматов пока нет — добавьте первый выше."
              : "Под фильтр ничего не попало."}
          </p>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_6rem_auto] gap-4 px-4 pt-3 pb-2 text-[11px] tracking-[0.12em] text-[var(--aura-muted)] uppercase md:grid">
              <span>Аромат</span>
              <span className="text-center">Остаток</span>
              <span className="w-[9rem] text-right">Изменить</span>
            </div>
            <ul>
              {visibleFlavors.map((flavor) => (
                <li
                  key={flavor.id}
                  className="flex items-center gap-2 border-t border-white/6 px-4 py-2.5 transition hover:bg-white/[0.03] md:grid md:grid-cols-[minmax(0,1fr)_6rem_auto] md:gap-4"
                >
                  <span className="min-w-0 flex-1">
                    {flavor.lineName ? (
                      <span className="block truncate text-[11px] tracking-[0.08em] text-[var(--aura-muted)] uppercase">
                        {flavor.lineName}
                      </span>
                    ) : (
                      <span className="block text-[11px] text-[var(--aura-amber)]">Без линейки</span>
                    )}
                    <span className="line-clamp-2 text-sm font-medium break-words md:truncate">
                      {flavor.name}
                    </span>
                    <span className="block text-xs text-[var(--aura-muted)] tabular-nums">
                      {flavor.packGrams ? `${flavor.packGrams} г` : "грамовка не указана"}
                      {" · "}
                      {formatPrice(flavor.priceKopecks)}
                    </span>
                  </span>
                  <FlavorControls venueSlug={venueSlug} flavor={flavor} lowGrams={lowGrams} />
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex flex-col gap-3 border-t border-white/8 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--aura-muted)]">
            {flavors.length === 0
              ? "Нет позиций"
              : `${pageStart + 1}–${pageStart + visibleFlavors.length} из ${flavors.length}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1" role="group" aria-label="Сколько позиций на странице">
              {PAGE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={pageSize === size}
                  onClick={() => choosePageSize(size)}
                  className={`h-10 min-w-10 rounded-lg px-2 text-sm tabular-nums ${
                    pageSize === size
                      ? "bg-[var(--aura-amber)]/20 text-[#f0a65a] ring-1 ring-inset ring-[var(--aura-amber)]/40"
                      : "bg-white/5 text-[var(--aura-muted)]"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
                className="h-10 rounded-lg bg-white/5 px-3 text-sm disabled:opacity-40"
              >
                Назад
              </button>
              <span className="min-w-12 text-center text-xs text-[var(--aura-muted)] tabular-nums">
                {currentPage + 1}/{pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
                className="h-10 rounded-lg bg-white/5 px-3 text-sm disabled:opacity-40"
              >
                Дальше
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
