import type { Metadata } from "next";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import "./globals.css";

const display = localFont({
  src: [
    { path: "../../assets/fonts/Onest-Regular.woff2", weight: "400" },
    { path: "../../assets/fonts/Onest-Medium.woff2", weight: "500" },
    { path: "../../assets/fonts/Onest-SemiBold.woff2", weight: "600" },
    { path: "../../assets/fonts/Onest-Bold.woff2", weight: "700" },
  ],
  variable: "--font-display",
  display: "swap",
  preload: false,
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

const story = localFont({
  src: [{ path: "../../assets/fonts/CoFoRobert-RegularIt.woff2", weight: "400", style: "italic" }],
  variable: "--font-story",
  preload: false,
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
      className={cn(display.variable, story.variable)}
      style={{ backgroundColor: "#0b0b0b", colorScheme: "dark" }}
    >
      <body
        className="font-[family-name:var(--font-body)]"
        style={{ margin: 0, backgroundColor: "#0b0b0b", color: "#f5f5f5" }}
      >
        {children}
      </body>
    </html>
  );
}
