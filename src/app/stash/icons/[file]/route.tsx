import { ImageResponse } from "next/og";

const ICONS: Record<string, { size: number; inset: number }> = {
  "icon-192.png": { size: 192, inset: 0 },
  "icon-512.png": { size: 512, inset: 0 },
  "maskable-512.png": { size: 512, inset: 0.14 },
  "apple-180.png": { size: 180, inset: 0 },
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((file) => ({ file }));
}

export async function GET(_request: Request, { params }: RouteContext<"/stash/icons/[file]">) {
  const { file } = await params;
  const icon = ICONS[file];
  if (!icon) return new Response("Not found", { status: 404 });
  const { size, inset } = icon;
  const mark = Math.round(size * (1 - inset * 2) * 0.62);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 78% 12%, rgba(232,106,23,0.45), rgba(11,11,11,0) 58%), #0b0b0b",
        }}
      >
        <div
          style={{
            width: mark,
            height: mark,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: mark * 0.26,
            background: "linear-gradient(135deg, #f5a44c 0%, #e86a17 55%, #b85a14 100%)",
            boxShadow: `0 0 ${Math.round(size * 0.12)}px rgba(232,106,23,0.55)`,
            color: "#0b0b0b",
            fontSize: Math.round(mark * 0.62),
            fontWeight: 800,
            letterSpacing: -2,
          }}
        >
          A
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
