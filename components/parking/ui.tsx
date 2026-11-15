"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FirestoreError } from "firebase/firestore";
import { RECORD_LIMIT, writeErrorKind } from "@/lib/records";
import type { FormError, SpotStatus } from "@/lib/parking";
import { cn } from "@/lib/utils";

/**
 * Status is drawn by SHAPE as well as tone — filled, outlined, muted and struck through —
 * because a palette of two colours has one accent: three hues would not survive
 * "Change colour". The same three looks are the pins on the map and the legend under it.
 */
export const STATUS_LOOK: Record<SpotStatus, string> = {
  available: "border-primary bg-primary text-primary-foreground",
  reserved: "border-primary bg-card text-primary",
  occupied: "border-border bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ status, className }: { status: SpotStatus; className?: string }) {
  const t = useTranslations("parking");
  return (
    <span data-status={status} className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span aria-hidden className={cn("inline-flex size-6 items-center justify-center rounded-full border-2 text-xs font-semibold", STATUS_LOOK[status])}>
        P
      </span>
      {t(`status.${status}`)}
    </span>
  );
}

export function FormField({
  id,
  label,
  hint,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-primary" aria-hidden>*</span>}
        {hint && <span className="ml-1">({hint})</span>}
      </label>
      {children}
      {error && <p id={`${id}-error`} className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export const CONTROL = "h-11 w-full rounded-md border border-border bg-background px-3 text-base sm:text-sm";

/** One sentence per form error. `conflict` names the reservation in the way. */
export function useFormErrorText(): (error: FormError | undefined) => string | undefined {
  const t = useTranslations("parking.errors");
  return (error) => {
    if (!error) return undefined;
    switch (error.code) {
      case "required":
        return error.key === "plate" ? t("plateRequired") : t("spotRequired");
      case "format":
        return error.key === "plate" ? t("plateFormat") : error.key === "date" ? t("dateFormat") : t("timeFormat");
      case "order":
        return t("order");
      case "past":
        return t("past");
      case "conflict":
        return t("conflict", { from: error.with?.from ?? "", to: error.with?.to ?? "" });
      case "duplicate":
        return t("plateDuplicate");
      case "tooLong":
        return t("tooLong");
    }
  };
}

/** What a refused write means, in the grid's own words (limit / denied / try again). */
export function useWriteErrorText(count: number): (err: unknown, op: "create" | "update" | "delete") => string {
  const t = useTranslations("dataGrid");
  return (err, op) => {
    console.error(`[parking] ${op} failed:`, err);
    const kind = writeErrorKind(err instanceof FirestoreError ? err.code : undefined, count, op);
    return kind === "limit" ? t("limitReached", { limit: RECORD_LIMIT }) : kind === "denied" ? t("permissionDenied") : t("loadError");
  };
}

/** "Sat 14 Nov" in the language on screen, from the stored YYYY-MM-DD (a wall-clock day). */
export function useDayLabel(): (date: string) => string {
  const locale = useLocale();
  return (date) => {
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return date;
    try {
      return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
    } catch {
      return date;
    }
  };
}
