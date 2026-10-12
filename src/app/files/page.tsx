import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Аура · Файлы",
  description: "Документы HookahPlace Aura — открываются в браузере.",
};

const conceptPages = [1, 2] as const;
const specialPages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export default function FilesPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-10 text-[#f5f5f5]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <header>
          <p className="font-[family-name:var(--font-display)] text-3xl font-semibold lowercase">
            aura
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-xl text-[#d4782a]">
            Файлы — смотрите прямо здесь
          </h1>
          <p className="mt-3 max-w-2xl font-[family-name:var(--font-story)] text-sm italic text-[#a8a8a8]">
            PDF и Word иногда не открываются из чата. Ниже — превью в браузере.
            Скачать можно ссылками рядом.
          </p>
          <nav className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href="/card" className="text-[#d4782a] underline-offset-4 hover:underline">
              Карточка микса
            </Link>
            <Link href="/" className="text-[#a8a8a8] underline-offset-4 hover:underline">
              Special-меню
            </Link>
          </nav>
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg">
              Карточка микса
            </h2>
            <div className="flex flex-wrap gap-3 text-sm text-[#d4782a]">
              <Link href="/card" className="underline-offset-4 hover:underline">
                Все варианты
              </Link>
              <a
                href="/files/AURA_Kartochka_site.pdf"
                className="underline-offset-4 hover:underline"
              >
                PDF Site
              </a>
            </div>
          </div>
          <p className="text-sm text-[#a8a8a8]">
            Книжка: обложка снаружи и разворот внутри. Сгиб по центру, QR пустой.
          </p>
          <img
            src="/files/AURA_Kartochka_site_cover.png"
            alt="Карточка — обложка"
            className="w-full border border-amber-900/40"
          />
          <img
            src="/files/AURA_Kartochka_site_open.png"
            alt="Карточка — разворот"
            className="w-full border border-amber-900/40"
          />
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg">
              Концепция заведения
            </h2>
            <div className="flex flex-wrap gap-3 text-sm text-[#d4782a]">
              <a href="/files/AURA_Kontseptsiya.pdf" className="underline-offset-4 hover:underline">
                PDF
              </a>
              <a href="/files/AURA_Kontseptsiya.docx" className="underline-offset-4 hover:underline">
                DOCX
              </a>
            </div>
          </div>
          <div className="space-y-6">
            {conceptPages.map((n) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={n}
                src={`/files/AURA_Kontseptsiya_p${n}.png`}
                alt={`Концепция, страница ${n}`}
                className="w-full border border-white/10 bg-white"
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg">
              Special · авторские миксы
            </h2>
            <div className="flex flex-wrap gap-3 text-sm text-[#d4782a]">
              <a href="/files/AURA_Special_miksy.pdf" className="underline-offset-4 hover:underline">
                PDF
              </a>
              <a href="/files/AURA_Special_miksy.docx" className="underline-offset-4 hover:underline">
                DOCX
              </a>
            </div>
          </div>
          <div className="space-y-6">
            {specialPages.map((n) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={n}
                src={`/files/AURA_Special_miksy_p${n}.png`}
                alt={`Special миксы, страница ${n}`}
                className="w-full border border-white/10 bg-white"
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
