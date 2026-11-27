"use client";

import { Check, PackageCheck, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AuraDialog,
  ErrorText,
  Field,
  inputClass,
  PrimaryButton,
  SecondaryButton,
} from "@/components/stash/kit";
import { positions } from "@/stash/format";
import { formatGrams, shortVenueName } from "@/stash/stock-level";

type Brand = { id: string; name: string };
type Flavor = { id: string; name: string; brandId: string; grams: number };

type DraftLine = {
  key: string;
  flavorId: string | null;
  brandId: string;
  brandName: string;
  flavorName: string;
  grams: number;
};

type Draft = { supplier: string; note: string; lines: DraftLine[] };

const QUICK_GRAMS = [25, 50, 100, 200, 250];
const MAX_GRAMS = 100_000;
const EMPTY_DRAFT: Draft = { supplier: "", note: "", lines: [] };

const draftKey = (venueSlug: string) => `aura-stash:supply-draft:${venueSlug}`;
const lineKey = (brandId: string, flavorId: string | null, name: string) =>
  flavorId ?? `new:${brandId}:${name.trim().toLowerCase()}`;

function loadDraft(venueSlug: string, brands: Brand[], flavors: Flavor[]): Draft {
  try {
    const parsed = JSON.parse(localStorage.getItem(draftKey(venueSlug)) ?? "null") as Draft | null;
    if (!parsed || !Array.isArray(parsed.lines)) return EMPTY_DRAFT;
    const brandIds = new Set(brands.map((b) => b.id));
    const flavorById = new Map(flavors.map((f) => [f.id, f]));
    const lines = parsed.lines
      .filter((l) => brandIds.has(l.brandId) && Number.isFinite(l.grams))
      .map((l) => {
        // A flavor deleted since the draft was saved is re-created by name.
        if (l.flavorId && !flavorById.has(l.flavorId)) return { ...l, flavorId: null };
        if (l.flavorId) return { ...l, flavorName: flavorById.get(l.flavorId)!.name };
        return l;
      });
    return {
      supplier: typeof parsed.supplier === "string" ? parsed.supplier : "",
      note: typeof parsed.note === "string" ? parsed.note : "",
      lines,
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function SupplyForm({
  venueSlug,
  venueName,
  brands,
  flavors,
}: {
  venueSlug: string;
  venueName: string;
  brands: Brand[];
  flavors: Flavor[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [restored, setRestored] = useState(false);

  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandQuery, setBrandQuery] = useState("");
  const [flavorQuery, setFlavorQuery] = useState("");
  const [existingQuery, setExistingQuery] = useState("");
  const [picked, setPicked] = useState<{ flavorId: string | null; name: string } | null>(null);
  const [grams, setGrams] = useState("");
  const flavorInput = useRef<HTMLInputElement>(null);
  const gramsInput = useRef<HTMLInputElement>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // localStorage only exists in the browser, so the draft is restored after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loadDraft(venueSlug, brands, flavors));
    setRestored(true);
  }, [venueSlug, brands, flavors]);

  useEffect(() => {
    if (!restored) return;
    if (draft.lines.length === 0 && !draft.supplier && !draft.note) {
      localStorage.removeItem(draftKey(venueSlug));
    } else {
      localStorage.setItem(draftKey(venueSlug), JSON.stringify(draft));
    }
  }, [draft, restored, venueSlug]);

  const brand = brands.find((b) => b.id === brandId) ?? null;
  const brandNameById = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);

  const existingFlavors = useMemo(() => {
    const needle = existingQuery.trim().toLowerCase();
    return flavors
      .map((f) => ({ ...f, brandName: brandNameById.get(f.brandId) ?? "" }))
      .filter((f) => {
        if (brandId && f.brandId === brandId) return false;
        if (!needle) return true;
        return `${f.brandName} ${f.name}`.toLowerCase().includes(needle);
      })
      .sort(
        (a, b) =>
          Number(b.grams > 0) - Number(a.grams > 0) ||
          a.brandName.localeCompare(b.brandName, "ru") ||
          a.name.localeCompare(b.name, "ru"),
      );
  }, [flavors, brandNameById, existingQuery, brandId]);

  const brandMatches = useMemo(() => {
    const needle = brandQuery.trim().toLowerCase();
    return needle ? brands.filter((b) => b.name.toLowerCase().includes(needle)) : brands;
  }, [brands, brandQuery]);

  const brandFlavors = useMemo(
    () => (brandId ? flavors.filter((f) => f.brandId === brandId) : []),
    [flavors, brandId],
  );
  const flavorMatches = useMemo(() => {
    const needle = flavorQuery.trim().toLowerCase();
    return needle
      ? brandFlavors.filter((f) => f.name.toLowerCase().includes(needle))
      : brandFlavors;
  }, [brandFlavors, flavorQuery]);
  const typedName = flavorQuery.trim().replace(/\s+/g, " ");
  const exactMatch = brandFlavors.find((f) => f.name.toLowerCase() === typedName.toLowerCase());
  const pendingNewName = draft.lines.find(
    (l) => !l.flavorId && l.brandId === brandId && l.flavorName.toLowerCase() === typedName.toLowerCase(),
  );

  const inDraft = useMemo(() => new Map(draft.lines.map((l) => [l.key, l.grams])), [draft.lines]);
  const totalGrams = draft.lines.reduce((sum, l) => sum + (l.grams > 0 ? l.grams : 0), 0);
  const invalidLines = draft.lines.filter((l) => !(l.grams > 0 && l.grams <= MAX_GRAMS));

  const gramsValue = Number.parseInt(grams, 10);
  const canAdd = Boolean(brand && picked && gramsValue > 0 && gramsValue <= MAX_GRAMS);

  function chooseBrand(id: string) {
    setBrandId(id);
    setBrandQuery("");
    setFlavorQuery("");
    setPicked(null);
    requestAnimationFrame(() => flavorInput.current?.focus());
  }

  function pick(next: { flavorId: string | null; name: string }) {
    setPicked(next);
    setFlavorQuery("");
    requestAnimationFrame(() => gramsInput.current?.focus());
  }

  function pickExisting(flavor: Flavor) {
    setBrandId(flavor.brandId);
    setBrandQuery("");
    setExistingQuery("");
    pick({ flavorId: flavor.id, name: flavor.name });
  }

  function addLine(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canAdd || !brand || !picked) return;
    const key = lineKey(brand.id, picked.flavorId, picked.name);
    setDraft((d) => {
      const existing = d.lines.find((l) => l.key === key);
      const lines = existing
        ? d.lines.map((l) =>
            l.key === key ? { ...l, grams: Math.min(MAX_GRAMS, l.grams + gramsValue) } : l,
          )
        : [
            ...d.lines,
            {
              key,
              flavorId: picked.flavorId,
              brandId: brand.id,
              brandName: brand.name,
              flavorName: picked.name,
              grams: gramsValue,
            },
          ];
      return { ...d, lines };
    });
    setPicked(null);
    setGrams("");
    setError("");
    requestAnimationFrame(() => flavorInput.current?.focus());
  }

  function updateLine(key: string, value: string) {
    const n = Number.parseInt(value, 10);
    setDraft((d) => ({
      ...d,
      lines: d.lines.map((l) => (l.key === key ? { ...l, grams: Number.isFinite(n) ? n : 0 } : l)),
    }));
  }

  function removeLine(key: string) {
    setDraft((d) => ({ ...d, lines: d.lines.filter((l) => l.key !== key) }));
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stash/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueSlug,
          supplier: draft.supplier.trim() || undefined,
          note: draft.note.trim() || undefined,
          lines: draft.lines.map((l) =>
            l.flavorId
              ? { flavorId: l.flavorId, grams: l.grams }
              : { brandId: l.brandId, newFlavorName: l.flavorName, grams: l.grams },
          ),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error || "Не получилось провести поставку");
        setConfirmOpen(false);
        return;
      }
      localStorage.removeItem(draftKey(venueSlug));
      setRestored(false);
      router.push(`/stash/${venueSlug}/supplies/${data.id}?done=1`);
    } catch {
      setError("Нет связи с сервером. Список сохранён — попробуйте ещё раз.");
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const sortedLines = [...draft.lines].sort(
    (a, b) =>
      a.brandName.localeCompare(b.brandName, "ru") || a.flavorName.localeCompare(b.flavorName, "ru"),
  );

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-2xl border border-white/10 bg-[#121110]/85 p-3 md:p-4">
        <h2 className="px-1 text-[11px] tracking-[0.2em] text-[var(--aura-muted)] uppercase">
          Добавить позицию
        </h2>

        {!picked && !brand ? (
          <ExistingPicker
            query={existingQuery}
            onQuery={setExistingQuery}
            rows={existingFlavors}
            inDraft={inDraft}
            onPick={pickExisting}
          />
        ) : null}

        {brand ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-black/35 px-3 py-2">
            <span className="min-w-0">
              <span className="block text-[10px] tracking-[0.14em] text-[var(--aura-muted)] uppercase">
                Бренд
              </span>
              <span className="block truncate font-semibold">{brand.name}</span>
            </span>
            <SecondaryButton
              type="button"
              onClick={() => {
                setBrandId(null);
                setPicked(null);
                setFlavorQuery("");
              }}
              className="h-10 shrink-0 px-3 md:h-9"
            >
              Сменить
            </SecondaryButton>
          </div>
        ) : (
          <div className="space-y-2">
            <SearchBox value={brandQuery} onChange={setBrandQuery} placeholder="Бренд: начните вводить" />
            <div className="grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
              {brandMatches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => chooseBrand(b.id)}
                  className="h-11 truncate rounded-xl border border-white/10 bg-white/5 px-3 text-left text-sm font-medium transition hover:border-[var(--aura-amber)]/45 hover:bg-white/8 active:scale-[0.98]"
                >
                  {b.name}
                </button>
              ))}
              {brandMatches.length === 0 ? (
                <p className="col-span-full px-1 py-3 text-sm text-[var(--aura-muted)]">
                  Такого бренда нет. Новый бренд добавляет администратор на странице «Склад».
                </p>
              ) : null}
            </div>
          </div>
        )}

        {brand && !picked ? (
          <div className="space-y-2">
            <p className="px-1 text-sm font-medium">Существующие ароматы · {brand.name}</p>
            <SearchBox
              inputRef={flavorInput}
              value={flavorQuery}
              onChange={setFlavorQuery}
              placeholder="Аромат: найдите или впишите новый"
              onEnter={() => {
                if (exactMatch) pick({ flavorId: exactMatch.id, name: exactMatch.name });
                else if (typedName) pick({ flavorId: null, name: typedName });
              }}
            />
            <ul className="max-h-80 overflow-y-auto rounded-xl border border-white/8">
              {typedName && !exactMatch ? (
                <li>
                  <button
                    type="button"
                    onClick={() => pick({ flavorId: null, name: typedName })}
                    className="flex min-h-12 w-full items-center gap-2.5 bg-[var(--aura-amber)]/10 px-3 py-2 text-left text-sm text-[#f0a65a] transition hover:bg-[var(--aura-amber)]/16"
                  >
                    <Sparkles className="size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 break-words">
                      Новый аромат «{typedName}»
                    </span>
                    {pendingNewName ? (
                      <span className="shrink-0 text-xs">уже {formatGrams(pendingNewName.grams)}</span>
                    ) : null}
                  </button>
                </li>
              ) : null}
              {flavorMatches.map((f, i) => {
                const added = inDraft.get(f.id);
                return (
                  <li key={f.id} className={i > 0 || (typedName && !exactMatch) ? "border-t border-white/6" : ""}>
                    <button
                      type="button"
                      onClick={() => pick({ flavorId: f.id, name: f.name })}
                      className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-white/5"
                    >
                      <span className="min-w-0 flex-1 text-sm break-words">{f.name}</span>
                      {added ? (
                        <span className="shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-300 tabular-nums">
                          +{formatGrams(added)}
                        </span>
                      ) : null}
                      <span className="shrink-0 text-xs text-[var(--aura-muted)] tabular-nums">
                        на складе {formatGrams(f.grams)}
                      </span>
                    </button>
                  </li>
                );
              })}
              {flavorMatches.length === 0 && !typedName ? (
                <li className="px-3 py-4 text-sm text-[var(--aura-muted)]">
                  В этом бренде ещё нет ароматов — впишите название, чтобы создать, или выберите
                  из других брендов ниже.
                </li>
              ) : null}
            </ul>
            {existingFlavors.length > 0 ? (
              <details className="rounded-xl border border-white/8 px-3 py-2">
                <summary className="flex min-h-10 cursor-pointer items-center text-sm text-[var(--aura-muted)]">
                  Ароматы других брендов · {existingFlavors.length}
                </summary>
                <div className="pt-2">
                  <ExistingPicker
                    query={existingQuery}
                    onQuery={setExistingQuery}
                    rows={existingFlavors}
                    inDraft={inDraft}
                    onPick={pickExisting}
                    hideTitle
                  />
                </div>
              </details>
            ) : null}
          </div>
        ) : null}

        {brand && picked ? (
          <form onSubmit={addLine} className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-black/35 px-3 py-2">
              <span className="min-w-0">
                <span className="block text-[10px] tracking-[0.14em] text-[var(--aura-muted)] uppercase">
                  {picked.flavorId ? "Аромат" : "Новый аромат"}
                </span>
                <span className="block font-semibold break-words">{picked.name}</span>
              </span>
              <SecondaryButton
                type="button"
                onClick={() => {
                  setPicked(null);
                  requestAnimationFrame(() => flavorInput.current?.focus());
                }}
                className="h-10 shrink-0 px-3 md:h-9"
              >
                Сменить
              </SecondaryButton>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {QUICK_GRAMS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setGrams(String(q))}
                  className={`h-11 rounded-lg border text-sm tabular-nums transition active:scale-95 md:h-10 ${
                    gramsValue === q
                      ? "border-[var(--aura-amber)]/60 bg-[var(--aura-amber)]/20 text-[#f0a65a]"
                      : "border-white/12 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Граммы</span>
                <input
                  ref={gramsInput}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_GRAMS}
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  placeholder="Свой вес"
                  className={`${inputClass} pr-8 text-lg font-semibold tabular-nums md:text-base`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[var(--aura-muted)]">
                  г
                </span>
              </label>
              <PrimaryButton type="submit" disabled={!canAdd} className="shrink-0">
                <Plus className="size-4" aria-hidden />
                <span className="hidden min-[360px]:inline">Добавить в поставку</span>
                <span className="min-[360px]:hidden">Добавить</span>
              </PrimaryButton>
            </div>
          </form>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121110]/85">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <h2 className="font-semibold">
            В поставке{" "}
            <span className="text-sm font-normal text-[var(--aura-muted)]">
              {positions(draft.lines.length)} · {formatGrams(totalGrams)}
            </span>
          </h2>
          {draft.lines.length > 0 ? (
            <button
              type="button"
              onClick={() => setClearOpen(true)}
              className="h-10 shrink-0 rounded-lg px-2 text-xs text-[var(--aura-muted)] transition hover:text-red-300"
            >
              Очистить
            </button>
          ) : null}
        </div>
        {sortedLines.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--aura-muted)]">
            Список пуст — добавьте первую позицию выше.
          </p>
        ) : (
          <ul>
            {sortedLines.map((line, i) => {
              const invalid = !(line.grams > 0 && line.grams <= MAX_GRAMS);
              return (
                <li
                  key={line.key}
                  className={`flex items-center gap-2 px-4 py-2.5 ${i > 0 ? "border-t border-white/6" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] tracking-[0.08em] text-[var(--aura-muted)] uppercase">
                      {line.brandName}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-1.5 text-sm font-medium break-words">
                      {line.flavorName}
                      {line.flavorId ? null : (
                        <span className="rounded bg-sky-500/15 px-1.5 text-[10px] font-medium text-sky-300 uppercase">
                          новый
                        </span>
                      )}
                    </span>
                  </span>
                  <label className="relative w-24 shrink-0">
                    <span className="sr-only">Граммы: {line.flavorName}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_GRAMS}
                      value={line.grams > 0 ? line.grams : ""}
                      onChange={(e) => updateLine(line.key, e.target.value)}
                      className={`h-10 w-full rounded-lg border bg-black/40 pr-6 pl-2 text-right text-base font-semibold tabular-nums outline-none focus:border-[var(--aura-amber)] md:h-9 md:text-sm ${
                        invalid ? "border-red-400/60" : "border-white/12"
                      }`}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-[var(--aura-muted)]">
                      г
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[var(--aura-muted)] transition hover:bg-red-500/10 hover:text-red-300 md:size-9"
                    aria-label={`Убрать: ${line.flavorName}`}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-3 rounded-2xl border border-white/10 bg-[#121110]/85 p-3 md:grid-cols-2 md:p-4">
        <Field label="Поставщик (необязательно)">
          <input
            value={draft.supplier}
            onChange={(e) => setDraft((d) => ({ ...d, supplier: e.target.value }))}
            maxLength={80}
            placeholder="Например: Табак-Опт"
            className={inputClass}
          />
        </Field>
        <Field label="Комментарий (необязательно)">
          <input
            value={draft.note}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            maxLength={300}
            placeholder="Например: накладная № 128"
            className={inputClass}
          />
        </Field>
      </section>

      <ErrorText>{error}</ErrorText>

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 md:bottom-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-[#171411]/95 p-2.5 pl-4 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-[var(--aura-muted)]">
              {positions(draft.lines.length)}
            </span>
            <span className="block truncate font-semibold tabular-nums">
              +{formatGrams(totalGrams)}
            </span>
          </span>
          <PrimaryButton
            type="button"
            disabled={draft.lines.length === 0 || invalidLines.length > 0 || busy}
            onClick={() => setConfirmOpen(true)}
            className="h-12 shrink-0 px-5 text-base md:h-11"
          >
            <PackageCheck className="size-5" aria-hidden />
            Провести
            <span className="hidden min-[380px]:inline">поставку</span>
          </PrimaryButton>
        </div>
      </div>

      {confirmOpen ? (
        <AuraDialog
          open
          onOpenChange={(o) => !busy && setConfirmOpen(o)}
          title="Провести поставку?"
          description={`Остатки на точке «${shortVenueName(venueName)}» увеличатся сразу. Отменить потом можно только расходом.`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-black/35 px-3 py-2.5">
                <p className="text-[10px] tracking-[0.14em] text-[var(--aura-muted)] uppercase">Позиций</p>
                <p className="text-lg font-semibold tabular-nums">{draft.lines.length}</p>
              </div>
              <div className="rounded-xl bg-black/35 px-3 py-2.5">
                <p className="text-[10px] tracking-[0.14em] text-[var(--aura-muted)] uppercase">Всего</p>
                <p className="text-lg font-semibold text-emerald-300 tabular-nums">
                  +{formatGrams(totalGrams)}
                </p>
              </div>
            </div>
            {draft.lines.some((l) => !l.flavorId) ? (
              <p className="text-sm text-sky-300">
                Новые ароматы ({draft.lines.filter((l) => !l.flavorId).length}) появятся на обеих
                точках.
              </p>
            ) : null}
            {draft.supplier.trim() ? (
              <p className="text-sm text-[var(--aura-muted)]">
                Поставщик: <span className="text-[var(--aura-white)]">{draft.supplier.trim()}</span>
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton type="button" disabled={busy} onClick={() => setConfirmOpen(false)}>
                Назад
              </SecondaryButton>
              <PrimaryButton type="button" disabled={busy} onClick={submit}>
                <Check className="size-4" aria-hidden />
                {busy ? "Провожу…" : "Провести"}
              </PrimaryButton>
            </div>
          </div>
        </AuraDialog>
      ) : null}

      {clearOpen ? (
        <AuraDialog
          open
          onOpenChange={setClearOpen}
          title="Очистить список?"
          description="Все внесённые позиции, поставщик и комментарий будут удалены из черновика."
        >
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton type="button" onClick={() => setClearOpen(false)}>
              Отмена
            </SecondaryButton>
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setClearOpen(false);
              }}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-red-500/15 px-4 text-sm font-semibold text-red-300 ring-1 ring-inset ring-red-400/30 transition hover:bg-red-500/25 md:h-10"
            >
              <Trash2 className="size-4" aria-hidden />
              Очистить
            </button>
          </div>
        </AuraDialog>
      ) : null}
    </div>
  );
}

function ExistingPicker({
  query,
  onQuery,
  rows,
  inDraft,
  onPick,
  hideTitle,
}: {
  query: string;
  onQuery: (value: string) => void;
  rows: Array<Flavor & { brandName: string }>;
  inDraft: Map<string, number>;
  onPick: (flavor: Flavor) => void;
  hideTitle?: boolean;
}) {
  const needle = query.trim();
  const visible = needle ? rows.slice(0, 40) : rows.slice(0, 15);
  return (
    <div className="space-y-2">
      {hideTitle ? null : <p className="px-1 text-sm font-medium">Из существующих</p>}
      <SearchBox
        value={query}
        onChange={onQuery}
        placeholder="Найдите аромат или бренд"
      />
      {rows.length === 0 ? (
        <p className="px-1 py-2 text-sm text-[var(--aura-muted)]">
          Заведённых ароматов пока нет. Выберите бренд ниже и впишите новый.
        </p>
      ) : (
        <ul className="max-h-72 overflow-y-auto rounded-xl border border-white/8">
          {visible.map((f, i) => {
            const added = inDraft.get(f.id);
            return (
              <li key={f.id} className={i > 0 ? "border-t border-white/6" : ""}>
                <button
                  type="button"
                  onClick={() => onPick(f)}
                  className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-white/5 active:bg-white/8"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] tracking-[0.08em] text-[var(--aura-muted)] uppercase">
                      {f.brandName}
                    </span>
                    <span className="block text-sm break-words">{f.name}</span>
                  </span>
                  {added ? (
                    <span className="shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-300 tabular-nums">
                      +{formatGrams(added)}
                    </span>
                  ) : null}
                  <span className="shrink-0 text-xs text-[var(--aura-muted)] tabular-nums">
                    {formatGrams(f.grams)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {!needle && rows.length > visible.length ? (
        <p className="px-1 text-xs text-[var(--aura-muted)]">
          Показаны первые {visible.length} из {rows.length}. Начните вводить название, чтобы найти
          остальные.
        </p>
      ) : null}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
  onEnter,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onEnter?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--aura-muted)]"
        aria-hidden
      />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder={placeholder}
        enterKeyHint="done"
        maxLength={80}
        className={`${inputClass} pl-9`}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--aura-muted)] hover:text-[var(--aura-white)]"
          aria-label="Очистить поиск"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </label>
  );
}
