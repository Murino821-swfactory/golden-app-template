/**
 * store.ts — what the growth plan remembers in this browser: the checklist ticks, the
 * weekly numbers, the goals, the leads and the coupon code. The same hydration-safe
 * stored values as the studio's publish log (`lib/studio/client-store.ts`); nothing here
 * leaves the browser.
 */
import { createStoredValue } from "@/lib/studio/client-store";
import { parseLeads, type Lead } from "./leads";
import { DEFAULT_GOALS, EMPTY_METRICS, METRIC_KEYS, type Goals, type WeekMetrics } from "./report";

const EMPTY_LIST: string[] = [];
const EMPTY_LEADS: Lead[] = [];
const EMPTY_METRICS_MAP: Record<string, WeekMetrics> = {};

function parseStringList(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : EMPTY_LIST;
  } catch {
    return EMPTY_LIST;
  }
}

function toCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function parseMetricsMap(raw: string): Record<string, WeekMetrics> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return EMPTY_METRICS_MAP;
    const out: Record<string, WeekMetrics> = {};
    for (const [week, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || typeof value !== "object" || value === null) continue;
      const v = value as Record<string, unknown>;
      out[week] = { ...EMPTY_METRICS };
      for (const key of METRIC_KEYS) out[week][key] = toCount(v[key]);
    }
    return out;
  } catch {
    return EMPTY_METRICS_MAP;
  }
}

export function parseGoals(raw: string): Goals {
  try {
    const parsed = JSON.parse(raw) as Partial<{ weekly: Partial<Goals["weekly"]>; monthly: Partial<Goals["monthly"]> }>;
    return {
      weekly: {
        pieces: toCount(parsed.weekly?.pieces ?? DEFAULT_GOALS.weekly.pieces),
        reach: toCount(parsed.weekly?.reach ?? DEFAULT_GOALS.weekly.reach),
        registrations: toCount(parsed.weekly?.registrations ?? DEFAULT_GOALS.weekly.registrations),
      },
      monthly: {
        registrations: toCount(parsed.monthly?.registrations ?? DEFAULT_GOALS.monthly.registrations),
        followers: toCount(parsed.monthly?.followers ?? DEFAULT_GOALS.monthly.followers),
      },
    };
  } catch {
    return DEFAULT_GOALS;
  }
}

export const checklistStore = createStoredValue<string[]>("gitpulse.growth.checklist.v1", EMPTY_LIST, parseStringList, (v) => JSON.stringify(v));
export const metricsStore = createStoredValue<Record<string, WeekMetrics>>("gitpulse.growth.metrics.v1", EMPTY_METRICS_MAP, parseMetricsMap, (v) => JSON.stringify(v));
export const goalsStore = createStoredValue<Goals>("gitpulse.growth.goals.v1", DEFAULT_GOALS, parseGoals, (v) => JSON.stringify(v));
export const leadsStore = createStoredValue<Lead[]>("gitpulse.growth.leads.v1", EMPTY_LEADS, parseLeads, (v) => JSON.stringify(v));
export const couponStore = createStoredValue<string>("gitpulse.growth.coupon.v1", "", (raw) => raw.slice(0, 40), (v) => v);
