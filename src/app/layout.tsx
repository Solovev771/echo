import type { Metadata } from "next";
import { Montserrat, Literata } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const display = Montserrat({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const body = Montserrat({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-body",
  weight: ["300", "400", "500"],
});

const story = Literata({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-story",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Аура · Меню | HookahPlace Aura",
  description:
    "Меню HookahPlace Aura — классика зала и авторские Special-миксы.",
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
