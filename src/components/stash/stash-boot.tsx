"use client";

import { useEffect, useState } from "react";
import { AuraPulse } from "@/components/stash/aura-pulse";

/** Shown while the warehouse stream is still coming. If it never arrives, offer a way out. */
export function StashBoot() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStuck(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AuraPulse label={stuck ? "Склад не ответил" : "Открываю склад…"} />
      {stuck ? (
        <div
          style={{
            position: "fixed",
            zIndex: 81,
            left: 0,
            right: 0,
            bottom: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: "0 24px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, maxWidth: 280, color: "#a8a8a8", fontSize: 14 }}>
            Такое бывает на медленной сети. Обновите страницу.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              height: 44,
              border: 0,
              borderRadius: 12,
              background: "#e86a17",
              color: "#111",
              padding: "0 16px",
              fontSize: 14,
              fontWeight: 650,
            }}
          >
            Обновить
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/stash/login";
            }}
            style={{ border: 0, background: "transparent", color: "#a8a8a8", fontSize: 14 }}
          >
            Ко входу
          </button>
        </div>
      ) : null}
    </>
  );
}
