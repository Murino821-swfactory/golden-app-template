"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * quota-countdown — a prominent card at the top of the dashboard that counts down to the
 * next quota reset and shows, at a glance, whether the agents are running or waiting.
 *
 * Fully controlled: the `target` reset time and its setter live in the dashboard so the
 * Quick Log parser can push a detected reset time into the same timer. `target === null`
 * (or a target in the past) means "all models active" — green; a future target means the
 * primary agent is sleeping until it — amber.
 */

export interface QuotaCountdownProps {
  /** The next reset time, or null when nothing is scheduled. */
  target: Date | null;
  /** Called when the user picks a preset, a custom time, or clears the timer. */
  onChange: (target: Date | null) => void;
  className?: string;
}

/** The next time the wall clock reads `hour:minute` in the visitor's local zone. Pure. */
export function nextOccurrence(hour: number, minute = 0, from: Date = new Date()): Date {
  const d = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
    hour,
    minute,
    0,
    0
  );
  if (d.getTime() <= from.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** A Date as the value a `datetime-local` input expects: local "YYYY-MM-DDTHH:mm". */
function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function QuotaCountdown({ target, onChange, className }: QuotaCountdownProps) {
  const t = useTranslations("quota");

  // `now` starts null and is only set in an effect, so the server render and the first
  // client render agree (both show "active") and the ticking clock never trips hydration.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = target && now !== null ? target.getTime() - now : 0;
  const sleeping = target !== null && remainingMs > 0;

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  function handleCustom(value: string) {
    if (!value) {
      onChange(null);
      return;
    }
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) onChange(d);
  }

  return (
    <Card className={cn("", className)} data-testid="quota-countdown">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="size-4" aria-hidden />
            {t("title")}
          </div>
          <span
            role="status"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              sleeping
                ? "border-amber-500/30 bg-amber-500/15 text-amber-400"
                : "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                sleeping ? "bg-amber-400" : "bg-emerald-400"
              )}
            />
            {sleeping ? t("sleeping") : t("active")}
          </span>
        </div>

        <div>
          {sleeping ? (
            <>
              <div className="text-xs text-muted-foreground">{t("resetsIn")}</div>
              <div
                aria-live="polite"
                className="font-mono text-3xl font-bold tabular-nums sm:text-4xl"
              >
                {pad(hours)}:{pad(minutes)}:{pad(seconds)}
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold">{t("active")}</div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11"
            onClick={() => onChange(nextOccurrence(3, 0))}
          >
            {t("preset3am")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11"
            onClick={() => onChange(new Date(Date.now() + 5 * 60 * 60 * 1000))}
          >
            {t("presetPlus5h")}
          </Button>
          <label className="flex items-center gap-2">
            <span className="sr-only">{t("customLabel")}</span>
            <input
              type="datetime-local"
              aria-label={t("customLabel")}
              value={target ? toLocalInputValue(target) : ""}
              onChange={(e) => handleCustom(e.target.value)}
              className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          {target && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="min-h-11"
              onClick={() => onChange(null)}
            >
              {t("clear")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
