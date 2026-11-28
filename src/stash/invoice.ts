import { isPackGrams, type PackGrams } from "./packs";

export type KnownBrand = { id: string; name: string };

export type ParsedRow = {
  brandName: string;
  brandId: string | null;
  lineName: string;
  flavorName: string;
  packGrams: number;
  packs: number;
  priceKopecks: number;
};

export type ParsedSheet = {
  supplier: string;
  document: string;
  rows: ParsedRow[];
};

type BrandRule = { keys: string[]; canon: string };

/** How a printed brand name lands on a warehouse brand. Longest key wins. */
const BRAND_RULES: BrandRule[] = [
  { keys: ["darkside", "дарксайд", "дарк сайд", "дарксаид"], canon: "Darkside" },
  { keys: ["blackburn", "блэкберн", "блекберн", "black burn", "blackbum"], canon: "BlackBurn" },
  { keys: ["сарма", "sarma"], canon: "Сарма" },
  { keys: ["sebero", "северо", "себера"], canon: "Sebero" },
  { keys: ["spectrum", "спектрум"], canon: "Spectrum" },
  { keys: ["satyr", "сатир"], canon: "Satyr" },
  { keys: ["wave", "вейв", "вэйв"], canon: "Wave" },
  { keys: ["jent", "джент", "жент"], canon: "Jent" },
  { keys: ["kraken", "кракен"], canon: "Kraken" },
  { keys: ["musthave", "мастхэв", "маст хэв"], canon: "MustHave" },
  { keys: ["starline", "старлайн"], canon: "Starline" },
  { keys: ["bonche", "бонче"], canon: "Bonche" },
  { keys: ["element", "элемент"], canon: "Element" },
  { keys: ["dogma", "догма"], canon: "Dogma" },
  { keys: ["antagonist", "антагонист"], canon: "Antagonist" },
];

const LINE_WORDS: { re: RegExp; name: string }[] = [
  { re: /(^|[^a-zа-яё0-9])360(?=$|[^a-zа-яё0-9])/i, name: "360" },
  { re: /(^|[^a-zа-яё])platinum(?=$|[^a-zа-яё])/i, name: "Platinum" },
  { re: /(^|[^a-zа-яё])(?:classic|классик)(?=$|[^a-zа-яё])/i, name: "Classic" },
  { re: /(^|[^a-zа-яё])black(?=$|[^a-zа-яё])/i, name: "Black" },
  { re: /(^|[^a-zа-яё])саботаж(?=$|[^a-zа-яё])/i, name: "Саботаж" },
  { re: /(^|[^a-zа-яё])экспириенс(?=$|[^a-zа-яё])/i, name: "Экспириенс" },
  { re: /(^|[^a-zа-яё])(?:кор|kop|kor)(?=$|[^a-zа-яё])/i, name: "Кор" },
  { re: /(^|[^a-zа-яё])cigar(?=$|[^a-zа-яё])/i, name: "Cigar" },
  { re: /(^|[^a-zа-яё])medium(?=$|[^a-zа-яё])/i, name: "Medium" },
  { re: /(^|[^a-zа-яё])kl(?=$|[^a-zа-яё])/i, name: "KL" },
];

const fold = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[«»"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function tidyLine(raw: string): string {
  const folded = fold(raw);
  const known = LINE_WORDS.find((word) => fold(word.name) === folded);
  return known?.name ?? tidyName(raw);
}

function tidyName(raw: string): string {
  const clean = raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/,?\s*\d{2,3}\s*г(?:р|рамм\w*)?\.?/gi, " ")
    .replace(/\d+\s*шт(?=$|\s)/gi, " ")
    .replace(/\d+\s*%/g, " ")
    .replace(/(^|[^\p{L}])(?:крепк\p{L}*|л[её]гк\p{L}*|seco|collection|шт)(?=$|[^\p{L}])/giu, " ")
    .replace(/(^|\s)\d{1,2}(?=\s|$)/g, " ")
    .replace(/[;:]+|(?<!\d)[,.]|[,.](?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  const letters = clean.replace(/[^a-zа-яё]/gi, "");
  const text = letters && letters === letters.toUpperCase() ? clean.toLowerCase() : clean;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function findBrand(text: string): { canon: string; key: string } | null {
  const folded = fold(text);
  let best: { canon: string; key: string } | null = null;
  for (const rule of BRAND_RULES) {
    for (const key of rule.keys) {
      if (!folded.includes(key)) continue;
      if (!best || key.length > best.key.length) best = { canon: rule.canon, key };
    }
  }
  return best;
}

function cutBrand(title: string, key: string): string {
  const pattern = key
    .split(" ")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const hit = new RegExp(pattern, "i").exec(title);
  if (!hit) return title;
  return title.slice(hit.index + hit[0].length);
}

function matchWarehouseBrand(canon: string, brands: KnownBrand[]): KnownBrand | null {
  const key = fold(canon);
  return brands.find((brand) => fold(brand.name) === key) ?? null;
}

/** Split a printed title into brand, line and aroma. Grams stay on the title until removed. */
export function splitTitle(title: string): { brandName: string; lineName: string; flavorName: string } {
  const brand = findBrand(title);
  const brandName = brand?.canon ?? "";
  const rest = (brand ? cutBrand(title, brand.key) : title).replace(/^[\s"«»\-–—:]+/, "");

  let lineName = "";
  for (const word of LINE_WORDS) {
    const hit = word.re.exec(fold(rest));
    if (!hit) continue;
    lineName = word.name;
    break;
  }

  let nameSource = rest;
  const aroma = rest.match(/ароматом\s+(.+)$/i);
  const dash = rest.match(/[-–—]\s+(.+)$/);
  const paren = rest.match(/\(([^)]+)\)/);
  if (aroma) nameSource = aroma[1];
  else if (dash) nameSource = dash[1];
  else if (paren && /[а-яё]/i.test(paren[1])) nameSource = paren[1];
  else {
    nameSource = rest.replace(lineName, " ");
  }

  return { brandName, lineName, flavorName: tidyName(nameSource).slice(0, 80) };
}

type MoneyScan = { amounts: number[]; qtyHint: number | null };

function closeTo(value: number, target: number) {
  return target > 0 && Math.abs(value - target) / target < 0.03;
}

/**
 * A space in "1 206,97" is a thousands separator.
 * A space in "4 436,07" is a pack count sitting in front of 436,07,
 * which we notice because 4 × 436,07 appears later as a line sum.
 */
function scanMoney(text: string): MoneyScan {
  const raw: number[] = [];
  const re = /(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)[.,](\d{2})(?!\d)/g;
  for (const hit of text.matchAll(re)) raw.push(Number(`${hit[1].replace(/[ \u00a0]/g, "")}.${hit[2]}`));

  const amounts: number[] = [];
  let qtyHint: number | null = null;
  const re2 = /(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)[.,](\d{2})(?!\d)/g;
  for (const hit of text.matchAll(re2)) {
    const whole = hit[1];
    const fraction = Number(hit[2]) / 100;
    const grouped = whole.match(/^(\d{1,2})[ \u00a0](\d{3})$/);
    if (grouped) {
      const qty = Number(grouped[1]);
      const small = Number(grouped[2]) + fraction;
      const big = Number(`${grouped[1]}${grouped[2]}`) + fraction;
      const supported = qty >= 1 && qty <= 40 && raw.some((amount) => closeTo(amount, qty * small));
      if (supported) {
        amounts.push(small);
        qtyHint = qty;
        continue;
      }
      amounts.push(big);
      continue;
    }
    const rubles = Number(whole.replace(/[ \u00a0]/g, "")) + fraction;
    if (rubles > 0 && rubles <= 1_000_000) amounts.push(rubles);
  }
  return { amounts, qtyHint };
}

function packSize(text: string): PackGrams | 0 {
  const hits = [...text.matchAll(/(\d{2,3})\s*г(?:р|рамм\w*)?/gi)];
  for (const hit of hits) {
    const grams = Number(hit[1]);
    if (isPackGrams(grams)) return grams;
  }
  return 0;
}

function hasMoney(text: string) {
  return /(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)[.,]\d{2}(?!\d)/.test(text);
}

function pieceCount(text: string, amounts: number[], qtyHint: number | null): number {
  const sht = text.match(/(\d{1,3})\s*шт/i);
  if (sht) {
    const n = Number(sht[1]);
    if (n >= 1 && n <= 500) return n;
  }
  if (qtyHint) return qtyHint;
  if (amounts.length >= 2 && amounts[0] > 0) {
    for (let i = 1; i < amounts.length; i += 1) {
      const q = Math.round(amounts[i] / amounts[0]);
      if (q >= 1 && q <= 40 && closeTo(amounts[0] * q, amounts[i])) return q;
    }
  }
  return 1;
}

/** Price of one pack, in kopecks. Prefer what the buyer pays when VAT is a separate column. */
function unitKopecks(amounts: number[], packs: number): number {
  if (amounts.length === 0) return 0;
  const first = amounts[0];
  const last = amounts[amounts.length - 1];
  const paid = packs > 0 ? last / packs : last;
  const usePaid = paid > first * 1.05 && paid < first * 1.4;
  const rubles = usePaid ? paid : first;
  return Math.round(rubles * 100);
}

function parseBlock(block: string, brands: KnownBrand[]): ParsedRow | null {
  const grams = packSize(block);
  const money = scanMoney(block);
  const amounts = money.amounts;
  if (!grams || amounts.length === 0) return null;
  const packs = pieceCount(block, amounts, money.qtyHint);
  const priceKopecks = unitKopecks(amounts, packs);
  if (priceKopecks <= 0) return null;
  const title = block.replace(/(\d{1,3}(?:[ \u00a0]\d{3})*|\d+)[.,]\d{2}/g, " ");
  const split = splitTitle(title);
  if (!split.brandName || !split.flavorName) return null;
  const known = matchWarehouseBrand(split.brandName, brands);
  return {
    brandName: known?.name ?? split.brandName,
    brandId: known?.id ?? null,
    lineName: split.lineName.slice(0, 40),
    flavorName: split.flavorName,
    packGrams: grams,
    packs,
    priceKopecks,
  };
}

function blocksFromText(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const blocks: string[] = [];
  let buf = "";
  for (const line of lines) {
    buf = `${buf} ${line}`.trim();
    if (packSize(buf) && hasMoney(buf)) {
      blocks.push(buf);
      buf = "";
    } else if (buf.length > 400) {
      buf = "";
    }
  }
  return blocks;
}

export function parseSupplyText(text: string, brands: KnownBrand[]): ParsedSheet {
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();
  for (const block of blocksFromText(text)) {
    const row = parseBlock(block, brands);
    if (!row) continue;
    const key = `${fold(row.brandName)}|${fold(row.lineName)}|${fold(row.flavorName)}|${row.packGrams}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  const supplierHit = text.match(/ООО\s*[«"]([^»"]{2,60})[»"]/i);
  const documentHit = text.match(/(?:№|N)\s*([A-ZА-Я0-9-]{4,})/i);
  return {
    supplier: supplierHit ? `ООО «${supplierHit[1].trim()}»` : "",
    document: documentHit?.[1] ?? "",
    rows: rows.slice(0, 80),
  };
}

export type ModelRow = {
  brand?: unknown;
  line?: unknown;
  name?: unknown;
  packGrams?: unknown;
  packs?: unknown;
  priceRub?: unknown;
};

export function rowsFromModel(rows: ModelRow[], brands: KnownBrand[]): ParsedRow[] {
  const out: ParsedRow[] = [];
  for (const row of rows) {
    const brandRaw = typeof row.brand === "string" ? row.brand.trim() : "";
    const lineRaw = typeof row.line === "string" ? row.line.trim() : "";
    const nameRaw = typeof row.name === "string" ? row.name.trim() : "";
    const grams = typeof row.packGrams === "number" ? row.packGrams : Number(row.packGrams);
    const packs = typeof row.packs === "number" ? row.packs : Number(row.packs);
    const priceRub = typeof row.priceRub === "number" ? row.priceRub : Number(row.priceRub);
    if (!brandRaw || !nameRaw || !isPackGrams(grams)) continue;
    if (!Number.isFinite(packs) || packs < 1 || packs > 500) continue;
    if (!Number.isFinite(priceRub) || priceRub <= 0 || priceRub > 1_000_000) continue;
    const split = splitTitle(`${brandRaw} ${lineRaw} ${nameRaw}`);
    const brandName = split.brandName || tidyName(brandRaw);
    const known = matchWarehouseBrand(brandName, brands);
    const flavorName = (split.flavorName || tidyName(nameRaw)).slice(0, 80);
    if (!flavorName) continue;
    out.push({
      brandName: known?.name ?? brandName,
      brandId: known?.id ?? null,
      lineName: (lineRaw ? tidyLine(lineRaw) : split.lineName).slice(0, 40),
      flavorName,
      packGrams: grams,
      packs: Math.round(packs),
      priceKopecks: Math.round(priceRub * 100),
    });
  }
  return out.slice(0, 80);
}

export function rowReady(row: ParsedRow): boolean {
  return Boolean(
    row.brandId &&
      row.flavorName.trim() &&
      isPackGrams(row.packGrams) &&
      row.packs >= 1 &&
      row.packs <= 500 &&
      row.priceKopecks > 0,
  );
}
