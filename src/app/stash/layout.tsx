import type { Metadata } from "next";

export const instant = false;

export const metadata: Metadata = {
  title: "Аура · Склад",
  description: "Склад табака HookahPlace Aura — две точки, бренды и остатки.",
};

export default function StashLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--aura-black)] text-[var(--aura-white)] antialiased">
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 100% 0%, rgba(232,106,23,0.22), transparent 55%), radial-gradient(ellipse 60% 40% at 0% 100%, rgba(212,120,42,0.12), transparent 50%)",
        }}
      />
      <div className="relative mx-auto min-h-dvh w-full max-w-lg px-4 pb-10 pt-6">
        {children}
      </div>
    </div>
  );
}
