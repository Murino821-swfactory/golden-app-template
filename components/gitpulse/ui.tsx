"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GitpulseCopy } from "@/lib/gitpulse/copy";
import type { UiError } from "@/lib/gitpulse/types";

/** The studio's shared bits: a numbered step card, error line, cost chip, option pills. */

const emptySubscribe = () => () => {};

/** False in the prerender and during hydration, true after — without setState in an effect. */
export function useHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function StepCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function ErrorLine({ error, copy }: { error: UiError | null; copy: GitpulseCopy }) {
  if (!error) return null;
  return <p className="text-sm text-destructive" role="alert">{copy.errors[error]}</p>;
}

/** Spend transparency is brand: every paid result names its exact cost. */
export function CostChip({ label, costUsd }: { label: string; costUsd: number | null }) {
  if (costUsd === null) return null;
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
      {label}: ${costUsd.toFixed(4)}
    </span>
  );
}

export function PillGroup<T extends string>({ options, value, onChange, labels, disabled }: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels: Record<T, string>;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          aria-pressed={option === value}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
            option === value
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}
