import type { MetadataRoute } from "next";

const manifest: MetadataRoute.Manifest = {
  id: "/stash",
  name: "Аура · Склад",
  short_name: "Аура Склад",
  description: "Склад табака HookahPlace Aura — остатки, приход, расход и журнал.",
  lang: "ru",
  start_url: "/stash",
  scope: "/stash",
  display: "standalone",
  orientation: "portrait",
  background_color: "#0b0b0b",
  theme_color: "#0b0b0b",
  icons: [
    { src: "/stash/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/stash/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/stash/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function GET() {
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}
