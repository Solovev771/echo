import { asc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TeamManager, type TeamMember } from "@/components/stash/team-manager";
import { requireUser } from "@/stash/access";
import { isEnvAdmin } from "@/stash/admins";
import { db } from "@/stash/db";
import { users } from "@/stash/schema";
import { shortVenueName } from "@/stash/stock-level";

export default async function TeamPage() {
  const user = await requireUser();
  if (!user) redirect("/stash/login");
  if (user.role !== "admin") redirect("/stash");

  const [userRows, memberRows, venueRows] = await Promise.all([
    db().query.users.findMany({ orderBy: [asc(users.createdAt)] }),
    db().query.memberships.findMany(),
    db().query.venues.findMany(),
  ]);

  const members: TeamMember[] = userRows
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isSelf: u.id === user.id,
      protected: isEnvAdmin(u.email),
      venueIds: memberRows.filter((m) => m.userId === u.id).map((m) => m.venueId),
    }))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "admin" ? -1 : 1));

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <Link
          href="/stash"
          className="-ml-2 mb-2 flex h-9 w-fit items-center gap-1.5 rounded-lg px-2 text-sm text-[var(--aura-muted)] transition hover:text-[var(--aura-white)] md:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Точки
        </Link>
        <p className="text-[11px] tracking-[0.28em] text-[#f0a65a] uppercase">HookahPlace Aura</p>
        <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Сотрудники</h1>
        <p className="mt-1 text-sm text-[var(--aura-muted)]">
          Кто может входить в склад и какие точки видит. Администраторы видят всё.
        </p>
      </header>
      <TeamManager
        members={members}
        venues={venueRows.map((v) => ({ id: v.id, name: shortVenueName(v.name) }))}
      />
    </div>
  );
}
