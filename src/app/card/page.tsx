import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Аура · Карточка микса — варианты",
  description:
    "Варианты гостевой карточки HookahPlace Aura: разворот внутри и оборот с адресом.",
};

type Variant = {
  id: string;
  title: string;
  note: string;
};

const variants: Variant[] = [
  {
    id: "mist",
    title: "Mist",
    note: "Самый тихий. Мягкая дымка, Cormorant для названия.",
  },
  {
    id: "horizon",
    title: "Horizon",
    note: "Горизонтальная полоса света, Literata в заголовках.",
  },
  {
    id: "orb",
    title: "Orb",
    note: "Одно мягкое свечение в центре — абстрактный ореол.",
  },
];

function CardImage({ src, alt }: { src: string; alt: string }) {
  return (
    // next/image not required for static public previews
    <img
      src={src}
      alt={alt}
      className="w-full border border-amber-900/40"
    />
  );
}

export default function CardPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-10 text-[#f0ebe4]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
        <header className="space-y-3">
          <p className="font-[family-name:var(--font-story)] text-3xl font-medium lowercase tracking-wide">
            aura
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-xl text-[#d4782a]">
            Карточка микса — варианты
          </h1>
          <p className="max-w-2xl font-[family-name:var(--font-story)] text-sm italic text-[#a89f92]">
            Посередине — зона сгиба. Сначала разворот для записи микса, ниже —
            оборот: нейминг, лого, адрес, сайт. QR пустой.
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
              className="text-[#a89f92] underline-offset-4 hover:underline"
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
                </h2>
                <p className="mt-1 text-sm text-[#a89f92]">{v.note}</p>
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
                Оборот · нейминг / адрес / сайт
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
