"use client";

import {
  ClipboardCheck,
  MoreHorizontal,
  PackageMinus,
  PackagePlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  AuraDialog,
  DangerButton,
  ErrorText,
  Field,
  inputClass,
  menuContentClass,
  menuDangerClass,
  menuItemClass,
  PrimaryButton,
  SecondaryButton,
  useApi,
} from "@/components/stash/kit";
import { StockBadge, StockStepper, useStockAdjust } from "@/components/stash/stock-controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PACK_GRAMS, parsePriceKopecks, priceInputValue } from "@/stash/packs";
import { formatGrams } from "@/stash/stock-level";

export type FlavorRef = {
  id: string;
  name: string;
  grams: number;
  lineName?: string;
  packGrams?: number;
  priceKopecks?: number | null;
};
export type StockMode = "in" | "out" | "set";

const MODES: { key: StockMode; label: string; icon: typeof PackagePlus }[] = [
  { key: "in", label: "Приход", icon: PackagePlus },
  { key: "out", label: "Расход", icon: PackageMinus },
  { key: "set", label: "Инвентаризация", icon: ClipboardCheck },
];

const QUICK = PACK_GRAMS;

function StockDialog({
  open,
  onOpenChange,
  venueSlug,
  flavor,
  initialMode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueSlug: string;
  flavor: FlavorRef;
  initialMode: StockMode;
}) {
  const [mode, setMode] = useState<StockMode>(initialMode);
  const [amount, setAmount] = useState(initialMode === "set" ? String(flavor.grams) : "");
  const [note, setNote] = useState("");
  const { call, busy, error, setError } = useApi();

  const value = Number.parseInt(amount, 10);
  const valid = Number.isFinite(value) && value >= 0 && (mode === "set" || value > 0);
  const after = !valid
    ? null
    : mode === "set"
      ? value
      : Math.max(0, flavor.grams + (mode === "in" ? value : -value));

  function switchMode(next: StockMode) {
    setMode(next);
    setError("");
    setAmount(next === "set" ? String(flavor.grams) : "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const payload =
      mode === "set"
        ? { setGrams: value }
        : { deltaGrams: mode === "in" ? value : -value };
    const ok = await call("/api/stash/stock", "POST", {
      venueSlug,
      flavorId: flavor.id,
      note: note.trim() || undefined,
      ...payload,
    });
    if (ok) onOpenChange(false);
  }

  return (
    <AuraDialog
      open={open}
      onOpenChange={onOpenChange}
      title={flavor.name}
      description={
        <>
          Сейчас на точке: <span className="font-semibold text-[var(--aura-white)]">{formatGrams(flavor.grams)}</span>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/40 p-1" role="tablist">
          {MODES.map((m) => {
            const active = m.key === mode;
            return (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchMode(m.key)}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-medium transition sm:text-sm ${
                  active
                    ? "bg-[var(--aura-amber)]/20 text-[#f0a65a] ring-1 ring-inset ring-[var(--aura-amber)]/40"
                    : "text-[var(--aura-white)]/70 hover:bg-white/5"
                }`}
              >
                <m.icon className="hidden size-4 shrink-0 min-[400px]:block" aria-hidden />
                <span className="truncate">{m.key === "set" ? "Пересчёт" : m.label}</span>
              </button>
            );
          })}
        </div>

        <Field
          label={
            mode === "in"
              ? "Сколько пришло, г"
              : mode === "out"
                ? "Сколько списать, г"
                : "Сколько по факту на полке, г"
          }
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100000}
            step={1}
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className={`${inputClass} text-lg font-semibold tabular-nums md:text-base`}
          />
        </Field>

        {mode !== "set" ? (
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className="h-10 min-w-14 flex-1 rounded-lg border border-white/12 bg-white/5 px-2 text-sm tabular-nums transition hover:bg-white/10 active:scale-95 md:h-9"
              >
                {q} г
              </button>
            ))}
          </div>
        ) : null}

        <Field label="Комментарий (необязательно)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder={
              mode === "in" ? "Например: поставка от дистрибьютора" : mode === "out" ? "Например: брак" : "Например: пересчёт в конце месяца"
            }
            className={inputClass}
          />
        </Field>

        <div className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2.5 text-sm">
          <span className="text-[var(--aura-muted)]">Станет</span>
          <span className="font-semibold tabular-nums">
            {after === null ? "—" : formatGrams(after)}
          </span>
        </div>

        <ErrorText>{error}</ErrorText>

        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Отмена
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={!valid || busy}>
            {busy ? "Сохраняю…" : "Сохранить"}
          </PrimaryButton>
        </div>
      </form>
    </AuraDialog>
  );
}

function RenameDialog({
  open,
  onOpenChange,
  venueSlug,
  flavor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueSlug: string;
  flavor: FlavorRef;
}) {
  const [lineName, setLineName] = useState(flavor.lineName ?? "");
  const [name, setName] = useState(flavor.name);
  const [pack, setPack] = useState(flavor.packGrams || 0);
  const [price, setPrice] = useState(priceInputValue(flavor.priceKopecks));
  const { call, busy, error } = useApi();
  const priceKopecks = parsePriceKopecks(price);
  const ready = Boolean(lineName.trim() && name.trim() && pack && priceKopecks !== null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || priceKopecks === null) return;
    const ok = await call("/api/stash/flavors", "PATCH", {
      venueSlug,
      flavorId: flavor.id,
      name,
      lineName,
      packGrams: pack,
      priceKopecks,
    });
    if (ok) onOpenChange(false);
  }

  return (
    <AuraDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Позиция"
      description="Линейка, грамовка и цена пачки общие для обеих точек."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Линейка">
          <input
            value={lineName}
            onChange={(e) => setLineName(e.target.value)}
            required
            maxLength={40}
            autoFocus
            placeholder="Например: Core"
            className={inputClass}
          />
        </Field>
        <Field label="Аромат">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            className={inputClass}
          />
        </Field>
        <PackPicker value={pack} onChange={setPack} />
        <Field label="Цена за 1 пачку, ₽">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            required
            placeholder="890"
            className={inputClass}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Отмена
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={busy || !ready}>
            {busy ? "Сохраняю…" : "Сохранить"}
          </PrimaryButton>
        </div>
      </form>
    </AuraDialog>
  );
}

export function PackPicker({ value, onChange }: { value: number; onChange: (grams: number) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-[var(--aura-muted)]">Грамовка одной пачки</p>
      <div className="grid grid-cols-4 gap-1.5">
        {PACK_GRAMS.map((grams) => (
          <button
            key={grams}
            type="button"
            onClick={() => onChange(grams)}
            className={`h-10 rounded-lg border text-sm tabular-nums transition active:scale-95 ${
              value === grams
                ? "border-[var(--aura-amber)]/60 bg-[var(--aura-amber)]/20 text-[#f0a65a]"
                : "border-white/12 bg-white/5 hover:bg-white/10"
            }`}
          >
            {grams}
          </button>
        ))}
      </div>
    </div>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  venueSlug,
  flavor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueSlug: string;
  flavor: FlavorRef;
}) {
  const { call, busy, error } = useApi();

  async function confirm() {
    const ok = await call("/api/stash/flavors", "DELETE", { venueSlug, flavorId: flavor.id });
    if (ok) onOpenChange(false);
  }

  return (
    <AuraDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Удалить «${flavor.name}»?`}
      description="Аромат пропадёт на обеих точках вместе с остатками. Записи в журнале сохранятся."
    >
      <div className="space-y-4">
        {flavor.grams > 0 ? (
          <p className="rounded-xl bg-[var(--aura-amber)]/12 px-3 py-2.5 text-sm text-[#f0a65a]">
            На этой точке ещё {formatGrams(flavor.grams)} — они спишутся вместе с ароматом.
          </p>
        ) : null}
        <ErrorText>{error}</ErrorText>
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Отмена
          </SecondaryButton>
          <DangerButton type="button" onClick={confirm} disabled={busy}>
            <Trash2 className="size-4" aria-hidden />
            {busy ? "Удаляю…" : "Удалить"}
          </DangerButton>
        </div>
      </div>
    </AuraDialog>
  );
}

type OpenDialog = { kind: "stock"; mode: StockMode } | { kind: "rename" } | { kind: "delete" } | null;

/** Grams badge (tap = exact operation), quick −20/+50 and a ⋯ menu for one flavor row. */
export function FlavorControls({
  venueSlug,
  flavor,
  editable = true,
  lowGrams,
}: {
  venueSlug: string;
  flavor: FlavorRef;
  editable?: boolean;
  lowGrams?: number;
}) {
  const { adjust, busy, error } = useStockAdjust(venueSlug);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [dialogKey, setDialogKey] = useState(0);

  function open(next: Exclude<OpenDialog, null>) {
    setDialogKey((k) => k + 1);
    setDialog(next);
  }
  const close = (o: boolean) => {
    if (!o) setDialog(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => open({ kind: "stock", mode: "in" })}
        className="shrink-0 rounded-md transition hover:brightness-125 active:scale-95 md:justify-self-center"
        aria-label={`Изменить остаток: ${flavor.name}`}
        title="Приход, расход или инвентаризация"
      >
        <StockBadge grams={flavor.grams} lowGrams={lowGrams} />
      </button>
      <div className="flex shrink-0 items-center gap-1.5">
        <StockStepper
          disabled={busy === flavor.id}
          packGrams={flavor.packGrams}
          onAdjust={(d) => adjust(flavor.id, d)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-10 items-center justify-center rounded-lg text-[var(--aura-muted)] transition hover:bg-white/8 hover:text-[var(--aura-white)] data-[popup-open]:bg-white/10 md:size-8"
            aria-label={`Действия: ${flavor.name}`}
          >
            <MoreHorizontal className="size-4.5" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={menuContentClass}>
            {MODES.map((m) => (
              <DropdownMenuItem
                key={m.key}
                className={menuItemClass}
                onClick={() => open({ kind: "stock", mode: m.key })}
              >
                <m.icon className="size-4 text-[var(--aura-muted)]" aria-hidden />
                {m.label}
              </DropdownMenuItem>
            ))}
            {editable ? (
              <>
                <DropdownMenuSeparator className="bg-white/8" />
                <DropdownMenuItem className={menuItemClass} onClick={() => open({ kind: "rename" })}>
                  <Pencil className="size-4 text-[var(--aura-muted)]" aria-hidden />
                  Линейка и цена
                </DropdownMenuItem>
                <DropdownMenuItem className={menuDangerClass} onClick={() => open({ kind: "delete" })}>
                  <Trash2 className="size-4" aria-hidden />
                  Удалить
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {error ? (
        <p
          role="alert"
          className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 rounded-xl bg-red-600/95 px-4 py-3 text-sm text-white shadow-lg md:inset-x-auto md:right-6 md:bottom-6 md:w-80"
        >
          {error}
        </p>
      ) : null}

      {dialog?.kind === "stock" ? (
        <StockDialog
          key={dialogKey}
          open
          onOpenChange={close}
          venueSlug={venueSlug}
          flavor={flavor}
          initialMode={dialog.mode}
        />
      ) : null}
      {dialog?.kind === "rename" ? (
        <RenameDialog key={dialogKey} open onOpenChange={close} venueSlug={venueSlug} flavor={flavor} />
      ) : null}
      {dialog?.kind === "delete" ? (
        <DeleteDialog key={dialogKey} open onOpenChange={close} venueSlug={venueSlug} flavor={flavor} />
      ) : null}
    </>
  );
}
