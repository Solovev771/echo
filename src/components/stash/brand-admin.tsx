"use client";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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

function BrandNameDialog({
  open,
  onOpenChange,
  title,
  initialName,
  onSubmit,
  busy,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialName: string;
  onSubmit: (name: string) => void;
  busy: boolean;
  error: string;
}) {
  const [name, setName] = useState(initialName);
  return (
    <AuraDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Бренд общий для обеих точек."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(name);
        }}
        className="space-y-4"
      >
        <Field label="Название бренда">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            autoFocus
            placeholder="Например: Tangiers"
            className={inputClass}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Отмена
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={busy || !name.trim()}>
            {busy ? "Сохраняю…" : "Сохранить"}
          </PrimaryButton>
        </div>
      </form>
    </AuraDialog>
  );
}

export function AddBrandButton({ venueSlug }: { venueSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(name: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stash/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error || "Не получилось добавить бренд");
        return;
      }
      setOpen(false);
      router.push(`/stash/${venueSlug}/${data.id}`);
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PrimaryButton
        type="button"
        onClick={() => {
          setError("");
          setKey((k) => k + 1);
          setOpen(true);
        }}
        className="shrink-0"
      >
        <Plus className="size-4" aria-hidden />
        Бренд
      </PrimaryButton>
      {open ? (
        <BrandNameDialog
          key={key}
          open
          onOpenChange={setOpen}
          title="Новый бренд"
          initialName=""
          onSubmit={create}
          busy={busy}
          error={error}
        />
      ) : null}
    </>
  );
}

export function BrandMenu({
  venueSlug,
  brand,
  flavorCount,
}: {
  venueSlug: string;
  brand: { id: string; name: string };
  flavorCount: number;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const { call, busy, error, setError } = useApi();

  function open(next: "rename" | "delete") {
    setError("");
    setDialog(next);
  }
  const close = (o: boolean) => {
    if (!o) setDialog(null);
  };

  async function rename(name: string) {
    if (await call("/api/stash/brands", "PATCH", { brandId: brand.id, name })) setDialog(null);
  }

  async function remove() {
    if (await call("/api/stash/brands", "DELETE", { brandId: brand.id })) {
      setDialog(null);
      router.replace(`/stash/${venueSlug}`);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex size-10 items-center justify-center rounded-lg border border-white/12 text-[var(--aura-muted)] transition hover:border-[var(--aura-amber)]/45 hover:text-[var(--aura-white)] data-[popup-open]:bg-white/10 md:size-9"
          aria-label="Действия с брендом"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={menuContentClass}>
          <DropdownMenuItem className={menuItemClass} onClick={() => open("rename")}>
            <Pencil className="size-4 text-[var(--aura-muted)]" aria-hidden />
            Переименовать бренд
          </DropdownMenuItem>
          <DropdownMenuItem className={menuDangerClass} onClick={() => open("delete")}>
            <Trash2 className="size-4" aria-hidden />
            Удалить бренд
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dialog === "rename" ? (
        <BrandNameDialog
          open
          onOpenChange={close}
          title="Переименовать бренд"
          initialName={brand.name}
          onSubmit={rename}
          busy={busy}
          error={error}
        />
      ) : null}

      {dialog === "delete" ? (
        <AuraDialog
          open
          onOpenChange={close}
          title={`Удалить бренд «${brand.name}»?`}
          description={
            flavorCount > 0
              ? `В бренде ${flavorCount} ${plural(flavorCount, "аромат", "аромата", "ароматов")}. Удалить можно только пустой бренд — сначала удалите ароматы.`
              : "Бренд пропадёт на обеих точках."
          }
        >
          <div className="space-y-4">
            <ErrorText>{error}</ErrorText>
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton type="button" onClick={() => setDialog(null)}>
                {flavorCount > 0 ? "Понятно" : "Отмена"}
              </SecondaryButton>
              <DangerButton type="button" onClick={remove} disabled={busy || flavorCount > 0}>
                <Trash2 className="size-4" aria-hidden />
                Удалить
              </DangerButton>
            </div>
          </div>
        </AuraDialog>
      ) : null}
    </>
  );
}

export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
