import type { Metadata } from "next";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import "./globals.css";

const display = localFont({
  src: [
    { path: "../../assets/fonts/Onest-Regular.ttf", weight: "400" },
    { path: "../../assets/fonts/Onest-Medium.ttf", weight: "500" },
    { path: "../../assets/fonts/Onest-SemiBold.ttf", weight: "600" },
    { path: "../../assets/fonts/Onest-Bold.ttf", weight: "700" },
  ],
  variable: "--font-display",
});

const body = localFont({
  src: [
    { path: "../../assets/fonts/Onest-Regular.ttf", weight: "400" },
    { path: "../../assets/fonts/Onest-Medium.ttf", weight: "500" },
  ],
  variable: "--font-body",
});

const story = localFont({
  src: [{ path: "../../assets/fonts/CoFoRobert-RegularIt.ttf", weight: "400", style: "italic" }],
  variable: "--font-story",
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
