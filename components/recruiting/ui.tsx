"use client";

import { type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, useId } from "react";
import { Dialog as DialogPrimitive, DropdownMenu as DropdownPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApplicationStage } from "@/lib/recruiting/model";

/**
 * ui.tsx — the workspace's own primitives, on top of the template's shadcn pieces.
 *
 * Layout and surfaces use the palette tokens, so "Change colour" repaints everything.
 * The five status tones are fixed on purpose: a stage, a consent state or an overdue task
 * carry meaning, and meaning must not change with the palette (same rule the matcher's
 * score colours follow).
 */

export type Tone = "neutral" | "good" | "warn" | "bad" | "info" | "accent";

const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-foreground/10",
  good: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/35",
  warn: "bg-amber-400/10 text-amber-200 ring-amber-400/35",
  bad: "bg-rose-400/10 text-rose-200 ring-rose-400/40",
  info: "bg-sky-400/10 text-sky-200 ring-sky-400/35",
  accent: "bg-foreground text-background ring-foreground",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60",
  good: "bg-emerald-400",
  warn: "bg-amber-400",
  bad: "bg-rose-400",
  info: "bg-sky-400",
  accent: "bg-foreground",
};

export const STAGE_TONE: Record<ApplicationStage, Tone> = {
  sourced: "neutral",
  screening: "info",
  submitted: "info",
  interview: "warn",
  offer: "warn",
  placed: "good",
  rejected: "bad",
};

export function scoreTone(score: number | null): Tone {
  if (score === null) return "neutral";
  if (score >= 70) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

export function Pill({ tone = "neutral", className, children, title }: { tone?: Tone; className?: string; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONE[tone], className)}>
      {children}
    </span>
  );
}

export function Dot({ tone }: { tone: Tone }) {
  return <span aria-hidden className={cn("size-2 shrink-0 rounded-full", TONE_DOT[tone])} />;
}

export function PageHeader({ title, intro, actions, children }: { title: string; intro?: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {intro && <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">{intro}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, hint, actions, className, children, id }: { title?: string; hint?: string; actions?: ReactNode; className?: string; children: ReactNode; id?: string }) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={title ? headingId : undefined} className={cn("rounded-2xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 sm:p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 id={headingId} className="text-base font-semibold">{title}</h2>}
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function KpiTile({ label, value, hint, tone = "neutral" }: { label: string; value: string | number; hint?: string; tone?: Tone }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl", tone === "good" && "text-emerald-300", tone === "warn" && "text-amber-300", tone === "bad" && "text-rose-300")}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const parts = name.trim().split(/\s+/);
  const text = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  return (
    <span aria-hidden className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold", className)}>
      {text}
    </span>
  );
}

// ── Forms ─────────────────────────────────────────────────────────────────────────────

export const fieldClass =
  "min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:text-sm";

export function Field({ label, hint, required, children, className }: { label: string; hint?: string; required?: boolean; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span aria-hidden className="text-muted-foreground"> *</span>}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, className)} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldClass, "min-h-28 resize-y leading-relaxed", className)} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(fieldClass, className)}>
      {children}
    </select>
  );
}

export function Checkbox({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (next: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-4 accent-[var(--foreground)]" />
      <label htmlFor={id} className="text-sm">
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </label>
    </div>
  );
}

export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}

// ── Overlays ──────────────────────────────────────────────────────────────────────────

/**
 * A bottom sheet on phones, a right-hand panel from `sm` up — the home of every detail
 * view and form, so the list behind it never loses its place.
 */
export function Drawer({
  open, onOpenChange, title, description, children, closeLabel, wide, footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  closeLabel: string;
  wide?: boolean;
  footer?: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border border-border bg-card text-card-foreground shadow-lg",
            "sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-none sm:w-full sm:rounded-none sm:border-y-0 sm:border-r-0 sm:border-l",
            wide ? "sm:max-w-3xl" : "sm:max-w-xl"
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-5" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
          {footer && <div className="border-t border-border bg-background/40 px-5 py-3">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmDialog({
  open, onOpenChange, title, text, confirmLabel, cancelLabel, onConfirm, destructive,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60" />
        <DialogPrimitive.Content className="fixed inset-x-4 top-1/2 z-[60] -translate-y-1/2 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-lg sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2">
          <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">{text}</DialogPrimitive.Description>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <DialogPrimitive.Close className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted">{cancelLabel}</DialogPrimitive.Close>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className={cn(
                "min-h-11 rounded-lg px-4 text-sm font-medium",
                destructive ? "bg-rose-400/15 text-rose-200 ring-1 ring-inset ring-rose-400/40 hover:bg-rose-400/25" : "bg-foreground text-background hover:bg-foreground/90"
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export interface MenuItem {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

/** A small action menu: the "⋯" on a card or a row. */
export function ActionMenu({ label, items, trigger }: { label: string; items: MenuItem[]; trigger: ReactNode }) {
  return (
    <DropdownPrimitive.Root modal={false}>
      <DropdownPrimitive.Trigger asChild aria-label={label}>
        {trigger}
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 rounded-xl border border-border bg-card p-1 text-sm text-card-foreground shadow-lg"
        >
          {items.map((item) => (
            <DropdownPrimitive.Item
              key={item.label}
              disabled={item.disabled}
              onSelect={item.onSelect}
              className={cn(
                "flex min-h-10 cursor-pointer select-none items-center rounded-lg px-3 outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-40",
                item.tone === "danger" && "text-rose-300"
              )}
            >
              {item.label}
            </DropdownPrimitive.Item>
          ))}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

// ── Lists ─────────────────────────────────────────────────────────────────────────────

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-border p-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("min-h-9 whitespace-nowrap rounded-md px-3 text-sm", value === o.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Bar({ value, max, label, meta, tone = "accent" }: { value: number; max: number; label: string; meta: string; tone?: Tone }) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{meta}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10" aria-hidden>
        <div className={cn("h-full rounded-full", TONE_DOT[tone])} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
}

/** Cards under `sm`, a table from `sm` up — the shape the template's grid already uses. */
export function DataList<T extends { id: string }>({
  rows, columns, onOpen, openLabel, renderCard, ariaLabel,
}: {
  rows: T[];
  columns: Column<T>[];
  onOpen: (row: T) => void;
  openLabel: string;
  renderCard: (row: T) => ReactNode;
  ariaLabel: string;
}) {
  return (
    <>
      <ul className="space-y-2 sm:hidden" aria-label={ariaLabel}>
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onOpen(row)}
              className="w-full rounded-xl bg-card p-4 text-left ring-1 ring-foreground/10 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {renderCard(row)}
            </button>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-2xl ring-1 ring-foreground/10 sm:block">
        <table className="w-full text-sm" aria-label={ariaLabel}>
          <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col" className={cn("px-4 py-3 font-medium", col.className)}>
                  {col.label}
                </th>
              ))}
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border/60 transition-colors hover:bg-muted/40 motion-reduce:transition-none">
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 align-middle", col.className)}>
                    {col.render(row)}
                  </td>
                ))}
                <td className="px-2 py-2 text-right">
                  <button type="button" onClick={() => onOpen(row)} className="min-h-10 rounded-md px-3 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {openLabel}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function PrimaryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 [&_svg]:size-4",
        className
      )}
    />
  );
}

export function SecondaryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 [&_svg]:size-4",
        className
      )}
    />
  );
}

export function TextButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-40 [&_svg]:size-4", className)}
    />
  );
}
