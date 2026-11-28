import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Аура · Склад",
  description: "Склад табака HookahPlace Aura — две точки, бренды и остатки.",
  manifest: "/stash/manifest.webmanifest",
  icons: {
    icon: [{ url: "/stash/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/stash/icons/apple-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Аура · Склад", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function StashLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--aura-black)] text-[var(--aura-white)] antialiased">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 100% 0%, rgba(232,106,23,0.16), transparent 55%), radial-gradient(ellipse 55% 40% at 0% 100%, rgba(212,120,42,0.09), transparent 50%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
