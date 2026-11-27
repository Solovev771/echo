import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

const TONES = {
  amber: "bg-[var(--aura-amber)]/15 text-[#f0a65a]",
  neutral: "bg-white/8 text-[var(--aura-white)]/80",
  green: "bg-emerald-500/15 text-emerald-300",
  red: "bg-red-500/15 text-red-300",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: keyof typeof TONES;
  href?: string;
}) {
  const body = (
    <>
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}
      >
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="w-full min-w-0 flex-1">
        <span className="block text-[10px] leading-tight font-medium tracking-[0.04em] text-balance break-words text-[var(--aura-muted)] uppercase min-[380px]:tracking-[0.1em] sm:truncate sm:tracking-[0.14em]">
          {label}
        </span>
        <span className="block truncate text-base font-semibold tabular-nums leading-tight sm:text-lg">
          {value}
        </span>
      </span>
      {href ? (
        <ChevronRight
          className="absolute top-3 right-3 size-4 shrink-0 text-[var(--aura-muted)] sm:static"
          aria-hidden
        />
      ) : null}
    </>
  );

  const className =
    "relative flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-[#141210]/80 px-3 py-3 backdrop-blur sm:flex-row sm:items-center sm:gap-3";

  if (href) {
    return (
      <Link
        href={href}
        className={`${className} transition hover:border-[var(--aura-amber)]/45 hover:bg-[#1a1611]`}
      >
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
