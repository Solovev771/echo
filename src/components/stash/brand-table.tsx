"use client";

import { ArrowDown, ArrowUp, ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatGrams } from "@/stash/stock-level";

export type BrandRow = {
  id: string;
  name: string;
  flavorCount: number;
  totalGrams: number;
  attention: number;
};

type SortKey = "name" | "flavorCount" | "totalGrams" | "attention";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" | "center" }[] = [
  { key: "name", label: "Бренд", align: "left" },
  { key: "flavorCount", label: "Позиций", align: "center" },
  { key: "totalGrams", label: "На складе", align: "right" },
  { key: "attention", label: "Заканчивается", align: "center" },
];

export function BrandTable({ venueSlug, rows }: { venueSlug: string; rows: BrandRow[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((r) => r.name.toLowerCase().includes(needle))
      : rows;
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp =
        typeof av === "string"
          ? av.localeCompare(bv as string, "ru")
          : (av as number) - (bv as number);
      return cmp * sort.dir;
    });
  }, [rows, q, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: key === "name" ? 1 : -1 };
      if (prev.dir === (key === "name" ? 1 : -1)) return { key, dir: prev.dir === 1 ? -1 : 1 };
      return null;
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121110]/85">
      <div className="border-b border-white/8 p-3 md:p-4">
        <SearchInput value={q} onChange={setQ} placeholder="Поиск по бренду" />
      </div>

      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] tracking-[0.12em] text-[var(--aura-muted)] uppercase">
              {COLUMNS.map((col) => {
                const active = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 font-medium ${
                      col.align === "left"
                        ? "text-left"
                        : col.align === "right"
                          ? "text-right"
                          : "text-center"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 uppercase transition hover:text-[var(--aura-white)] ${
                        active ? "text-[#f0a65a]" : ""
                      }`}
                    >
                      {col.label}
                      {active ? (
                        sort.dir === 1 ? (
                          <ArrowUp className="size-3" aria-hidden />
                        ) : (
                          <ArrowDown className="size-3" aria-hidden />
                        )
                      ) : null}
                    </button>
                  </th>
                );
              })}
              <th className="w-10" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const href = `/stash/${venueSlug}/${row.id}`;
              return (
                <tr
                  key={row.id}
                  className="group border-t border-white/6 transition hover:bg-[var(--aura-amber)]/[0.06]"
                >
                  <td className="px-4 py-3">
                    <Link href={href} className="font-semibold hover:text-[#f0a65a]">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-[var(--aura-white)]/80">
                    {row.flavorCount || "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.flavorCount ? formatGrams(row.totalGrams) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <AttentionBadge count={row.attention} />
                  </td>
                  <td className="pr-4 text-right">
                    <Link href={href} aria-label={`Открыть ${row.name}`}>
                      <ChevronRight className="ml-auto size-4 text-[var(--aura-muted)] transition group-hover:text-[#f0a65a]" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden">
        {visible.map((row, i) => (
          <li key={row.id} className={i > 0 ? "border-t border-white/6" : undefined}>
            <Link
              href={`/stash/${venueSlug}/${row.id}`}
              className="flex min-h-14 items-center gap-3 px-4 py-3 active:bg-white/5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{row.name}</span>
                <span className="block text-xs text-[var(--aura-muted)] tabular-nums">
                  {row.flavorCount
                    ? `${row.flavorCount} поз. · ${formatGrams(row.totalGrams)}`
                    : "Нет ароматов"}
                </span>
              </span>
              {row.attention > 0 ? <AttentionBadge count={row.attention} /> : null}
              <ChevronRight className="size-4 shrink-0 text-[var(--aura-muted)]" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--aura-muted)]">
          Ничего не нашлось по запросу «{q.trim()}».
        </p>
      ) : null}

      <div className="border-t border-white/8 px-4 py-3 text-xs text-[var(--aura-muted)]">
        Всего: {visible.length}
        {visible.length !== rows.length ? ` из ${rows.length}` : ""}
      </div>
    </section>
  );
}

export function AttentionBadge({ count }: { count: number }) {
  if (count <= 0) {
    return <span className="inline-block w-7 text-center text-[var(--aura-muted)]/60">—</span>;
  }
  return (
    <span className="inline-flex min-w-7 items-center justify-center rounded-md bg-[var(--aura-amber)]/20 px-1.5 py-0.5 text-xs font-semibold text-[#f0a65a] tabular-nums ring-1 ring-inset ring-[var(--aura-amber)]/35">
      {count}
    </span>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block md:max-w-xs">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--aura-muted)]"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        className="h-11 w-full rounded-xl border border-white/12 bg-black/40 pr-9 pl-9 text-base outline-none placeholder:text-[var(--aura-muted)]/70 focus:border-[var(--aura-amber)] md:h-10 md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--aura-muted)] hover:text-[var(--aura-white)]"
          aria-label="Очистить поиск"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </label>
  );
}
