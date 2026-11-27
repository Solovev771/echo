"use client";

import { KeyRound, MoreHorizontal, Pencil, Shield, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import {
  AuraDialog,
  DangerButton,
  ErrorText,
  Field,
  inputClass,
  menuContentClass,
  menuDangerClass,
  menuItemClass,
  PrimaryButton,
  SecondaryButton,
  useApi,
} from "@/components/stash/kit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  isSelf: boolean;
  protected: boolean;
  venueIds: string[];
};

type Venue = { id: string; name: string };

type DialogState =
  | { kind: "add" }
  | { kind: "edit"; member: TeamMember }
  | { kind: "password"; member: TeamMember }
  | { kind: "delete"; member: TeamMember }
  | null;

export function TeamManager({ members, venues }: { members: TeamMember[]; venues: Venue[] }) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [key, setKey] = useState(0);
  const venueName = new Map(venues.map((v) => [v.id, v.name]));

  function open(next: Exclude<DialogState, null>) {
    setKey((k) => k + 1);
    setDialog(next);
  }
  const close = (o: boolean) => {
    if (!o) setDialog(null);
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121110]/85">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <h2 className="font-semibold">
            Все <span className="text-sm font-normal text-[var(--aura-muted)]">{members.length}</span>
          </h2>
          <PrimaryButton type="button" onClick={() => open({ kind: "add" })}>
            <UserPlus className="size-4" aria-hidden />
            Добавить
          </PrimaryButton>
        </div>
        <ul>
          {members.map((m, i) => (
            <li
              key={m.id}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/6" : ""}`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-sm font-semibold uppercase">
                {m.name.trim().charAt(0) || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {m.name}
                  {m.isSelf ? <span className="text-xs font-normal text-[var(--aura-muted)]">(вы)</span> : null}
                </p>
                <p className="truncate text-xs text-[var(--aura-muted)]">{m.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--aura-amber)]/20 px-2 py-0.5 text-[11px] font-medium text-[#f0a65a]">
                      <Shield className="size-3" aria-hidden />
                      Админ · все точки
                    </span>
                  ) : m.venueIds.length === 0 ? (
                    <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] text-red-300">
                      Нет доступа к точкам
                    </span>
                  ) : (
                    m.venueIds.map((v) => (
                      <span
                        key={v}
                        className="rounded-md bg-white/8 px-2 py-0.5 text-[11px] text-[var(--aura-white)]/85"
                      >
                        {venueName.get(v) ?? v}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[var(--aura-muted)] transition hover:bg-white/8 hover:text-[var(--aura-white)] data-[popup-open]:bg-white/10 md:size-9"
                  aria-label={`Действия: ${m.name}`}
                >
                  <MoreHorizontal className="size-4.5" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={menuContentClass}>
                  <DropdownMenuItem className={menuItemClass} onClick={() => open({ kind: "edit", member: m })}>
                    <Pencil className="size-4 text-[var(--aura-muted)]" aria-hidden />
                    {m.role === "admin" ? "Изменить имя" : "Имя и точки"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={menuItemClass}
                    disabled={m.protected}
                    onClick={() => open({ kind: "password", member: m })}
                  >
                    <KeyRound className="size-4 text-[var(--aura-muted)]" aria-hidden />
                    Сменить пароль
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={menuDangerClass}
                    disabled={m.protected || m.isSelf}
                    onClick={() => open({ kind: "delete", member: m })}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
        <p className="border-t border-white/8 px-4 py-3 text-xs text-[var(--aura-muted)]">
          Основных администраторов нельзя удалить, их пароль меняется в настройках Vercel.
        </p>
      </section>

      {dialog?.kind === "add" ? (
        <MemberDialog key={key} venues={venues} onOpenChange={close} />
      ) : null}
      {dialog?.kind === "edit" ? (
        <MemberDialog key={key} venues={venues} member={dialog.member} onOpenChange={close} />
      ) : null}
      {dialog?.kind === "password" ? (
        <PasswordDialog key={key} member={dialog.member} onOpenChange={close} />
      ) : null}
      {dialog?.kind === "delete" ? (
        <DeleteMemberDialog key={key} member={dialog.member} onOpenChange={close} />
      ) : null}
    </>
  );
}

function MemberDialog({
  venues,
  member,
  onOpenChange,
}: {
  venues: Venue[];
  member?: TeamMember;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = Boolean(member);
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [venueIds, setVenueIds] = useState<string[]>(
    member?.venueIds ?? (venues.length === 1 ? [venues[0].id] : []),
  );
  const { call, busy, error, setError } = useApi();
  const showVenues = member?.role !== "admin";

  function toggle(id: string) {
    setVenueIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (showVenues && venueIds.length === 0) {
      setError("Отметьте хотя бы одну точку");
      return;
    }
    const ok = member
      ? await call("/api/stash/team", "PATCH", {
          userId: member.id,
          name,
          ...(showVenues ? { venueIds } : {}),
        })
      : await call("/api/stash/team", "POST", { name, email, password, venueIds });
    if (ok) onOpenChange(false);
  }

  return (
    <AuraDialog
      open
      onOpenChange={onOpenChange}
      title={editing ? member!.name : "Новый сотрудник"}
      description={
        editing ? member!.email : "Сотрудник войдёт по этому email и паролю и увидит отмеченные точки."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Имя">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            autoFocus
            placeholder="Например: Саша (бар)"
            className={inputClass}
          />
        </Field>
        {!editing ? (
          <>
            <Field label="Email для входа">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                placeholder="name@example.com"
                className={inputClass}
              />
            </Field>
            <Field label="Пароль" hint="Минимум 8 символов. Передайте его сотруднику лично.">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
              />
            </Field>
          </>
        ) : null}
        {showVenues ? (
          <fieldset className="space-y-1.5">
            <legend className="text-xs text-[var(--aura-muted)]">Точки</legend>
            <div className="grid grid-cols-2 gap-2">
              {venues.map((v) => {
                const checked = venueIds.includes(v.id);
                return (
                  <label
                    key={v.id}
                    className={`flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 text-sm transition md:h-10 ${
                      checked
                        ? "border-[var(--aura-amber)]/50 bg-[var(--aura-amber)]/12"
                        : "border-white/12 bg-black/30 hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(v.id)}
                      className="size-4 accent-[#e86a17]"
                    />
                    {v.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        <ErrorText>{error}</ErrorText>
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Отмена
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Сохраняю…" : editing ? "Сохранить" : "Добавить"}
          </PrimaryButton>
        </div>
      </form>
    </AuraDialog>
  );
}

function PasswordDialog({
  member,
  onOpenChange,
}: {
  member: TeamMember;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const { call, busy, error } = useApi();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await call("/api/stash/team", "PATCH", { userId: member.id, password })) onOpenChange(false);
  }

  return (
    <AuraDialog
      open
      onOpenChange={onOpenChange}
      title="Новый пароль"
      description={`Для ${member.name} (${member.email}). Старый пароль перестанет работать.`}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Пароль" hint="Минимум 8 символов.">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Отмена
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={busy || password.length < 8}>
            {busy ? "Сохраняю…" : "Сохранить"}
          </PrimaryButton>
        </div>
      </form>
    </AuraDialog>
  );
}

function DeleteMemberDialog({
  member,
  onOpenChange,
}: {
  member: TeamMember;
  onOpenChange: (open: boolean) => void;
}) {
  const { call, busy, error } = useApi();
  return (
    <AuraDialog
      open
      onOpenChange={onOpenChange}
      title={`Удалить ${member.name}?`}
      description="Сотрудник сразу потеряет доступ к складу. Его записи в журнале останутся."
    >
      <div className="space-y-4">
        <ErrorText>{error}</ErrorText>
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Отмена
          </SecondaryButton>
          <DangerButton
            type="button"
            disabled={busy}
            onClick={async () => {
              if (await call("/api/stash/team", "DELETE", { userId: member.id })) onOpenChange(false);
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            {busy ? "Удаляю…" : "Удалить"}
          </DangerButton>
        </div>
      </div>
    </AuraDialog>
  );
}
