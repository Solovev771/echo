/** Full-screen mark while a warehouse page is still arriving. Inline so it paints before the stylesheet. */
export function AuraPulse({ label = "Открываю склад…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "#0b0b0b",
        color: "#f5f5f5",
      }}
    >
      <style>{`
        @keyframes aura-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.55; }
        }
        @media (prefers-reduced-motion: reduce) {
          .aura-pulse-mark { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
      <span
        className="aura-pulse-mark"
        aria-hidden
        style={{
          width: 76,
          height: 76,
          borderRadius: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f08a2c, #b85a14)",
          color: "#111111",
          fontWeight: 750,
          fontSize: 34,
          letterSpacing: "-0.04em",
          boxShadow: "0 0 28px rgba(232,106,23,0.45)",
          animation: "aura-pulse 1.35s ease-in-out infinite",
        }}
      >
        A
      </span>
      <p style={{ margin: 0, letterSpacing: "0.28em", fontSize: 13, fontWeight: 650 }}>AURA</p>
      <p style={{ margin: 0, color: "#a8a8a8", fontSize: 13 }}>{label}</p>
    </div>
  );
}
