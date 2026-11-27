"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  History,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AuraDialog } from "@/components/stash/kit";
import { shortVenueName } from "@/stash/stock-level";

export type ShellVenue = {
  slug: string;
  name: string;
  address: string;
  attentionCount: number;
};

type ShellUser = {
  name: string;
  role: "admin" | "staff";
};

function currentVenueSlug(pathname: string, venues: ShellVenue[]) {
  const segment = pathname.split("/")[2];
  return venues.find((v) => v.slug === segment)?.slug ?? null;
}

const VENUE_SUBPAGES = ["low", "history", "supplies"];

/** "/low", "/history" or "/supplies" for venue sections (including nested supply pages), else "". */
function venueSubpage(pathname: string) {
  const segment = pathname.split("/")[3] ?? "";
  return VENUE_SUBPAGES.includes(segment) ? `/${segment}` : "";
}

function useLogout() {
  const router = useRouter();
  return async () => {
    await fetch("/api/stash/logout", { method: "POST" });
    router.replace("/stash/login");
    router.refresh();
  };
}

export function StashShell({
  venues,
  user,
  children,
}: {
  venues: ShellVenue[];
  user: ShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const venueSlug = currentVenueSlug(pathname, venues);
  const venue = venues.find((v) => v.slug === venueSlug) ?? null;
  const logout = useLogout();
  const [moreOpen, setMoreOpen] = useState(false);

  const sections = venue
    ? [
        {
          href: `/stash/${venue.slug}`,
          label: "Склад",
          short: "Склад",
          icon: Warehouse,
          active:
            pathname === `/stash/${venue.slug}` ||
            (pathname.startsWith(`/stash/${venue.slug}/`) && !venueSubpage(pathname)),
          badge: 0,
        },
        {
          href: `/stash/${venue.slug}/supplies`,
          label: "Поставки",
          short: "Поставки",
          icon: Truck,
          active: venueSubpage(pathname) === "/supplies",
          badge: 0,
        },
        {
          href: `/stash/${venue.slug}/low`,
          label: "Заканчивается",
          short: "Мало",
          icon: AlertTriangle,
          active: pathname === `/stash/${venue.slug}/low`,
          badge: venue.attentionCount,
        },
        {
          href: `/stash/${venue.slug}/history`,
          label: "Журнал",
          short: "Журнал",
          icon: History,
          active: pathname === `/stash/${venue.slug}/history`,
          badge: 0,
        },
      ]
    : [];

  return (
    <div className="md:grid md:min-h-dvh md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-white/8 bg-[#0e0d0c]/90 backdrop-blur md:flex md:h-dvh md:flex-col md:sticky md:top-0">
        <Link href="/stash" className="flex items-center gap-3 px-5 pt-5 pb-4">
          <AuraMark />
          <span>
            <span className="block text-sm font-semibold tracking-[0.18em]">AURA</span>
            <span className="block text-[11px] text-[var(--aura-muted)]">Склад · HookahPlace</span>
          </span>
        </Link>

        <div className="mx-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
          {venue ? (
            <Link
              href="/stash"
              className="mb-2 flex items-center gap-1.5 text-[11px] text-[var(--aura-muted)] transition hover:text-[var(--aura-white)]"
            >
              <ArrowLeft className="size-3" aria-hidden />
              Все точки
            </Link>
          ) : null}
          <p className="text-[9px] font-medium tracking-[0.18em] text-[var(--aura-muted)] uppercase">
            Текущая точка
          </p>
          <p className="truncate text-sm font-semibold">
            {venue ? shortVenueName(venue.name) : "Не выбрана"}
          </p>
        </div>

        <nav className="mt-5 flex-1 space-y-5 overflow-y-auto px-3" aria-label="Склад">
          {sections.length > 0 ? (
            <NavGroup title="Склад">
              {sections.map((item) => (
                <SideLink key={item.href} {...item} />
              ))}
            </NavGroup>
          ) : null}

          {user.role === "admin" ? (
            <NavGroup title="Управление">
              <SideLink
                href="/stash/team"
                label="Сотрудники"
                icon={Users}
                active={pathname === "/stash/team"}
                badge={0}
              />
            </NavGroup>
          ) : null}

          <NavGroup title="Точки">
            {venues.map((v) => (
              <SideLink
                key={v.slug}
                href={`/stash/${v.slug}`}
                label={shortVenueName(v.name)}
                icon={MapPin}
                active={v.slug === venueSlug}
                badge={0}
              />
            ))}
          </NavGroup>
        </nav>

        <div className="border-t border-white/8 px-4 py-4">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="text-[11px] text-[var(--aura-muted)]">
            {user.role === "admin" ? "Администратор" : "Сотрудник"}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-xs text-[var(--aura-muted)] transition hover:text-[var(--aura-white)]"
          >
            <LogOut className="size-3.5" aria-hidden />
            Выйти
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0b0b0b]/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
          <div className="flex h-14 items-center justify-between gap-3">
            <Link href="/stash" className="flex items-center gap-2.5">
              <AuraMark small />
              <span className="text-sm font-semibold tracking-[0.18em]">AURA</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex size-10 items-center justify-center rounded-lg text-[var(--aura-muted)] active:bg-white/10"
              aria-label="Выйти"
            >
              <LogOut className="size-4.5" aria-hidden />
            </button>
          </div>
          {venues.length > 1 && venue ? (
            <div className="-mx-1 flex gap-1 pb-3" role="tablist" aria-label="Точка">
              {venues.map((v) => {
                const active = v.slug === venueSlug;
                const suffix = venueSubpage(pathname);
                return (
                  <Link
                    key={v.slug}
                    href={`/stash/${v.slug}${suffix}`}
                    role="tab"
                    aria-selected={active}
                    className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
                      active
                        ? "bg-[var(--aura-glow)] text-black"
                        : "bg-white/5 text-[var(--aura-white)]/75 active:bg-white/10"
                    }`}
                  >
                    {shortVenueName(v.name)}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pt-8 md:pb-12">
          {children}
        </main>

        {venue ? (
          <nav
            className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0b0b0b]/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
            aria-label="Разделы"
          >
            <div className="grid grid-cols-4">
              {sections
                .filter((item) => !item.href.endsWith("/supplies"))
                .map((item) => (
                  <BottomTab key={item.href} {...item} label={item.short} />
                ))}
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition active:bg-white/5 ${
                  venueSubpage(pathname) === "/supplies" || moreOpen
                    ? "text-[#f0a65a]"
                    : "text-[var(--aura-muted)]"
                }`}
              >
                <Menu className="size-5" aria-hidden />
                Ещё
                {venueSubpage(pathname) === "/supplies" ? (
                  <span className="absolute top-0 h-0.5 w-10 rounded-full bg-[var(--aura-glow)]" aria-hidden />
                ) : null}
              </button>
            </div>
          </nav>
        ) : null}

        {venue && moreOpen ? (
          <AuraDialog open onOpenChange={setMoreOpen} title="Ещё">
            <div
              className="space-y-3"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) setMoreOpen(false);
              }}
            >
              <Link
                href={`/stash/${venue.slug}/supplies/new`}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--aura-glow)] text-base font-semibold text-black active:scale-[0.98]"
              >
                <Plus className="size-5" aria-hidden />
                Новая поставка
              </Link>
              <ul className="overflow-hidden rounded-xl border border-white/10">
                <SheetLink href={`/stash/${venue.slug}/supplies`} icon={Truck} label="Поставки" hint="Все приёмки табака" />
                <SheetLink href="/stash" icon={MapPin} label="Все точки" hint="Сводка по точкам" />
                {user.role === "admin" ? (
                  <SheetLink href="/stash/team" icon={Users} label="Сотрудники" hint="Доступы и пароли" />
                ) : null}
                <li className="border-t border-white/6 first:border-t-0">
                  <button
                    type="button"
                    onClick={logout}
                    className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm text-[var(--aura-muted)] active:bg-white/5"
                  >
                    <LogOut className="size-4.5" aria-hidden />
                    Выйти ({user.name})
                  </button>
                </li>
              </ul>
            </div>
          </AuraDialog>
        ) : null}
      </div>
    </div>
  );
}

function SheetLink({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: typeof Warehouse;
  label: string;
  hint: string;
}) {
  return (
    <li className="border-t border-white/6 first:border-t-0">
      <Link href={href} className="flex min-h-14 items-center gap-3 px-3 py-2 active:bg-white/5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/8">
          <Icon className="size-4.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-[var(--aura-muted)]">{hint}</span>
        </span>
        <ChevronRight className="size-4 text-[var(--aura-muted)]" aria-hidden />
      </Link>
    </li>
  );
}

function AuraMark({ small }: { small?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#f08a2c] to-[#b85a14] font-bold text-black shadow-[0_0_18px_rgba(232,106,23,0.35)] ${
        small ? "size-8 text-sm" : "size-9 text-base"
      }`}
      aria-hidden
    >
      A
    </span>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-2 text-[10px] font-medium tracking-[0.2em] text-[var(--aura-muted)]/80 uppercase">
        {title}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: typeof Warehouse;
  active: boolean;
  badge: number;
};

function SideLink({ href, label, icon: Icon, active, badge }: NavItem) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
          active
            ? "border border-[var(--aura-amber)]/35 bg-[var(--aura-amber)]/12 text-[var(--aura-white)]"
            : "border border-transparent text-[var(--aura-white)]/75 hover:bg-white/5 hover:text-[var(--aura-white)]"
        }`}
      >
        <Icon
          className={`size-4 shrink-0 ${active ? "text-[#f0a65a]" : "text-[var(--aura-muted)]"}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {badge > 0 ? <CountBadge count={badge} /> : null}
      </Link>
    </li>
  );
}

function BottomTab({ href, label, icon: Icon, active, badge }: NavItem) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition active:bg-white/5 ${
        active ? "text-[#f0a65a]" : "text-[var(--aura-muted)]"
      }`}
    >
      <span className="relative">
        <Icon className="size-5" aria-hidden />
        {badge > 0 ? (
          <span className="absolute -top-1.5 -right-3">
            <CountBadge count={badge} />
          </span>
        ) : null}
      </span>
      {label}
      {active ? (
        <span className="absolute top-0 h-0.5 w-10 rounded-full bg-[var(--aura-glow)]" aria-hidden />
      ) : null}
    </Link>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--aura-glow)] px-1.5 text-[10px] leading-5 font-semibold text-black tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}
