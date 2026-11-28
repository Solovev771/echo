import { and, desc, eq, gt } from "drizzle-orm";
import { specialMixes } from "@/data/mixes";
import { db } from "./db";
import { id } from "./ids";
import { mixes, stock, type MixSource, type MixStatus } from "./schema";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const NAMES = [
  "Порог",
  "Комната",
  "Берег",
  "Даль",
  "Поле",
  "Север",
  "Кромка",
  "Дыхание",
  "Окно",
  "Полдень",
  "Тихий свет",
  "Внутренний двор",
];

const ZONES = [
  "Нейтральный сектор · вход",
  "Зелёный сектор",
  "Сине-фиолетовый сектор",
  "Солнечный сектор",
];

export type ShelfFlavor = { name: string; brand: string; grams: number };

export type ComposedMix = {
  name: string;
  zone: string;
  character: string;
  profile: string;
  story: string;
  notes: string[];
  source: MixSource;
};

export function parseNoteNames(raw: string): string[] {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.flatMap((item) => {
      if (typeof item === "string" && item.trim()) return [item.trim()];
      if (item && typeof item === "object" && "name" in item && typeof (item as { name: unknown }).name === "string") {
        const name = (item as { name: string }).name.trim();
        return name ? [name] : [];
      }
      return [];
    });
  } catch {
    return [];
  }
}

export async function shelfFlavors(venueId: string): Promise<ShelfFlavor[]> {
  const [flavorRows, stockRows, brandRows] = await Promise.all([
    db().query.flavors.findMany(),
    db().query.stock.findMany({ where: and(eq(stock.venueId, venueId), gt(stock.grams, 0)) }),
    db().query.brands.findMany(),
  ]);
  const brandName = new Map(brandRows.map((b) => [b.id, b.name]));
  const grams = new Map(stockRows.map((s) => [s.flavorId, s.grams]));
  const byName = new Map<string, ShelfFlavor>();
  for (const flavor of flavorRows) {
    const have = grams.get(flavor.id) ?? 0;
    if (have <= 0) continue;
    const key = flavor.name.trim().toLowerCase();
    const current = byName.get(key);
    if (!current || have > current.grams) {
      byName.set(key, { name: flavor.name.trim(), brand: brandName.get(flavor.brandId) ?? "", grams: have });
    }
  }
  return [...byName.values()].sort((a, b) => b.grams - a.grams || a.name.localeCompare(b.name, "ru"));
}

function takenNames(extra: string[]) {
  return new Set(
    [...specialMixes.map((mix) => mix.name), ...extra].map((name) => name.trim().toLowerCase()),
  );
}

function noteKey(notes: string[]) {
  return notes
    .map((note) => note.toLowerCase())
    .sort()
    .join("|");
}

function shelfCompose(available: ShelfFlavor[], usedNames: string[], usedSets: Set<string>, index: number): ComposedMix {
  const unique = available.map((item) => item.name);
  const width = Math.min(4, unique.length >= 4 && index % 2 === 1 ? 4 : 3);
  let chosen: string[] = [];
  for (let shift = 0; shift < unique.length; shift += 1) {
    const start = (index + shift) % unique.length;
    const notes = Array.from({ length: width }, (_, i) => unique[(start + i) % unique.length]);
    if (new Set(notes.map((note) => note.toLowerCase())).size < width) continue;
    if (usedSets.has(noteKey(notes))) continue;
    chosen = notes;
    break;
  }
  if (chosen.length === 0) {
    chosen = unique.slice(0, width);
  }
  const name = NAMES.find((candidate) => !usedNames.includes(candidate.toLowerCase())) ?? `Чаша ${index + 1}`;
  const [a, b, c, d] = chosen;
  const zone = ZONES[index % ZONES.length];
  const story = d
    ? `${a} держит низ, ${b} открывает середину, ${c} и ${d} остаются после. Не разгоняй — дай чаше самой дойти.`
    : `${a} держит, ${b} раскрывает, ${c} закрывает. Три ноты — и хватит. Не спеши.`;
  return {
    name,
    zone,
    character: "С полки · спокойно",
    profile: chosen.join(", "),
    story,
    notes: chosen,
    source: "shelf",
  };
}

function clip(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() : clean;
}

function matchNote(note: string, available: ShelfFlavor[]) {
  const key = note.trim().toLowerCase();
  return available.find((item) => item.name.toLowerCase() === key)?.name ?? null;
}

async function modelCompose(
  available: ShelfFlavor[],
  usedNames: string[],
): Promise<ComposedMix | null> {
  const key = process.env.AURA_AI_API_KEY?.trim();
  if (!key) return null;
  const examples = specialMixes.slice(0, 2).map((mix) => ({
    name: mix.name,
    zone: mix.zone,
    character: mix.character,
    profile: mix.profile,
    story: mix.story,
    notes: mix.notes.map((note) => note.name),
  }));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
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
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Ты собираешь один микс для кальянной HookahPlace Aura. Голос тихий, на «ты», без восклицаний и без рекламы. 2–3 коротких предложения. Верни JSON: name, zone, character, profile, story, notes. notes — массив из 3 или 4 строк, и каждая строка обязана быть точным именем из списка «на точке». Не выдумывай табак. Имя не должно повторять занятые.",
          },
          {
            role: "user",
            content: JSON.stringify({
              examples,
              takenNames: usedNames,
              onShelf: available.map((item) => ({ name: item.name, brand: item.brand, grams: item.grams })),
            }),
          },
        ],
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      name?: unknown;
      zone?: unknown;
      character?: unknown;
      profile?: unknown;
      story?: unknown;
      notes?: unknown;
    };
    if (!Array.isArray(parsed.notes)) return null;
    const notes = parsed.notes
      .map((note) => (typeof note === "string" ? matchNote(note, available) : null))
      .filter((note): note is string => Boolean(note));
    const unique = [...new Set(notes)];
    if (unique.length < 3 || unique.length > 4) return null;
    const name = typeof parsed.name === "string" ? clip(parsed.name, 40) : "";
    const story = typeof parsed.story === "string" ? clip(parsed.story, 500) : "";
    if (!name || !story) return null;
    return {
      name,
      zone: typeof parsed.zone === "string" && parsed.zone.trim() ? clip(parsed.zone, 80) : ZONES[0],
      character:
        typeof parsed.character === "string" && parsed.character.trim()
          ? clip(parsed.character, 80)
          : "С полки",
      profile: typeof parsed.profile === "string" && parsed.profile.trim() ? clip(parsed.profile, 120) : unique.join(", "),
      story,
      notes: unique,
      source: "model",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function composeForVenue(venueId: string): Promise<ComposedMix> {
  const available = await shelfFlavors(venueId);
  if (available.length < 3) {
    throw new Error("На точке меньше трёх ароматов в наличии");
  }
  const existing = await db().query.mixes.findMany({ where: eq(mixes.venueId, venueId) });
  const usedNames = [...takenNames(existing.map((mix) => mix.name))];
  const usedSets = new Set(existing.map((mix) => noteKey(parseNoteNames(mix.notes))));
  const fromModel = await modelCompose(available, usedNames);
  if (fromModel && !usedNames.includes(fromModel.name.toLowerCase())) return fromModel;
  return shelfCompose(available, usedNames, usedSets, existing.length);
}

export async function saveMix(venueId: string, mix: ComposedMix, status: MixStatus) {
  const row = {
    id: id("mx"),
    venueId,
    name: mix.name,
    zone: mix.zone,
    character: mix.character,
    profile: mix.profile,
    story: mix.story,
    notes: JSON.stringify(mix.notes.map((name) => ({ name }))),
    status,
    source: mix.source,
    createdAt: new Date(),
  };
  await db().insert(mixes).values(row);
  return row;
}

/** Creates one mix when the venue asked for it and the last one is older than a week, or there is none yet. */
export async function maybeAutonomousMix(venue: { id: string; mixAuto: number; mixPublish: number }) {
  if (!venue.mixAuto) return null;
  const latest = await db().query.mixes.findFirst({
    where: eq(mixes.venueId, venue.id),
    orderBy: [desc(mixes.createdAt)],
  });
  if (latest && Date.now() - latest.createdAt.getTime() < WEEK_MS) return null;
  try {
    const composed = await composeForVenue(venue.id);
    if (composed.source !== "model") composed.source = "auto";
    return await saveMix(venue.id, composed, venue.mixPublish ? "menu" : "draft");
  } catch {
    return null;
  }
}

export async function runAutonomousMixes() {
  const list = await db().query.venues.findMany();
  const created: string[] = [];
  for (const venue of list) {
    const row = await maybeAutonomousMix(venue);
    if (row) created.push(venue.slug);
  }
  return { created };
}
