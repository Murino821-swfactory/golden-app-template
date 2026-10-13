"use client";

import { Award, CalendarCheck, Footprints, RotateCcw, Scale, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCOPES, SPECIAL_BADGES, STREAK_TIERS, tierReached, type Badge, type SpecialBadgeId } from "@/lib/checkin-engine";
import { COPY, scopeLabel, type CheckinLocale } from "@/lib/checkin-copy";

/**
 * The trophy case: streak tiers per pillar (and for all five) as a ladder, and six special
 * badges. Personal, not social — a private utility shows badges to the one person they
 * belong to (research 2026-10-13: visible-to-self tiers work for private apps; leaderboards
 * need segments and a backend, and are a later decision).
 */

const SPECIAL_ICON: Record<SpecialBadgeId, LucideIcon> = {
  "first-checkin": Footprints,
  comeback: RotateCcw,
  "shield-saved": Shield,
  "perfect-week": CalendarCheck,
  "balanced-week": Scale,
  century: Award,
};

export function TrophyCase({
  badges,
  locale,
  formatDate,
}: {
  badges: readonly Badge[];
  locale: CheckinLocale;
  formatDate: (key: string) => string;
}) {
  const c = COPY[locale];
  const earned = new Map(badges.map((b) => [b.id, b.earnedOn]));

  return (
    <div className="space-y-5">
      {badges.length === 0 && <p className="text-sm text-muted-foreground">{c.trophiesEmpty}</p>}

      <ul className="space-y-2" aria-label={c.trophiesTitle}>
        {SCOPES.map((scope) => {
          const label = scopeLabel(c, scope);
          const top = tierReached(badges, scope);
          return (
            <li key={scope} className="flex items-center gap-3" data-testid={`tiers-${scope}`} data-tier={top ?? 0}>
              <span className="w-24 shrink-0 truncate text-sm font-medium">{label}</span>
              <ol className="flex flex-1 items-center gap-1.5">
                {STREAK_TIERS.map((tier) => {
                  const has = earned.has(`streak-${scope}-${tier}`);
                  return (
                    <li
                      key={tier}
                      aria-label={has ? c.tierBadge(label, tier) : c.tierLocked(label, tier)}
                      className={cn(
                        "flex h-7 min-w-8 flex-1 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums ring-1 ring-inset transition-colors",
                        has ? "bg-primary text-primary-foreground ring-primary" : "text-muted-foreground ring-border"
                      )}
                    >
                      {tier}
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ul>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SPECIAL_BADGES.map((id) => {
          const Icon = SPECIAL_ICON[id];
          const on = earned.get(id);
          const text = c.specialBadge[id];
          return (
            <li
              key={id}
              data-testid={`badge-${id}`}
              data-earned={on ? "true" : "false"}
              className={cn(
                "flex gap-3 rounded-lg p-3 ring-1 ring-inset",
                on ? "bg-primary/10 ring-primary/50" : "ring-border opacity-70"
              )}
            >
              <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", on ? "text-primary" : "text-muted-foreground")} />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{text.title}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{on ? c.earnedOn(formatDate(on)) : c.locked}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
