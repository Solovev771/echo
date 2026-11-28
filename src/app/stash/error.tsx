"use client";

export default function StashError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0b0b0b] px-6 text-center text-[#f5f5f5]">
      <p className="text-sm font-semibold tracking-[0.28em]">AURA</p>
      <p className="max-w-xs text-sm text-[#a8a8a8]">Склад не открылся. Это сбой связи, не ваши данные.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="flex h-11 items-center rounded-xl bg-[#e86a17] px-4 text-sm font-semibold text-black"
      >
        Попробовать снова
      </button>
      <button
        type="button"
        onClick={() => {
          window.location.href = "/stash/login";
        }}
        className="text-sm text-[#a8a8a8]"
      >
        Ко входу
      </button>
    </div>
  );
}
