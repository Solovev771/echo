import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Аура · Карточка микса",
  description: "Гостевая карточка микса HookahPlace Aura — пустое место под QR.",
};

export default function CardPage() {
  return (
    <main className="min-h-screen bg-[#1a1a1a] px-4 py-8 text-[#f5f5f5]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-semibold lowercase tracking-wide">
              aura
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-lg font-medium text-[#d4782a]">
              Карточка микса
            </h1>
            <p className="mt-2 max-w-xl font-[family-name:var(--font-story)] text-sm italic text-[#a8a8a8]">
              QR пока пустой — место оставлено под ваш код. Печать: Ctrl/Cmd+P.
            </p>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm">
            <Link href="/files" className="text-[#d4782a] underline-offset-4 hover:underline">
              Все файлы
            </Link>
            <a
              href="/files/AURA_Kartochka_miksa.pdf"
              className="text-[#d4782a] underline-offset-4 hover:underline"
            >
              PDF
            </a>
            <a
              href="/files/AURA_Kartochka_miksa.png"
              className="text-[#d4782a] underline-offset-4 hover:underline"
            >
              PNG
            </a>
            <Link href="/" className="text-[#a8a8a8] underline-offset-4 hover:underline">
              Меню
            </Link>
          </nav>
        </header>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/files/AURA_Kartochka_miksa.png"
          alt="Карточка микса Аура — пустое место под QR"
          className="w-full rounded-sm border border-[rgba(180,110,50,0.55)] shadow-[0_0_60px_rgba(232,106,23,0.18)]"
        />
      </div>
    </main>
  );
}
