"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { ErrorText, inputClass, PrimaryButton, SecondaryButton } from "@/components/stash/kit";
import { rowReady, type ParsedRow } from "@/stash/invoice";
import { formatPerGram, formatPrice, isPackGrams, PACK_GRAMS, parsePriceKopecks, priceInputValue } from "@/stash/packs";

type Brand = { id: string; name: string };
type Flavor = { id: string; brandId: string; name: string; lineName: string; packGrams: number };

type EditRow = ParsedRow & { id: string; include: boolean; price: string };

function onShelf(row: ParsedRow, flavors: Flavor[]) {
  if (!row.brandId) return false;
  const line = row.lineName.trim().toLowerCase();
  const name = row.flavorName.trim().toLowerCase();
  return flavors.some(
    (flavor) =>
      flavor.brandId === row.brandId &&
      flavor.lineName.trim().toLowerCase() === line &&
      flavor.name.trim().toLowerCase() === name &&
      flavor.packGrams === row.packGrams,
  );
}

export function InvoiceReview({
  supplier,
  document,
  rows,
  brands,
  flavors,
  canCreateBrand,
  onDismiss,
  onAccept,
  onBrandCreated,
}: {
  supplier: string;
  document: string;
  rows: ParsedRow[];
  brands: Brand[];
  flavors: Flavor[];
  canCreateBrand: boolean;
  onDismiss: () => void;
  onAccept: (rows: ParsedRow[], supplier: string, document: string) => void;
  onBrandCreated: (brand: Brand) => void;
}) {
  const [items, setItems] = useState<EditRow[]>(() =>
    rows.map((row, index) => ({
      ...row,
      id: `${index}-${row.flavorName}`,
      include: true,
      price: priceInputValue(row.priceKopecks),
    })),
  );
  const [supplierName, setSupplierName] = useState(supplier);
  const [docName, setDocName] = useState(document);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState("");

  function patch(id: string, next: Partial<EditRow>) {
    setItems((current) => current.map((row) => (row.id === id ? { ...row, ...next } : row)));
  }

  function commitPrice(row: EditRow) {
    const kopecks = parsePriceKopecks(row.price);
    patch(row.id, { priceKopecks: kopecks ?? 0, price: kopecks ? priceInputValue(kopecks) : row.price });
  }

  async function createBrand(row: EditRow) {
    const name = row.brandName.trim();
    if (!name) return;
    setCreating(row.id);
    setError("");
    try {
      const res = await fetch("/api/stash/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error || "Не удалось добавить бренд");
        return;
      }
      const brand = { id: data.id, name };
      onBrandCreated(brand);
      setItems((current) =>
        current.map((item) =>
          item.brandName.trim().toLowerCase() === name.toLowerCase() ? { ...item, brandId: brand.id, brandName: name } : item,
        ),
      );
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setCreating("");
    }
  }

  function accept() {
    const chosen = items
      .map((row) => {
        const kopecks = parsePriceKopecks(row.price);
        return kopecks == null ? row : { ...row, priceKopecks: kopecks };
      })
      .filter((row) => row.include);
    if (chosen.length === 0) {
      setError("Отметьте хотя бы одну строку");
      return;
    }
    const ready = chosen.filter((row) => rowReady(row));
    if (ready.length === 0) {
      setError("У строк нет бренда. Выберите его или снимите строку.");
      return;
    }
    const skipped = chosen.length - ready.length;
    onAccept(
      ready.map(({ brandName, brandId, lineName, flavorName, packGrams, packs, priceKopecks }) => ({
        brandName,
        brandId,
        lineName: lineName.trim(),
        flavorName: flavorName.trim(),
        packGrams,
        packs,
        priceKopecks,
      })),
      supplierName.trim(),
      docName.trim(),
    );
    if (skipped > 0) {
      setError(`В список ушли ${ready.length}. Ещё ${skipped} без бренда — допишите и добавьте следом.`);
      setItems((current) => current.filter((row) => row.include && !rowReady(row)));
      return;
    }
    onDismiss();
  }

  const readyCount = items.filter((row) => row.include && rowReady(row)).length;
  const included = items.filter((row) => row.include);
  const packTotal = included.reduce((sum, row) => sum + (row.packs > 0 ? row.packs : 0), 0);
  const moneyKopecks = included.reduce((sum, row) => {
    const kopecks = parsePriceKopecks(row.price) ?? 0;
    return sum + kopecks * (row.packs > 0 ? row.packs : 0);
  }, 0);

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--aura-amber)]/40 bg-[#121110]/85 p-3 md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Проверка бланка</h2>
          <p className="mt-1 text-sm text-[var(--aura-muted)]">
            На склад ещё ничего не записано. Сверьте линейку, граммы, число пачек и цену одной
            пачки. Рубль за грамм считается из этой цены. На склад строки попадут после «Провести».
          </p>
          <p className="mt-2 text-sm tabular-nums">
            {included.length} строк · {packTotal} пачек · {formatPrice(moneyKopecks)}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[var(--aura-muted)] hover:bg-white/8"
          aria-label="Закрыть проверку"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--aura-muted)]">Поставщик</span>
          <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} maxLength={80} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--aura-muted)]">Номер бланка</span>
          <input value={docName} onChange={(e) => setDocName(e.target.value)} maxLength={40} className={inputClass} />
        </label>
      </div>

      <ul className="space-y-3">
        {items.map((row, index) => {
          const known = onShelf(row, flavors);
          const shownPrice = parsePriceKopecks(row.price) ?? row.priceKopecks;
          const perGram = isPackGrams(row.packGrams) ? formatPerGram(shownPrice, row.packGrams) : "—";
          return (
            <li key={row.id} className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex min-h-10 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) => patch(row.id, { include: e.target.checked })}
                    className="size-4 accent-[var(--aura-amber)]"
                  />
                  Строка {index + 1}
                </label>
                <span className="text-xs text-[var(--aura-muted)]">
                  {known ? "уже на складе" : "новая позиция"}
                  {" · "}
                  {perGram}
                </span>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--aura-muted)]">Бренд</span>
                <select
                  value={row.brandId ?? ""}
                  onChange={(e) => {
                    const brand = brands.find((item) => item.id === e.target.value);
                    patch(row.id, { brandId: brand?.id ?? null, brandName: brand?.name ?? row.brandName });
                  }}
                  className={inputClass}
                >
                  <option value="">{row.brandId ? "Выберите бренд" : `На бланке: ${row.brandName || "не найден"}`}</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>
              {!row.brandId && canCreateBrand && row.brandName ? (
                <SecondaryButton type="button" disabled={creating === row.id} onClick={() => createBrand(row)} className="w-full">
                  {creating === row.id ? "Добавляю…" : `Добавить бренд «${row.brandName}»`}
                </SecondaryButton>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--aura-muted)]">Линейка</span>
                  <input
                    value={row.lineName}
                    onChange={(e) => patch(row.id, { lineName: e.target.value })}
                    maxLength={40}
                    placeholder="Classic, Black, Саботаж"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--aura-muted)]">Аромат</span>
                  <input
                    value={row.flavorName}
                    onChange={(e) => patch(row.id, { flavorName: e.target.value })}
                    maxLength={80}
                    className={inputClass}
                  />
                </label>
              </div>
              {!row.lineName.trim() ? (
                <p className="text-xs text-[#f0a65a]">
                  Линейки на бланке нет. У Sebero это Classic или Black — впишите, если она есть.
                  Пустую можно оставить.
                </p>
              ) : null}
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--aura-muted)]">Граммы</span>
                  <select
                    value={isPackGrams(row.packGrams) ? row.packGrams : ""}
                    onChange={(e) => patch(row.id, { packGrams: Number(e.target.value) })}
                    className={inputClass}
                  >
                    {PACK_GRAMS.map((grams) => (
                      <option key={grams} value={grams}>
                        {grams}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--aura-muted)]">Пачек</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={500}
                    value={row.packs}
                    onChange={(e) => patch(row.id, { packs: Number.parseInt(e.target.value, 10) || 0 })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--aura-muted)]">Цена пачки</span>
                  <input
                    inputMode="decimal"
                    value={row.price}
                    onChange={(e) => patch(row.id, { price: e.target.value })}
                    onBlur={() => commitPrice(row)}
                    className={inputClass}
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ul>

      <ErrorText>{error}</ErrorText>
      <div className="grid grid-cols-2 gap-2">
        <SecondaryButton type="button" onClick={onDismiss}>
          Не сейчас
        </SecondaryButton>
        <PrimaryButton type="button" onClick={accept} disabled={readyCount === 0}>
          <Check className="size-4" aria-hidden />
          В список · {readyCount}
        </PrimaryButton>
      </div>
    </section>
  );
}
