import {
  ClipboardCheck,
  History,
  PackageMinus,
  PackagePlus,
  Pencil,
  Sparkles,
  Trash2,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { requireVenueAccess } from "@/stash/access";
import { loadMovements, type MovementRow } from "@/stash/movements";
import type { MovementKind } from "@/stash/schema";
import { formatGrams } from "@/stash/stock-level";

const LIMIT = 300;
const TZ = "Europe/Moscow";

const FILTERS: { key: string; label: string; kinds: MovementKind[] | null }[] = [
  { key: "all", label: "Все", kinds: null },
  { key: "in", label: "Приход", kinds: ["in"] },
  { key: "out", label: "Расход", kinds: ["out"] },
  { key: "set", label: "Инвентаризация", kinds: ["set"] },
];

const KIND_META: Record<MovementKind, { label: string; icon: LucideIcon; tone: string }> = {
  in: { label: "Приход", icon: PackagePlus, tone: "bg-emerald-500/15 text-emerald-300" },
  out: { label: "Расход", icon: PackageMinus, tone: "bg-red-500/15 text-red-300" },
  set: { label: "Инвентаризация", icon: ClipboardCheck, tone: "bg-[var(--aura-amber)]/20 text-[#f0a65a]" },
  create: { label: "Новый аромат", icon: Sparkles, tone: "bg-sky-500/15 text-sky-300" },
  rename: { label: "Переименован", icon: Pencil, tone: "bg-white/8 text-[var(--aura-white)]/80" },
  delete: { label: "Удалён", icon: Trash2, tone: "bg-white/8 text-[var(--aura-muted)]" },
};

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayLabelFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TZ,
  day: "numeric",
  month: "long",
  weekday: "long",
});
const timeFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

function dayLabel(key: string, now: Date) {
  const today = dayKeyFmt.format(now);
  const yesterday = dayKeyFmt.format(new Date(now.getTime() - 86_400_000));
  if (key === today) return "Сегодня";
  if (key === yesterday) return "Вчера";
  const [y, m, d] = key.split("-").map(Number);
  return dayLabelFmt.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

function signed(delta: number) {
  if (delta === 0) return "0 г";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta).toLocaleString("ru-RU")} г`;
}

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ venue: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const [{ venue: slug }, { kind }] = await Promise.all([params, searchParams]);
  const { venue } = await requireVenueAccess(slug);
  const filter = FILTERS.find((f) => f.key === kind) ?? FILTERS[0];
  const rows = await loadMovements(venue.id, filter.kinds, LIMIT);

  const now = new Date();
  const days: { key: string; rows: MovementRow[]; inSum: number; outSum: number }[] = [];
  for (const row of rows) {
    const key = dayKeyFmt.format(row.createdAt);
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      day = { key, rows: [], inSum: 0, outSum: 0 };
      days.push(day);
    }
    day.rows.push(row);
    if (row.kind === "in") day.inSum += row.delta;
    if (row.kind === "out") day.outSum += row.delta;
  }

  return (
    <div className="max-w-3xl space-y-5 md:space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.28em] text-[#f0a65a] uppercase">{venue.name}</p>
        <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Журнал</h1>
        <p className="mt-1 text-sm text-[var(--aura-muted)]">
          Кто, когда и сколько: приход, расход и пересчёты по этой точке. Время московское.
        </p>
      </header>

      <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" aria-label="Тип операции">
        {FILTERS.map((f) => {
          const active = f.key === filter.key;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? `/stash/${slug}/history` : `/stash/${slug}/history?kind=${f.key}`}
              aria-current={active ? "page" : undefined}
              className={`flex h-10 shrink-0 items-center rounded-full px-4 text-sm transition md:h-9 ${
                active
                  ? "bg-[var(--aura-amber)]/20 text-[#f0a65a] ring-1 ring-inset ring-[var(--aura-amber)]/40"
                  : "bg-white/5 text-[var(--aura-white)]/75 hover:bg-white/10"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {days.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#121110]/85 px-6 py-12 text-center">
          <History className="size-10 text-[var(--aura-muted)]" aria-hidden />
          <p className="font-semibold">Пока пусто</p>
          <p className="max-w-xs text-sm text-[var(--aura-muted)]">
            Здесь появится каждое изменение остатков: кто списал, кто принял поставку, кто
            пересчитал полку.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <section
              key={day.key}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#121110]/85"
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-white/8 px-4 py-3">
                <h2 className="font-semibold first-letter:uppercase">{dayLabel(day.key, now)}</h2>
                <p className="flex gap-3 text-xs tabular-nums">
                  {day.inSum > 0 ? <span className="text-emerald-300">{signed(day.inSum)}</span> : null}
                  {day.outSum < 0 ? <span className="text-red-300">{signed(day.outSum)}</span> : null}
                </p>
              </div>
              <ul>
                {day.rows.map((row, i) => (
                  <MovementItem key={row.id} row={row} first={i === 0} slug={slug} />
                ))}
              </ul>
            </section>
          ))}
          {rows.length >= LIMIT ? (
            <p className="text-center text-xs text-[var(--aura-muted)]">
              Показаны последние {LIMIT} записей.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function MovementItem({ row, first, slug }: { row: MovementRow; first: boolean; slug: string }) {
  const meta = KIND_META[row.kind];
  const Icon = meta.icon;
  const stockKind = row.kind === "in" || row.kind === "out" || row.kind === "set";

  return (
    <li className={`flex gap-3 px-4 py-3 ${first ? "" : "border-t border-white/6"}`}>
      <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] tracking-[0.08em] text-[var(--aura-muted)] uppercase">
              {row.brandName}
            </p>
            <p className="line-clamp-2 text-sm font-medium break-words">{row.flavorName}</p>
          </div>
          <div className="shrink-0 text-right">
            {stockKind ? (
              <p
                className={`text-sm font-semibold tabular-nums ${
                  row.kind === "set"
                    ? "text-[#f0a65a]"
                    : row.delta >= 0
                      ? "text-emerald-300"
                      : "text-red-300"
                }`}
              >
                {row.kind === "set" ? `= ${formatGrams(row.gramsAfter)}` : signed(row.delta)}
              </p>
            ) : (
              <p className="text-xs text-[var(--aura-muted)]">{meta.label}</p>
            )}
            {stockKind ? (
              <p className="text-[11px] text-[var(--aura-muted)] tabular-nums">
                {row.kind === "set" ? `было ${formatGrams(row.gramsAfter - row.delta)}` : `стало ${formatGrams(row.gramsAfter)}`}
              </p>
            ) : null}
          </div>
        </div>
        {row.supplyId ? (
          <Link
            href={`/stash/${slug}/supplies/${row.supplyId}`}
            className="mt-1.5 inline-flex h-7 max-w-full items-center gap-1 rounded-md bg-emerald-500/12 px-2 text-[11px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/20 transition hover:bg-emerald-500/20"
          >
            <Truck className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{row.note || "Поставка"}</span>
          </Link>
        ) : row.note ? (
          <p className="mt-1 text-xs text-[var(--aura-white)]/70 italic">«{row.note}»</p>
        ) : null}
        <p className="mt-1 text-[11px] text-[var(--aura-muted)]">
          {timeFmt.format(row.createdAt)} · {row.userName}
          {stockKind ? ` · ${meta.label.toLowerCase()}` : ""}
        </p>
      </div>
    </li>
  );
}
