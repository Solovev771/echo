"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type MixCard = {
  id: string;
  name: string;
  zone: string;
  character: string;
  profile: string;
  story: string;
  notes: string[];
  status: "draft" | "menu";
  source: "shelf" | "model" | "auto";
};

const SOURCE_LABEL = {
  shelf: "С полки",
  model: "Модель",
  auto: "Сама",
} as const;

export function MixStudio({
  venueSlug,
  admin,
  modelReady,
  mixAuto,
  mixPublish,
  mixes,
}: {
  venueSlug: string;
  admin: boolean;
  modelReady: boolean;
  mixAuto: boolean;
  mixPublish: boolean;
  mixes: MixCard[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [auto, setAuto] = useState(mixAuto);
  const [publish, setPublish] = useState(mixPublish);

  async function send(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError("");
    try {
      const res = await fetch("/api/stash/mixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueSlug, ...body }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error || "Не получилось");
        return;
      }
      router.refresh();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setBusy("");
    }
  }

  async function saveSettings(nextAuto: boolean, nextPublish: boolean) {
    const previous = { auto, publish };
    setAuto(nextAuto);
    setPublish(nextAuto && nextPublish);
    setBusy("settings");
    setError("");
    try {
      const res = await fetch("/api/stash/mixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueSlug,
          action: "settings",
          mixAuto: nextAuto,
          mixPublish: nextAuto && nextPublish,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setAuto(previous.auto);
        setPublish(previous.publish);
        setError(data?.error || "Не получилось сохранить");
        return;
      }
      router.refresh();
    } catch {
      setAuto(previous.auto);
      setPublish(previous.publish);
      setError("Нет связи с сервером");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-[#121110]/85 p-3 md:p-4">
        <p className="text-sm font-medium">Сама</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--aura-muted)]">
          {modelReady
            ? "Модель подключена. Раз в неделю она сама пишет микс и берёт только табак, который есть на точке."
            : "Раз в неделю микс собирается сам из остатков точки. Когда на сервере появится ключ модели, текст будет писать она — тем же тихим голосом."}
        </p>
        {admin ? (
          <div className="mt-3 space-y-2">
            <Toggle
              on={auto}
              disabled={busy !== ""}
              label="Собирать самой раз в неделю"
              onClick={() => saveSettings(!auto, publish)}
            />
            <Toggle
              on={publish}
              disabled={!auto || busy !== ""}
              label="И сразу класть на меню гостей"
              onClick={() => saveSettings(auto, !publish)}
            />
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--aura-muted)]">
            {auto ? "На этой точке она уже собирает сама." : "Автосбор включает администратор."}
          </p>
        )}
      </section>

      <button
        type="button"
        disabled={busy !== ""}
        onClick={() => send({ action: "generate" }, "generate")}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--aura-glow)] text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        {busy === "generate" ? "Собираю…" : "Собрать микс"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {mixes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#121110]/85 px-6 py-10 text-center">
          <p className="font-semibold">Пока пусто</p>
          <p className="mt-1 text-sm text-[var(--aura-muted)]">
            Нажмите «Собрать микс». В чашу попадут только ароматы, которые есть на точке.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {mixes.map((mix) => (
            <li key={mix.id} className="rounded-2xl border border-white/10 bg-[#121110]/85 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] tracking-[0.16em] text-[#f0a65a] uppercase">{mix.zone}</p>
                  <h2 className="mt-1 text-lg font-semibold break-words">{mix.name}</h2>
                </div>
                <span className="w-fit shrink-0 rounded-md bg-white/8 px-2 py-1 text-[11px] text-[var(--aura-muted)]">
                  {mix.status === "menu" ? "На меню" : "Черновик"} · {SOURCE_LABEL[mix.source]}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{mix.story}</p>
              <p className="mt-2 text-sm text-[var(--aura-white)]/85">{mix.notes.join(" · ")}</p>
              {admin ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {mix.status === "draft" ? (
                    <button
                      type="button"
                      disabled={busy !== ""}
                      onClick={() => send({ action: "publish", mixId: mix.id }, mix.id)}
                      className="h-10 rounded-xl bg-white/10 px-3 text-sm font-medium transition hover:bg-white/15 disabled:opacity-60"
                    >
                      На меню
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy !== ""}
                      onClick={() => send({ action: "hide", mixId: mix.id }, mix.id)}
                      className="h-10 rounded-xl bg-white/10 px-3 text-sm font-medium transition hover:bg-white/15 disabled:opacity-60"
                    >
                      Снять с меню
                    </button>
                  )}
                  {mix.status === "draft" ? (
                    <button
                      type="button"
                      disabled={busy !== ""}
                      onClick={() => send({ action: "remove", mixId: mix.id }, `remove-${mix.id}`)}
                      className="h-10 rounded-xl px-3 text-sm text-[var(--aura-muted)] transition hover:bg-white/8 hover:text-red-300 disabled:opacity-60"
                    >
                      Удалить
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Toggle({
  on,
  disabled,
  label,
  onClick,
}: {
  on: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-left text-sm disabled:opacity-50"
    >
      <span>{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-[var(--aura-glow)]" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-black transition ${on ? "left-5" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
