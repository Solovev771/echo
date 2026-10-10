"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { classicSections, specialMixes, type Mix } from "@/data/mixes";
import { cn } from "@/lib/utils";

function NoteLine({ notes }: { notes: Mix["notes"] }) {
  return (
    <p className="mt-6 font-[family-name:var(--font-body)] text-sm leading-relaxed tracking-wide text-[var(--aura-ink-soft)]">
      {notes.map((n) => n.name).join(" · ")}
    </p>
  );
}

function MixPanel({ mix }: { mix: Mix }) {
  return (
    <article className="mix-panel relative overflow-hidden border border-[var(--aura-yellow)]/20 bg-black/50 p-5 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(224,160,0,0.18),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(232,106,23,0.14),transparent_70%)]"
      />

      <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.28em] text-[var(--aura-orange)]">
        {mix.zone}
      </p>
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold uppercase tracking-[0.04em] text-[var(--aura-yellow)] sm:text-4xl">
        {mix.name}
      </h3>
      <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--aura-ink-soft)]">
        {mix.character}
      </p>
      <p className="mt-5 max-w-2xl font-[family-name:var(--font-story)] text-base leading-relaxed text-[var(--aura-ink)] sm:text-lg">
        {mix.story}
      </p>
      <NoteLine notes={mix.notes} />
    </article>
  );
}

export function MenuShell() {
  const [selectedId, setSelectedId] = useState(specialMixes[0]?.id ?? "");
  const selected =
    specialMixes.find((m) => m.id === selectedId) ?? specialMixes[0];

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[var(--aura-black)] text-[var(--aura-ink)]">
      <div aria-hidden className="atmosphere" />
      <div aria-hidden className="sun-flare" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-end justify-between gap-4 px-5 pb-2 pt-8 sm:px-8 sm:pt-10">
        <div className="brand-rise">
          <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.35em] text-[var(--aura-orange)]">
            HookahPlace · Aura
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl font-semibold uppercase leading-none tracking-[0.08em] text-[var(--aura-yellow)] sm:text-7xl">
            Аура
          </h1>
        </div>
        <p className="brand-rise max-w-[14rem] text-right font-[family-name:var(--font-body)] text-[11px] leading-snug text-[var(--aura-ink-soft)] sm:max-w-xs sm:text-xs">
          Здесь каждая деталь помогает замедлиться и насладиться моментом.
        </p>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8">
        <Tabs defaultValue="special" className="gap-8">
          <TabsList className="menu-tabs h-auto w-full flex-wrap justify-start gap-2 rounded-none bg-transparent p-0">
            <TabsTrigger
              value="menu"
              className="menu-tab rounded-none border border-[var(--aura-ink-soft)]/30 bg-transparent px-5 py-2.5 font-[family-name:var(--font-display)] text-xs uppercase tracking-[0.22em] text-[var(--aura-ink-soft)] after:hidden"
            >
              Меню
            </TabsTrigger>
            <TabsTrigger
              value="special"
              className="menu-tab menu-tab-special rounded-none border border-[var(--aura-orange)]/50 bg-transparent px-5 py-2.5 font-[family-name:var(--font-display)] text-xs uppercase tracking-[0.22em] text-[var(--aura-orange)] after:hidden"
            >
              Special
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu" className="mt-0 outline-none">
            <section className="section-fade max-w-2xl">
              <h2 className="font-[family-name:var(--font-display)] text-3xl uppercase tracking-[0.06em] text-[var(--aura-yellow)]">
                Основное меню
              </h2>
              <p className="mt-3 font-[family-name:var(--font-story)] text-base leading-relaxed text-[var(--aura-ink-soft)]">
                Классика и зоны зала. Авторские миксы — во вкладке Special.
              </p>
            </section>

            <div className="mt-10 grid gap-10 md:grid-cols-2">
              {classicSections.map((section) => (
                <section key={section.id} className="section-fade">
                  <h3 className="font-[family-name:var(--font-display)] text-xl uppercase tracking-[0.08em] text-[var(--aura-orange)]">
                    {section.title}
                  </h3>
                  <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--aura-ink-soft)]">
                    {section.note}
                  </p>
                  <ul className="mt-6 space-y-4 border-t border-[var(--aura-yellow)]/15 pt-5">
                    {section.items.map((item) => (
                      <li key={item.name}>
                        <p className="font-[family-name:var(--font-display)] text-lg uppercase tracking-[0.04em] text-[var(--aura-yellow)]">
                          {item.name}
                        </p>
                        <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[var(--aura-ink-soft)]">
                          {item.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="special" className="mt-0 outline-none">
            <section className="section-fade max-w-2xl">
              <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.3em] text-[var(--aura-orange)]">
                Special
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl uppercase tracking-[0.06em] text-[var(--aura-yellow)] sm:text-4xl">
                Авторские миксы
              </h2>
              <p className="mt-3 font-[family-name:var(--font-story)] text-base leading-relaxed text-[var(--aura-ink-soft)]">
                Девять миксов. Один — под настроение. Без процентов и лишнего шума.
              </p>
            </section>

            <div className="mt-8 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {specialMixes.map((mix, index) => {
                const active = mix.id === selected?.id;
                return (
                  <button
                    key={mix.id}
                    type="button"
                    onClick={() => setSelectedId(mix.id)}
                    className={cn(
                      "mix-chip shrink-0 border px-4 py-2 font-[family-name:var(--font-display)] text-xs uppercase tracking-[0.16em] transition-colors duration-300",
                      active
                        ? "border-[var(--aura-yellow)] bg-[var(--aura-yellow)] text-black"
                        : "border-[var(--aura-yellow)]/25 bg-black/35 text-[var(--aura-yellow)] hover:border-[var(--aura-orange)] hover:text-[var(--aura-orange)]",
                    )}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    {mix.name}
                  </button>
                );
              })}
            </div>

            {selected ? (
              <div className="mt-6">
                <MixPanel mix={selected} key={selected.id} />
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
