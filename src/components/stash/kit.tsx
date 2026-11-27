"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export function AuraDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-auto bottom-0 max-h-[92dvh] max-w-full translate-y-0 gap-4 overflow-y-auto rounded-t-2xl rounded-b-none border border-white/10 bg-[#141210] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[var(--aura-white)] ring-0 sm:top-1/2 sm:bottom-auto sm:max-w-md sm:-translate-y-1/2 sm:rounded-2xl sm:pb-5">
        <div className="space-y-1 pr-8">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-[var(--aura-muted)]">
              {description}
            </DialogDescription>
          ) : null}
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-[var(--aura-muted)]">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-[var(--aura-muted)]/80">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-11 w-full min-w-0 rounded-xl border border-white/12 bg-black/40 px-3 text-base outline-none placeholder:text-[var(--aura-muted)]/70 focus:border-[var(--aura-amber)] md:h-10 md:text-sm";

export function PrimaryButton({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--aura-glow)] px-4 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 md:h-10 ${className}`}
    />
  );
}

export function SecondaryButton({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 text-sm transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-50 md:h-10 ${className}`}
    />
  );
}

export function DangerButton({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex h-11 items-center justify-center gap-1.5 rounded-xl bg-red-500/15 px-4 text-sm font-semibold text-red-300 ring-1 ring-inset ring-red-400/30 transition hover:bg-red-500/25 active:scale-[0.98] disabled:opacity-50 md:h-10 ${className}`}
    />
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-red-400">{children}</p>;
}

export const menuContentClass = "min-w-48 rounded-xl border border-white/10 bg-[#171513] p-1 ring-0";
export const menuItemClass =
  "min-h-10 gap-2.5 rounded-lg px-2.5 text-sm text-[var(--aura-white)] focus:bg-white/8 focus:text-[var(--aura-white)] md:min-h-9";
export const menuDangerClass = `${menuItemClass} text-red-300 focus:bg-red-500/15 focus:text-red-300`;

/** JSON request that refreshes server data on success. */
export function useApi() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(
    url: string,
    method: "POST" | "PATCH" | "DELETE",
    body: unknown,
  ): Promise<boolean> {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Не получилось, попробуйте ещё раз");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Нет связи с сервером");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { call, busy, error, setError };
}
