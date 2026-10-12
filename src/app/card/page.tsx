import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Аура · Карточка микса",
  description:
    "Готовая карточка HookahPlace Aura в стиле hpaura.ru — разворот и оборот.",
};

type Variant = {
  id: string;
  title: string;
  note: string;
  primary?: boolean;
};

const variants: Variant[] = [
  {
    id: "site",
    title: "Site",
    note: "Основной результат — цвета и шрифты как на hpaura.ru.",
    primary: true,
  },
  {
    id: "mist",
    title: "Mist",
    note: "Альтернатива: более тихий фон.",
  },
  {
    id: "horizon",
    title: "Horizon",
    note: "Альтернатива: горизонтальная полоса света.",
  },
  {
    id: "orb",
    title: "Orb",
    note: "Альтернатива: мягкий ореол.",
  },
];

function CardImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="w-full border border-amber-900/40"
    />
  );
}

export default function CardPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-10 text-[#f5f5f5]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
        <header className="space-y-3">
          <p className="font-[family-name:var(--font-display)] text-3xl font-semibold lowercase tracking-tight">
            aura
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-xl text-[#d4782a]">
            Карточка микса
          </h1>
          <p className="max-w-2xl font-[family-name:var(--font-story)] text-sm italic text-[#a8a8a8]">
            Стиль hpaura.ru: градиент, лого, слоган. Разворот для Mix, оборот с
            двумя адресами. Сгиб по центру, QR пустой.
          </p>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link
              href="/files"
              className="text-[#d4782a] underline-offset-4 hover:underline"
            >
              Все файлы
            </Link>
            <Link
              href="/"
              className="text-[#a8a8a8] underline-offset-4 hover:underline"
            >
              Меню
            </Link>
          </nav>
        </header>

        {variants.map((v) => (
          <section
            key={v.id}
            className="space-y-5 border-t border-white/10 pt-8"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-lg">
                  {v.title}
                  {v.primary ? " · основной" : ""}
                </h2>
                <p className="mt-1 text-sm text-[#a8a8a8]">{v.note}</p>
              </div>
              <a
                href={"/files/AURA_Kartochka_" + v.id + ".pdf"}
                className="text-sm text-[#d4782a] underline-offset-4 hover:underline"
              >
                PDF · 2 стороны
              </a>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[#d4782a]">
                Разворот внутри
              </p>
              <CardImage
                src={"/files/AURA_Kartochka_" + v.id + "_inside.png"}
                alt={v.title + " inside"}
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[#d4782a]">
                Оборот
              </p>
              <CardImage
                src={"/files/AURA_Kartochka_" + v.id + "_outside.png"}
                alt={v.title + " outside"}
              />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
