import { AlertTriangle, ChevronRight, MapPin, Scale } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listVenuesForUser, requireUser } from "@/stash/access";
import { formatGrams, loadVenueBrandStock } from "@/stash/stock-summary";

export default async function StashHomePage() {
  const user = await requireUser();
  if (!user) redirect("/stash/login");

  const venues = await listVenuesForUser(user);
  const withStock = await Promise.all(
    venues.map(async (venue) => ({
      venue,
      strip: (await loadVenueBrandStock(venue.id)).strip,
    })),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.28em] text-[#f0a65a] uppercase">HookahPlace Aura</p>
        <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Точки</h1>
        <p className="mt-1 text-sm text-[var(--aura-muted)]">
          Выберите точку, чтобы работать с остатками.
        </p>
      </header>

      {withStock.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-6 text-sm text-[var(--aura-muted)]">
          У вашего аккаунта нет доступа к точкам. Попросите администратора добавить вас.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {withStock.map(({ venue, strip }) => {
            const attention = strip.lowCount + strip.outCount;
            return (
              <Link
                key={venue.id}
                href={`/stash/${venue.slug}`}
                className="group rounded-2xl border border-white/10 bg-[#141210]/80 p-4 transition hover:border-[var(--aura-amber)]/45 active:scale-[0.99] md:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{venue.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--aura-muted)]">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      {venue.address}
                    </p>
                  </div>
                  <ChevronRight
                    className="mt-1 size-5 shrink-0 text-[var(--aura-muted)] transition group-hover:translate-x-0.5 group-hover:text-[#f0a65a]"
                    aria-hidden
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Metric label="Позиций" value={strip.flavorCount.toLocaleString("ru-RU")} />
                  <Metric
                    label="На складе"
                    value={formatGrams(strip.totalGrams)}
                    icon={<Scale className="size-3" aria-hidden />}
                  />
                  <Metric
                    label="Заканчивается"
                    value={attention.toLocaleString("ru-RU")}
                    warn={attention > 0}
                    icon={<AlertTriangle className="size-3" aria-hidden />}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  warn,
  icon,
}: {
  label: string;
  value: string;
  warn?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-black/35 px-2 py-2">
      <p className="flex items-center justify-center gap-1 truncate text-[9px] tracking-[0.12em] text-[var(--aura-muted)] uppercase">
        {icon}
        {label}
      </p>
      <p
        className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${warn ? "text-[#f0a65a]" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
