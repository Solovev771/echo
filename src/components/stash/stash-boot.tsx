"use client";

import { useEffect, useState } from "react";

/** Shown while the warehouse stream is still coming. If it never arrives, offer a way out. */
export function StashBoot() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStuck(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0b0b0b] px-6 text-center text-[#f5f5f5]">
      <p className="text-sm font-semibold tracking-[0.28em]">AURA</p>
      {stuck ? (
        <>
          <p className="max-w-xs text-sm text-[#a8a8a8]">
            Склад не ответил. Такое бывает на медленной сети. Обновите страницу.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-11 items-center rounded-xl bg-[#e86a17] px-4 text-sm font-semibold text-black"
          >
            Обновить
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
        </>
      ) : (
        <p className="text-xs text-[#a8a8a8]">Открываю склад…</p>
      )}
    </div>
  );
}
