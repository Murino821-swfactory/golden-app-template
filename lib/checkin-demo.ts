import { PILLARS, addDays, level, streak, xp, type CheckinLog, type DayKey, type LevelInfo, type StreakInfo } from "./checkin-engine";

/**
 * The landing's check-in demo (T-384, from the T-344 v3 redesign): thirteen past days with day 10 missed, run by the
 * app's own engine — the shield earned at day 7 covers day 10, so the streak survives; today is the visitor's to
 * tick. A fixed date keeps the page the same at build time and in the browser. Pure; pinned by
 * tests/checkin-demo.spec.ts.
 */
export const DEMO_TODAY: DayKey = "2026-11-08";
const PAST = 13;
const MISSED = 10;

export function demoLog(): CheckinLog {
  const log: CheckinLog = {};
  for (let n = 1; n <= PAST; n++) {
    if (n === MISSED) continue;
    log[addDays(DEMO_TODAY, n - PAST - 1)] = { done: PILLARS.map((p) => p.id) };
  }
  return log;
}

export type DemoDayKind = "done" | "shielded" | "missed" | "today";

export interface DemoState {
  days: { day: DayKey; kind: DemoDayKind }[];
  streak: StreakInfo;
  xp: number;
  level: LevelInfo;
}

export function demoState(log: CheckinLog): DemoState {
  const info = streak(log, DEMO_TODAY, "all");
  const days: DemoState["days"] = [];
  for (let n = 1; n <= PAST + 1; n++) {
    const day = addDays(DEMO_TODAY, n - PAST - 1);
    const done = (log[day]?.done.length ?? 0) === PILLARS.length;
    const kind: DemoDayKind = done ? "done" : day === DEMO_TODAY ? "today" : info.protectedDays.includes(day) ? "shielded" : "missed";
    days.push({ day, kind });
  }
  const total = xp(log, DEMO_TODAY);
  return { days, streak: info, xp: total, level: level(total) };
}
