"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type VenueLink = {
  slug: string;
  name: string;
};

export function StashSideNav({ venues }: { venues: VenueLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-6 space-y-4 text-sm">
      <div>
        <p className="mb-2 text-[10px] tracking-[0.22em] text-[var(--aura-muted)] uppercase">
          Навигация
        </p>
        <Link
          href="/stash"
          className={`block rounded-lg px-3 py-2 transition ${
            pathname === "/stash"
              ? "bg-[var(--aura-amber)]/15 text-[var(--aura-amber)]"
              : "text-[var(--aura-muted)] hover:bg-white/5 hover:text-[var(--aura-white)]"
          }`}
        >
          ← Точки
        </Link>
      </div>

      <div>
        <p className="mb-2 text-[10px] tracking-[0.22em] text-[var(--aura-muted)] uppercase">
          Точки
        </p>
        <ul className="space-y-1">
          {venues.map((venue) => {
            const href = `/stash/${venue.slug}`;
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={venue.slug}>
                <Link
                  href={href}
                  className={`block rounded-lg px-3 py-2 transition ${
                    active
                      ? "bg-[var(--aura-amber)]/15 text-[var(--aura-amber)]"
                      : "text-[var(--aura-white)]/85 hover:bg-white/5"
                  }`}
                >
                  {venue.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
