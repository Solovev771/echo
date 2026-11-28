"use client";

import { useEffect, useState } from "react";
import { classicSections, specialMixes, type Mix } from "@/data/mixes";
import { cn } from "@/lib/utils";

function MixCard({ mix, index }: { mix: Mix; index: number }) {
  const notes = mix.notes.map((n) => n.name).join(", ");

  return (
    <article
      className="menu-item-row group"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="menu-item-name font-[family-name:var(--font-display)] text-[1.35rem] font-medium tracking-[-0.01em] text-[var(--aura-white)] sm:text-[1.55rem]">
          {mix.name}
        </h3>
        <span className="shrink-0 font-[family-name:var(--font-body)] text-[10px] uppercase tracking-[0.18em] text-[var(--aura-muted)]">
          {mix.fromShelf ? "С полки" : "Special"}
        </span>
      </div>
      <div className="menu-hairline mt-2.5" />
      <p className="mt-2.5 font-[family-name:var(--font-story)] text-[0.95rem] italic leading-relaxed text-[var(--aura-white)]/90 sm:text-[1.02rem]">
        {notes}
      </p>
      <p className="mt-2 font-[family-name:var(--font-story)] text-[0.88rem] italic leading-relaxed text-[var(--aura-muted)]">
        {mix.story}
      </p>
    </article>
  );
}

function ClassicCard({
  name,
  detail,
  index,
}: {
  name: string;
  detail: string;
  index: number;
}) {
  return (
    <article
      className="menu-item-row"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <h3 className="menu-item-name font-[family-name:var(--font-display)] text-[1.35rem] font-medium tracking-[-0.01em] text-[var(--aura-white)] sm:text-[1.55rem]">
        {name}
      </h3>
      <div className="menu-hairline mt-2.5" />
      <p className="mt-2.5 font-[family-name:var(--font-story)] text-[0.95rem] italic leading-relaxed text-[var(--aura-white)]/90">
        {detail}
      </p>
    </article>
  );
}

export function MenuShell() {
  const [tab, setTab] = useState<"menu" | "special">("special");
  const [shelf, setShelf] = useState<Mix[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    fetch("/api/menu/mixes", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { mixes?: Mix[] } | null) => {
        if (data?.mixes) setShelf(data.mixes);
      })
      .catch(() => {});
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const shown = [
    ...specialMixes,
    ...shelf.filter((mix) => !specialMixes.some((item) => item.name === mix.name)),
  ];

  return (
    <div className="menu-stage text-[var(--aura-white)]">
      <header className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3 sm:px-10 sm:pt-9">
        <div className="rise-in order-1 text-center sm:order-2">
          <p className="font-[family-name:var(--font-display)] text-[2.2rem] font-semibold lowercase leading-none tracking-tight text-[var(--aura-white)] sm:text-[2.5rem]">
            aura
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-body)] text-[9px] uppercase tracking-[0.42em] text-[var(--aura-white)]/75 sm:text-[10px]">
            HookahPlace
          </p>
        </div>

        <nav className="order-2 flex flex-wrap items-center justify-center gap-1 sm:order-1 sm:justify-start sm:gap-7">
          <a
            href="https://hpaura.ru/"
            className="inline-flex min-h-11 items-center px-3 font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.14em] text-[var(--aura-white)]/85 transition-opacity hover:opacity-100 sm:px-0 sm:text-xs sm:tracking-[0.2em]"
          >
            Галерея
          </a>
          <button
            type="button"
            onClick={() => setTab("menu")}
            className={cn(
              "inline-flex min-h-11 items-center px-3 font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.14em] transition-opacity sm:px-0 sm:text-xs sm:tracking-[0.2em]",
              tab === "menu"
                ? "text-[var(--aura-white)]"
                : "text-[var(--aura-white)]/55 hover:text-[var(--aura-white)]",
            )}
          >
            Меню
          </button>
        </nav>

        <div className="order-3 flex flex-wrap items-center justify-center gap-3 sm:justify-end sm:gap-5">
          <a
            href="https://hpaura.ru/"
            className="inline-flex min-h-11 items-center px-3 font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.14em] text-[var(--aura-white)]/85 transition-opacity hover:opacity-100 sm:px-0 sm:text-xs sm:tracking-[0.2em]"
          >
            Контакты
          </a>
          <a
            href="https://hpaura.ru/#zeroreserve"
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--aura-white)]/70 px-4 font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.14em] text-[var(--aura-white)] transition-colors hover:bg-[var(--aura-white)] hover:text-black sm:text-xs sm:tracking-[0.18em]"
          >
            Бронь
          </a>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-[max(4.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-10 sm:pt-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 rise-in">
          <div>
            <p className="font-[family-name:var(--font-body)] text-[10px] uppercase tracking-[0.28em] text-[var(--aura-muted)]">
              {tab === "special" ? "Авторская линейка" : "Зал"}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-medium tracking-tight text-[var(--aura-white)] sm:text-3xl">
              {tab === "special" ? "Special" : "Меню"}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("menu")}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-4 font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.14em] transition-colors sm:tracking-[0.16em]",
                tab === "menu"
                  ? "border-[var(--aura-white)] bg-[var(--aura-white)] text-black"
                  : "border-[var(--aura-white)]/35 text-[var(--aura-white)]/70 hover:border-[var(--aura-white)]/70",
              )}
            >
              Меню
            </button>
            <button
              type="button"
              onClick={() => setTab("special")}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-4 font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.14em] transition-colors sm:tracking-[0.16em]",
                tab === "special"
                  ? "border-[var(--aura-white)] bg-[var(--aura-white)] text-black"
                  : "border-[var(--aura-white)]/35 text-[var(--aura-white)]/70 hover:border-[var(--aura-white)]/70",
              )}
            >
              Special
            </button>
          </div>
        </div>

        {tab === "special" ? (
          <div className="grid gap-x-14 gap-y-10 md:grid-cols-2">
            {shown.map((mix, index) => (
              <MixCard key={mix.id} mix={mix} index={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-x-14 gap-y-12 md:grid-cols-2">
            {classicSections.map((section, sIndex) => (
              <section key={section.id} className="space-y-8">
                <div className="rise-in">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-medium tracking-tight text-[var(--aura-white)]">
                    {section.title}
                  </h3>
                  <p className="mt-2 font-[family-name:var(--font-story)] text-sm italic text-[var(--aura-muted)]">
                    {section.note}
                  </p>
                </div>
                <div className="space-y-8">
                  {section.items.map((item, i) => (
                    <ClassicCard
                      key={item.name}
                      name={item.name}
                      detail={item.detail}
                      index={sIndex * 4 + i}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
