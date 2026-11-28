"use client";

import { Camera, Check, FileUp, PackageCheck, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
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
import { PackPicker } from "@/components/stash/flavor-actions";
import { InvoiceReview } from "@/components/stash/invoice-review";
import { filesToJpegs } from "@/components/stash/sheet-files";
import { positions } from "@/stash/format";
import type { ParsedRow } from "@/stash/invoice";
import {
  formatPerGram,
  formatPrice,
  isPackGrams,
  parsePriceKopecks,
  priceInputValue,
} from "@/stash/packs";
import { formatGrams, shortVenueName } from "@/stash/stock-level";

type Brand = { id: string; name: string };
type Flavor = {
  id: string;
  name: string;
  brandId: string;
  grams: number;
  lineName: string;
  packGrams: number;
  priceKopecks: number | null;
};

type DraftLine = {
  key: string;
  flavorId: string | null;
  brandId: string;
  brandName: string;
  lineName: string;
  flavorName: string;
  packGrams: number;
  priceKopecks: number;
  packs: number;
  grams: number;
};

type Picked = {
  flavorId: string | null;
  name: string;
  lineName: string;
  packGrams: number;
  priceKopecks: number | null;
};

type Draft = { supplier: string; note: string; lines: DraftLine[] };

const PACK_COUNTS = [1, 2, 3, 5, 10];
const MAX_GRAMS = 100_000;
const EMPTY_DRAFT: Draft = { supplier: "", note: "", lines: [] };

const draftKey = (venueSlug: string) => `aura-stash:supply-draft:${venueSlug}`;
const lineKey = (line: Pick<DraftLine, "flavorId" | "brandId" | "lineName" | "flavorName" | "packGrams">) =>
  line.flavorId ??
  `new:${line.brandId}:${line.lineName.trim().toLowerCase()}:${line.flavorName.trim().toLowerCase()}:${line.packGrams}`;

function loadDraft(venueSlug: string, brands: Brand[], flavors: Flavor[]): Draft {
  try {
    const parsed = JSON.parse(localStorage.getItem(draftKey(venueSlug)) ?? "null") as Draft | null;
    if (!parsed || !Array.isArray(parsed.lines)) return EMPTY_DRAFT;
    const brandIds = new Set(brands.map((b) => b.id));
    const flavorById = new Map(flavors.map((f) => [f.id, f]));
    const lines = parsed.lines
      .filter(
        (l) =>
          brandIds.has(l.brandId) &&
          isPackGrams(l.packGrams) &&
          l.packs > 0 &&
          Number.isFinite(l.priceKopecks),
      )
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
  brands: brandList,
  flavors,
  canCreateBrand,
}: {
  venueSlug: string;
  venueName: string;
  brands: Brand[];
  flavors: Flavor[];
  canCreateBrand: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [restored, setRestored] = useState(false);
  const [extraBrands, setExtraBrands] = useState<Brand[]>([]);
  const [sheet, setSheet] = useState<{ supplier: string; document: string; rows: ParsedRow[] } | null>(null);
  const [reading, setReading] = useState<"file" | "sheet" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandQuery, setBrandQuery] = useState("");
  const [flavorQuery, setFlavorQuery] = useState("");
  const [existingQuery, setExistingQuery] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [packs, setPacks] = useState("1");
  const [lineDraft, setLineDraft] = useState("");
  const [packChoice, setPackChoice] = useState(0);
  const [price, setPrice] = useState("");
  const flavorInput = useRef<HTMLInputElement>(null);
  const gramsInput = useRef<HTMLInputElement>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // localStorage only exists in the browser, so the draft is restored after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loadDraft(venueSlug, brandList, flavors));
    setRestored(true);
  }, [venueSlug, brandList, flavors]);

  const brands = useMemo(() => {
    const seen = new Set(brandList.map((brand) => brand.id));
    return [...brandList, ...extraBrands.filter((brand) => !seen.has(brand.id))];
  }, [brandList, extraBrands]);

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
        return `${f.brandName} ${f.lineName} ${f.name}`.toLowerCase().includes(needle);
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
  const totalMoney = draft.lines.reduce((sum, l) => sum + l.priceKopecks * l.packs, 0);
  const invalidLines = draft.lines.filter(
    (l) => !(l.packs > 0 && l.packs <= 500 && l.grams > 0 && l.grams <= MAX_GRAMS),
  );

  const packsValue = Number.parseInt(packs, 10);
  const priceKopecks = parsePriceKopecks(price);
  const positionReady = Boolean(
    picked &&
      (picked.flavorId && isPackGrams(picked.packGrams)
        ? true
        : lineDraft.trim() && packChoice && priceKopecks !== null),
  );
  const canAdd = Boolean(
    brand &&
      positionReady &&
      packsValue > 0 &&
      packsValue <= 500 &&
      (picked?.flavorId && isPackGrams(picked.packGrams)
        ? picked.packGrams * packsValue <= MAX_GRAMS
        : packChoice * packsValue <= MAX_GRAMS),
  );

  function chooseBrand(id: string) {
    setBrandId(id);
    setBrandQuery("");
    setFlavorQuery("");
    setPicked(null);
    requestAnimationFrame(() => flavorInput.current?.focus());
  }

  function pick(next: Picked) {
    setPicked(next);
    setFlavorQuery("");
    setLineDraft(next.lineName);
    setPackChoice(next.packGrams);
    setPrice(priceInputValue(next.priceKopecks));
    setPacks("1");
    requestAnimationFrame(() => gramsInput.current?.focus());
  }

  function pickExisting(flavor: Flavor) {
    setBrandId(flavor.brandId);
    setBrandQuery("");
    setExistingQuery("");
    pick({
      flavorId: flavor.id,
      name: flavor.name,
      lineName: flavor.lineName,
      packGrams: flavor.packGrams,
      priceKopecks: flavor.priceKopecks,
    });
  }

  async function addLine(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canAdd || !brand || !picked) return;
    const complete = Boolean(picked.flavorId && isPackGrams(picked.packGrams));
    const packGrams = complete ? picked.packGrams : packChoice;
    const kopecks = complete ? (picked.priceKopecks ?? 0) : priceKopecks;
    const lineName = complete ? picked.lineName : lineDraft.trim().replace(/\s+/g, " ");
    if (!isPackGrams(packGrams) || kopecks === null) return;

    if (picked.flavorId && !complete) {
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/stash/flavors", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            venueSlug,
            flavorId: picked.flavorId,
            name: picked.name,
            lineName,
            packGrams,
            priceKopecks: kopecks,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(data.error || "Не удалось сохранить позицию");
          return;
        }
      } catch {
        setError("Нет связи с сервером");
        return;
      } finally {
        setBusy(false);
      }
    }

    const next: DraftLine = {
      key: "",
      flavorId: picked.flavorId,
      brandId: brand.id,
      brandName: brand.name,
      lineName,
      flavorName: picked.name,
      packGrams,
      priceKopecks: kopecks,
      packs: packsValue,
      grams: packGrams * packsValue,
    };
    next.key = lineKey(next);

    setDraft((d) => {
      const existing = d.lines.find((l) => l.key === next.key);
      const lines = existing
        ? d.lines.map((l) =>
            l.key === next.key
              ? {
                  ...l,
                  packs: Math.min(500, l.packs + next.packs),
                  grams: Math.min(MAX_GRAMS, l.grams + next.grams),
                }
              : l,
          )
        : [...d.lines, next];
      return { ...d, lines };
    });
    setPicked(null);
    setPacks("1");
    setError("");
    requestAnimationFrame(() => flavorInput.current?.focus());
  }

  function updateLine(key: string, value: string) {
    const n = Number.parseInt(value, 10);
    setDraft((d) => ({
      ...d,
      lines: d.lines.map((l) =>
        l.key === key
          ? { ...l, packs: Number.isFinite(n) ? n : 0, grams: (Number.isFinite(n) ? n : 0) * l.packGrams }
          : l,
      ),
    }));
  }

  function removeLine(key: string) {
    setDraft((d) => ({ ...d, lines: d.lines.filter((l) => l.key !== key) }));
  }

  async function readSheet(list: File[]) {
    if (list.length === 0) return;
    setReading("file");
    setError("");
    try {
      const images = await filesToJpegs(list);
      setReading("sheet");
      const res = await fetch("/api/stash/supplies/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        supplier?: string;
        document?: string;
        rows?: ParsedRow[];
      };
      if (!res.ok || !data.rows?.length) {
        setError(data.error || "Бланк не разобрался");
        return;
      }
      setSheet({ supplier: data.supplier ?? "", document: data.document ?? "", rows: data.rows });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Файл не открылся");
    } finally {
      setReading(null);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  function acceptSheet(rows: ParsedRow[], supplier: string, document: string) {
    setDraft((current) => {
      let lines = [...current.lines];
      for (const row of rows) {
        if (!row.brandId || !isPackGrams(row.packGrams)) continue;
        const brand = brands.find((item) => item.id === row.brandId);
        if (!brand) continue;
        const flavor = flavors.find(
          (item) =>
            item.brandId === row.brandId &&
            item.lineName.trim().toLowerCase() === row.lineName.trim().toLowerCase() &&
            item.name.trim().toLowerCase() === row.flavorName.trim().toLowerCase() &&
            item.packGrams === row.packGrams,
        );
        const next: DraftLine = {
          key: "",
          flavorId: flavor?.id ?? null,
          brandId: brand.id,
          brandName: brand.name,
          lineName: row.lineName.trim(),
          flavorName: row.flavorName.trim(),
          packGrams: row.packGrams,
          priceKopecks: row.priceKopecks,
          packs: row.packs,
          grams: row.packGrams * row.packs,
        };
        next.key = lineKey(next);
        const existing = lines.find((line) => line.key === next.key);
        lines = existing
          ? lines.map((line) =>
              line.key === next.key
                ? {
                    ...line,
                    packs: Math.min(500, line.packs + next.packs),
                    grams: Math.min(MAX_GRAMS, line.grams + next.grams),
                    priceKopecks: next.priceKopecks,
                  }
                : line,
            )
          : [...lines, next];
      }
      return {
        ...current,
        lines,
        supplier: current.supplier.trim() || supplier.slice(0, 80),
        note: current.note.trim() || (document ? `Бланк ${document}`.slice(0, 300) : current.note),
      };
    });
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
              ? { flavorId: l.flavorId, packs: l.packs, priceKopecks: l.priceKopecks }
              : {
                  brandId: l.brandId,
                  lineName: l.lineName,
                  newFlavorName: l.flavorName,
                  packGrams: l.packGrams,
                  priceKopecks: l.priceKopecks,
                  packs: l.packs,
                },
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
      <section className="rounded-2xl border border-white/10 bg-[#121110]/85 p-3 md:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[11px] tracking-[0.2em] text-[var(--aura-muted)] uppercase">Бланк</h2>
            <p className="mt-1 text-sm text-[var(--aura-muted)]">
              Сфотографируйте таблицу или выберите PDF, JPG, PNG, HEIC. Можно несколько страниц, до
              трёх. Сначала проверка. На склад — только после «Провести».
            </p>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readSheet([file]);
            }}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = e.target.files ? [...e.target.files] : [];
              if (files.length) void readSheet(files);
            }}
          />
          <div className="grid grid-cols-2 gap-2 sm:w-auto">
            <SecondaryButton
              type="button"
              disabled={reading !== null}
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="size-4" aria-hidden />
              {reading === "file" ? "Готовлю…" : "Фото"}
            </SecondaryButton>
            <SecondaryButton
              type="button"
              disabled={reading !== null}
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="size-4" aria-hidden />
              {reading === "sheet" ? "Читаю…" : "Файл"}
            </SecondaryButton>
          </div>
        </div>
        {reading ? (
          <p className="mt-3 text-sm text-[#f0a65a]">
            {reading === "file" ? "Готовлю страницы…" : "Читаю бланк…"}
          </p>
        ) : null}
      </section>

      {sheet ? (
        <InvoiceReview
          supplier={sheet.supplier}
          document={sheet.document}
          rows={sheet.rows}
          brands={brands}
          flavors={flavors}
          canCreateBrand={canCreateBrand}
          onDismiss={() => setSheet(null)}
          onAccept={acceptSheet}
          onBrandCreated={(brand) =>
            setExtraBrands((current) => (current.some((item) => item.id === brand.id) ? current : [...current, brand]))
          }
        />
      ) : null}

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
                if (exactMatch) pickExisting(exactMatch);
                else if (typedName) {
                  pick({
                    flavorId: null,
                    name: typedName,
                    lineName: "",
                    packGrams: 0,
                    priceKopecks: null,
                  });
                }
              }}
            />
            <ul className="max-h-80 overflow-y-auto rounded-xl border border-white/8">
              {typedName && !exactMatch ? (
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      pick({
                        flavorId: null,
                        name: typedName,
                        lineName: "",
                        packGrams: 0,
                        priceKopecks: null,
                      })
                    }
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
                      onClick={() => pickExisting(f)}
                      className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-white/5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm break-words">{f.name}</span>
                        <span className="block text-[11px] text-[var(--aura-muted)]">
                          {f.lineName || "без линейки"}
                          {" · "}
                          {f.packGrams ? `${f.packGrams} г` : "нет грамовки"}
                          {" · "}
                          {formatPrice(f.priceKopecks)}
                        </span>
                      </span>
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
                  {picked.flavorId ? picked.lineName || "Аромат" : "Новая позиция"}
                </span>
                <span className="block font-semibold break-words">{picked.name}</span>
                {isPackGrams(picked.packGrams) ? (
                  <span className="block text-xs text-[var(--aura-muted)] tabular-nums">
                    {picked.packGrams} г · {formatPrice(picked.priceKopecks)} за пачку
                    {picked.priceKopecks != null ? ` · ${formatPerGram(picked.priceKopecks, picked.packGrams)}` : ""}
                  </span>
                ) : null}
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
            {!(picked.flavorId && isPackGrams(picked.packGrams)) ? (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-[var(--aura-muted)]">Линейка</span>
                  <input
                    value={lineDraft}
                    onChange={(e) => setLineDraft(e.target.value)}
                    required
                    maxLength={40}
                    placeholder="Например: Core"
                    className={inputClass}
                  />
                </label>
                <PackPicker value={packChoice} onChange={setPackChoice} />
                <label className="relative block">
                  <span className="mb-1.5 block text-xs text-[var(--aura-muted)]">Цена за 1 пачку, ₽</span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    inputMode="decimal"
                    placeholder="890"
                    className={inputClass}
                  />
                  {priceKopecks != null && packChoice > 0 ? (
                    <span className="mt-1 block text-xs text-[var(--aura-muted)] tabular-nums">
                      {formatPerGram(priceKopecks, packChoice)}
                    </span>
                  ) : null}
                </label>
              </>
            ) : null}
            <p className="px-1 text-xs text-[var(--aura-muted)]">Сколько пачек пришло</p>
            <div className="grid grid-cols-5 gap-1.5">
              {PACK_COUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setPacks(String(q))}
                  className={`h-11 rounded-lg border text-sm tabular-nums transition active:scale-95 md:h-10 ${
                    packsValue === q
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
                <span className="sr-only">Число пачек</span>
                <input
                  ref={gramsInput}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={500}
                  value={packs}
                  onChange={(e) => setPacks(e.target.value)}
                  placeholder="Пачек"
                  className={`${inputClass} pr-16 text-lg font-semibold tabular-nums md:text-base`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[var(--aura-muted)]">
                  пач.
                </span>
              </label>
              <PrimaryButton type="submit" disabled={!canAdd || busy} className="shrink-0">
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
                      {line.lineName ? ` · ${line.lineName}` : ""}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-1.5 text-sm font-medium break-words">
                      {line.flavorName}
                      <span className="text-xs font-normal text-[var(--aura-muted)] tabular-nums">
                        {line.packGrams} г · {formatPrice(line.priceKopecks)} · {formatPerGram(line.priceKopecks, line.packGrams)}
                      </span>
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
                      value={line.packs > 0 ? line.packs : ""}
                      onChange={(e) => updateLine(line.key, e.target.value)}
                      className={`h-10 w-full rounded-lg border bg-black/40 pr-6 pl-2 text-right text-base font-semibold tabular-nums outline-none focus:border-[var(--aura-amber)] md:h-9 md:text-sm ${
                        invalid ? "border-red-400/60" : "border-white/12"
                      }`}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-[var(--aura-muted)]">
                      пач.
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
            <p className="text-sm text-[var(--aura-muted)]">
              По ценам пачек: <span className="text-[var(--aura-white)] tabular-nums">{formatPrice(totalMoney)}</span>
            </p>
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
                      {f.lineName ? ` · ${f.lineName}` : ""}
                    </span>
                    <span className="block text-sm break-words">
                      {f.name}
                      <span className="ml-1.5 text-xs font-normal text-[var(--aura-muted)]">
                        {f.packGrams ? `${f.packGrams} г · ${formatPrice(f.priceKopecks)}` : "без грамовки"}
                      </span>
                    </span>
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
