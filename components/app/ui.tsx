"use client";

import { type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * The workspace's small vocabulary of surfaces. One hue per palette (the template's rule), so
 * emphasis is weight, border and surface — and the destructive token for what is late.
 */

export function PageHeader({ title, intro, actions, children }: { title: string; intro?: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {intro && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{intro}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export type Tone = "neutral" | "accent" | "danger" | "muted";

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone === "neutral" && "border-border bg-card text-foreground",
        tone === "accent" && "border-primary bg-primary text-primary-foreground",
        tone === "danger" && "border-destructive/60 bg-destructive/10 text-destructive",
        tone === "muted" && "border-border/60 text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, hint, tone = "neutral", href }: { label: string; value: string; hint?: string; tone?: Tone; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-heading text-2xl font-semibold tabular-nums sm:text-3xl", tone === "danger" && "text-destructive")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const className = "block rounded-xl border border-border bg-card p-4 text-card-foreground";
  return href ? <a href={href} className={cn(className, "transition-colors hover:bg-muted")}>{body}</a> : <div className={className}>{body}</div>;
}

export function Panel({ title, action, children, className, id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("rounded-xl border border-border bg-card text-card-foreground", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          {title && <h2 className="font-heading text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Avatar({ initials, size = "sm", title }: { initials: string; size?: "sm" | "md"; title?: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-muted font-semibold text-foreground", size === "sm" ? "size-7 text-[0.65rem]" : "size-10 text-sm")}
    >
      {initials}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export function Progress({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{pct} %</span>
    </div>
  );
}

export const fieldClass = "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50 sm:text-sm";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block min-w-0 space-y-1 text-sm", className)}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldClass, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldClass, "h-auto min-h-24 py-2 leading-relaxed", props.className)} />;
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className="min-h-10 shrink-0 rounded-full border border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-selected:border-border aria-selected:bg-card aria-selected:text-foreground"
        >
          {t.label}
          {t.count !== undefined && <> <span className="ml-1 rounded-full bg-muted px-1.5 text-xs tabular-nums">{t.count}</span></>}
        </button>
      ))}
    </div>
  );
}

/** A row that is a card on a phone and a line on a desktop. */
export function Row({ children, onClick, href, selected, className }: { children: ReactNode; onClick?: () => void; href?: string; selected?: boolean; className?: string }) {
  const classes = cn(
    "block w-full rounded-lg border border-border bg-card p-3 text-left text-sm text-card-foreground transition-colors",
    (onClick || href) && "hover:bg-muted",
    selected && "border-primary",
    className
  );
  if (href) return <a href={href} className={classes}>{children}</a>;
  if (onClick) return <button type="button" onClick={onClick} className={classes}>{children}</button>;
  return <div className={classes}>{children}</div>;
}

export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{it.label}</dt>
          <dd className="mt-0.5 break-words">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Notice({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "danger" ? "border-destructive/60 bg-destructive/10 text-destructive" : tone === "accent" ? "border-primary/60 bg-primary/10" : "border-border bg-muted/40"
      )}
    >
      {children}
    </div>
  );
}
