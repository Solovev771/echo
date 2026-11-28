import path from "path";
import { createWorker, PSM } from "tesseract.js";
import {
  parseSupplyText,
  rowsFromModel,
  type KnownBrand,
  type ModelRow,
  type ParsedSheet,
} from "./invoice";

const LANG_PATH = path.join(process.cwd(), "src/stash/tessdata");

function decodeImage(dataUrl: string): Buffer {
  const base = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl;
  return Buffer.from(base, "base64");
}

async function pageText(images: Buffer[]): Promise<string> {
  const worker = await createWorker("rus+eng", 1, {
    langPath: LANG_PATH,
    gzip: true,
    cachePath: "/tmp/aura-tess",
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const parts: string[] = [];
    for (const image of images) {
      const { data } = await worker.recognize(image);
      parts.push(data.text);
    }
    return parts.join("\n");
  } finally {
    await worker.terminate();
  }
}

async function modelSheet(images: string[], brands: KnownBrand[]): Promise<ParsedSheet | null> {
  const key = process.env.AURA_AI_API_KEY?.trim();
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35_000);
  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "Ты читаешь заказ или счёт-фактуру кальянного табака и возвращаешь JSON.",
              "Поля: supplier (строка), document (номер бланка), rows (массив).",
              "Каждая строка: brand, line, name, packGrams, packs, priceRub.",
              "brand — бренд. line — линейка, если она написана (Classic, Black, Саботаж, Кор, Экспириенс, 360, Platinum, Cigar, KL, Medium). У Sebero Classic и Black — разные линейки. Если линейки нет, line пустая строка. Не выдумывай Classic.",
              "name — аромат по-русски, без бренда, без линейки и без английского имени в скобках.",
              "packGrams — граммы одной пачки: 20, 25, 40, 80, 100, 120, 160, 200 или 250. 25 — настоящая пачка, не ошибка. packs — сколько пачек, не граммы.",
              "priceRub — цена одной пачки, которую платят. Если есть сумма с НДС, раздели её на число пачек. Не подставляй сумму всей строки. Рубль за грамм потом считается как эта цена, делённая на граммы пачки.",
              "Бренды склада: " + brands.map((brand) => brand.name).join(", ") + ".",
            ].join(" "),
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Прочитай все позиции с этих страниц." },
              ...images.map((url) => ({ type: "image_url", image_url: { url } })),
            ],
          },
        ],
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) return null;
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end < start) return null;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      supplier?: unknown;
      document?: unknown;
      rows?: unknown;
    };
    if (!Array.isArray(parsed.rows)) return null;
    return {
      supplier: typeof parsed.supplier === "string" ? parsed.supplier.trim().slice(0, 80) : "",
      document: typeof parsed.document === "string" ? parsed.document.trim().slice(0, 40) : "",
      rows: rowsFromModel(parsed.rows as ModelRow[], brands),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function readSupplyImages(
  images: string[],
  brands: KnownBrand[],
): Promise<ParsedSheet & { reader: "model" | "page" }> {
  const fromModel = await modelSheet(images, brands);
  if (fromModel && fromModel.rows.length > 0) return { ...fromModel, reader: "model" };
  const text = await pageText(images.map(decodeImage));
  return { ...parseSupplyText(text, brands), reader: "page" };
}
