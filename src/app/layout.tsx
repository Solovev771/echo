import type { Metadata } from "next";
import { Unbounded, Manrope, Literata } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const display = Unbounded({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-display",
});

const body = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-body",
});

const story = Literata({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-story",
});

export const metadata: Metadata = {
  title: "Аура · Special меню",
  description:
    "Авторские кальянные миксы заведения Аура — Special-меню в жёлто-чёрно-оранжевой палитре.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={cn(display.variable, body.variable, story.variable)}
    >
      <body className="font-[family-name:var(--font-body)]">{children}</body>
    </html>
  );
}
