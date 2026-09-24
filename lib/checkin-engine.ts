/**
 * checkin-engine.ts — the daily five-pillar check-in (OTH-84) as pure functions.
 *
 * The log lives in the visitor's browser (localStorage), keyed by local calendar day
 * ("YYYY-MM-DD"). Day arithmetic runs on those keys in UTC, so a daylight-saving change can
 * never turn one day into two or none.
 */

export const PILLARS = [
  { id: "work" },
  { id: "fitness" },
  { id: "mind" },
  { id: "relationships" },
  { id: "habits" },
] as const;

export type PillarId = (typeof PILLARS)[number]["id"];
export type DayKey = string;

export interface DayEntry {
  done: PillarId[];
  note?: string;
}

export type CheckinLog = Record<DayKey, DayEntry>;

export const NOTE_MAX = 280;
export const STORAGE_KEY = "unbroken:checkins:v1";

const PILLAR_IDS = new Set<string>(PILLARS.map((p) => p.id));
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Days ──────────────────────────────────────────────────────────────────────────────

function parts(key: DayKey): [number, number, number] {
  const [y, m, d] = key.split("-").map(Number);
  return [y!, m!, d!];
}

function utc(key: DayKey): Date {
  const [y, m, d] = parts(key);
  return new Date(Date.UTC(y, m - 1, d));
}

function keyOfUtc(date: Date): DayKey {
  return date.toISOString().slice(0, 10);
}

/** The visitor's local calendar day. */
export function todayKey(now = new Date()): DayKey {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function addDays(key: DayKey, n: number): DayKey {
  const date = utc(key);
  date.setUTCDate(date.getUTCDate() + n);
  return keyOfUtc(date);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(key: DayKey): number {
  return (utc(key).getUTCDay() + 6) % 7;
}

export function isValidDay(key: string): boolean {
  return KEY_RE.test(key) && keyOfUtc(utc(key)) === key;
}

// ── Edits ─────────────────────────────────────────────────────────────────────────────

function withDay(log: CheckinLog, day: DayKey, entry: DayEntry): CheckinLog {
  const next = { ...log };
  if (entry.done.length === 0 && !entry.note) delete next[day];
  else next[day] = entry;
  return next;
}

export function toggle(log: CheckinLog, day: DayKey, pillar: PillarId): CheckinLog {
  const entry = log[day] ?? { done: [] };
  const done = entry.done.includes(pillar)
    ? entry.done.filter((p) => p !== pillar)
    : PILLARS.map((p) => p.id).filter((id) => id === pillar || entry.done.includes(id));
  return withDay(log, day, { ...entry, done });
}

export function setNote(log: CheckinLog, day: DayKey, note: string): CheckinLog {
  const entry = log[day] ?? { done: [] };
  const trimmed = note.trim().slice(0, NOTE_MAX);
  return withDay(log, day, trimmed ? { done: entry.done, note: trimmed } : { done: entry.done });
}

// ── Metrics ───────────────────────────────────────────────────────────────────────────

function doneOn(log: CheckinLog, day: DayKey, pillar: PillarId | "all"): boolean {
  const done = log[day]?.done ?? [];
  return pillar === "all" ? done.length === PILLARS.length : done.includes(pillar);
}

/**
 * Current and best run of consecutive days. An unfinished TODAY does not break the current
 * run — the day is not over — so it counts back from yesterday until today is checked.
 */
export function streak(
  log: CheckinLog,
  today: DayKey,
  pillar: PillarId | "all"
): { current: number; best: number } {
  let current = 0;
  let day = doneOn(log, today, pillar) ? today : addDays(today, -1);
  while (doneOn(log, day, pillar)) {
    current++;
    day = addDays(day, -1);
  }

  let best = 0;
  let run = 0;
  let prev: DayKey | null = null;
  for (const key of Object.keys(log).filter((k) => k <= today).sort()) {
    if (!doneOn(log, key, pillar)) {
      run = 0;
      prev = key;
      continue;
    }
    run = prev !== null && addDays(prev, 1) === key && doneOn(log, prev, pillar) ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return { current, best: Math.max(best, current) };
}

/** Percent (0–100, rounded) of pillar-days done in the `days` ending today. */
export function consistency(log: CheckinLog, today: DayKey, days: number): number {
  let done = 0;
  for (let i = 0; i < days; i++) done += log[addDays(today, -i)]?.done.length ?? 0;
  return Math.round((100 * done) / (days * PILLARS.length));
}

/**
 * Share of days each pillar was done in the Monday–Sunday week containing `day`. Only days
 * already lived count in the denominator, so Thursday's radar is not punished for Sunday.
 */
export function weekBalance(
  log: CheckinLog,
  day: DayKey,
  today: DayKey
): { start: DayKey; end: DayKey; values: Record<PillarId, number> } {
  const start = addDays(day, -weekdayIndex(day));
  const end = addDays(start, 6);
  const lived = Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter((d) => d <= today);
  const values = Object.fromEntries(
    PILLARS.map(({ id }) => [
      id,
      lived.length === 0 ? 0 : lived.filter((d) => doneOn(log, d, id)).length / lived.length,
    ])
  ) as Record<PillarId, number>;
  return { start, end, values };
}

export interface HeatCell {
  key: DayKey;
  /** Pillars done that day, 0–5. */
  count: number;
  future: boolean;
}

/** The month containing `day` as Monday-first week columns; `null` pads days outside it. */
export function monthHeat(
  log: CheckinLog,
  day: DayKey,
  today: DayKey
): { month: DayKey; weeks: (HeatCell | null)[][] } {
  const [y, m] = parts(day);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const weeks: (HeatCell | null)[][] = [];
  let week: (HeatCell | null)[] = Array(weekdayIndex(first)).fill(null);
  for (let key = first; parts(key)[1] === m; key = addDays(key, 1)) {
    week.push({ key, count: log[key]?.done.length ?? 0, future: key > today });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push([...week, ...Array(7 - week.length).fill(null)]);
  return { month: first, weeks };
}

// ── Storage ───────────────────────────────────────────────────────────────────────────

/** Whatever localStorage returns — including nothing, or something a bug wrote. */
export function parseLog(raw: string | null): CheckinLog {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};

  const log: CheckinLog = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (!isValidDay(key) || !value || typeof value !== "object") continue;
    const { done, note } = value as { done?: unknown; note?: unknown };
    const pillars = Array.isArray(done) ? done.filter((p): p is PillarId => PILLAR_IDS.has(p as string)) : [];
    const text = typeof note === "string" ? note.trim().slice(0, NOTE_MAX) : "";
    if (pillars.length === 0 && !text) continue;
    log[key] = text ? { done: pillars, note: text } : { done: pillars };
  }
  return log;
}
