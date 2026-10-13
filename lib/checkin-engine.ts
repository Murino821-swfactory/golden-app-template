/**
 * checkin-engine.ts — the daily five-pillar check-in (OTH-84) as pure functions, plus the
 * motivation layer added 2026-10-13: shields (streak protection), XP and levels, badges,
 * today's focus, the weekly recap, and the compact codec the cloud copy is stored in.
 *
 * The log lives in the visitor's browser (localStorage), keyed by local calendar day
 * ("YYYY-MM-DD"), and — once signed in — as one compact document in their Firestore
 * sandbox. Day arithmetic runs on those keys in UTC, so a daylight-saving change can never
 * turn one day into two or none.
 *
 * Everything below is DERIVED from the log: shields, XP, levels and badges are never stored,
 * so there is nothing to migrate, nothing to get out of sync, and a retroactive edit of any
 * day re-derives every number with it.
 */

export const PILLARS = [
  { id: "work" },
  { id: "fitness" },
  { id: "mind" },
  { id: "relationships" },
  { id: "habits" },
] as const;

export type PillarId = (typeof PILLARS)[number]["id"];
export type Scope = PillarId | "all";
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

/** Days from the first logged day up to and including `today`, in order. Empty log → []. */
function daysUntil(log: CheckinLog, today: DayKey): DayKey[] {
  const first = Object.keys(log)
    .filter((k) => k <= today)
    .sort()[0];
  if (!first) return [];
  const days: DayKey[] = [];
  for (let key = first; key <= today; key = addDays(key, 1)) days.push(key);
  return days;
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

// ── Streaks and shields ───────────────────────────────────────────────────────────────

function doneOn(log: CheckinLog, day: DayKey, scope: Scope): boolean {
  const done = log[day]?.done ?? [];
  return scope === "all" ? done.length === PILLARS.length : done.includes(scope as PillarId);
}

/**
 * A shield is earned for every `SHIELD_EVERY` consecutive days of a run and covers one
 * missed day, so the run survives it — the product promise, "one missed day won't break
 * you", as a rule rather than a slogan. At most `SHIELD_MAX` are held; shields are spent
 * automatically (nothing to equip) and only to protect a live run, never on idle days. A
 * run can only break once every shield is spent, so a new run starts from zero shields.
 */
export const SHIELD_EVERY = 7;
export const SHIELD_MAX = 2;

export interface StreakInfo {
  current: number;
  best: number;
  /** Shields held right now. */
  shields: number;
  /** Missed days inside the CURRENT run that a shield covered. */
  protectedDays: DayKey[];
}

interface WalkEvent {
  day: DayKey;
  /** The run length after this day (0 when the run broke, unchanged on a shielded day). */
  run: number;
  kind: "done" | "shielded" | "broken";
}

/**
 * Replays the log day by day for one scope, applying the shield rule. An unfinished TODAY
 * does not break the run — the day is not over — so it is skipped unless it is done.
 */
function walk(log: CheckinLog, today: DayKey, scope: Scope, visit?: (e: WalkEvent) => void): StreakInfo {
  let run = 0;
  let best = 0;
  let shields = 0;
  let protectedDays: DayKey[] = [];
  for (const day of daysUntil(log, today)) {
    if (doneOn(log, day, scope)) {
      run++;
      best = Math.max(best, run);
      if (run % SHIELD_EVERY === 0) shields = Math.min(SHIELD_MAX, shields + 1);
      visit?.({ day, run, kind: "done" });
    } else if (day === today) {
      continue;
    } else if (run > 0 && shields > 0) {
      shields--;
      protectedDays.push(day);
      visit?.({ day, run, kind: "shielded" });
    } else if (run > 0) {
      run = 0;
      protectedDays = [];
      visit?.({ day, run, kind: "broken" });
    }
  }
  return { current: run, best, shields, protectedDays };
}

/** Current and best run of consecutive days, shields applied. */
export function streak(log: CheckinLog, today: DayKey, scope: Scope): StreakInfo {
  return walk(log, today, scope);
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

// ── XP and levels ─────────────────────────────────────────────────────────────────────

export const XP_PER_PILLAR = 10;
export const XP_FULL_DAY_BONUS = 25;

/** Levels named after what does not break: the thresholds are cumulative XP. A perfect day
 * is 75 XP, so "Unbroken" is roughly ten perfect weeks. */
export const LEVELS = [
  { id: "paper", min: 0 },
  { id: "wood", min: 150 },
  { id: "stone", min: 400 },
  { id: "iron", min: 800 },
  { id: "steel", min: 1400 },
  { id: "titanium", min: 2200 },
  { id: "diamond", min: 3300 },
  { id: "unbroken", min: 5000 },
] as const;

export type LevelId = (typeof LEVELS)[number]["id"];

export function xpOfDay(entry: DayEntry | undefined): number {
  const done = entry?.done.length ?? 0;
  return done * XP_PER_PILLAR + (done === PILLARS.length ? XP_FULL_DAY_BONUS : 0);
}

/** Total XP for every logged day up to today. */
export function xp(log: CheckinLog, today: DayKey): number {
  let total = 0;
  for (const [day, entry] of Object.entries(log)) if (day <= today) total += xpOfDay(entry);
  return total;
}

export interface LevelInfo {
  id: LevelId;
  /** 1-based. */
  number: number;
  /** XP into this level and the XP this level spans; `next` is null at the top. */
  into: number;
  span: number | null;
  next: LevelId | null;
  progress: number;
}

export function level(total: number): LevelInfo {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (total >= LEVELS[i]!.min) index = i;
  const current = LEVELS[index]!;
  const upcoming = LEVELS[index + 1];
  const span = upcoming ? upcoming.min - current.min : null;
  const into = total - current.min;
  return {
    id: current.id,
    number: index + 1,
    into,
    span,
    next: upcoming?.id ?? null,
    progress: span ? Math.min(1, into / span) : 1,
  };
}

// ── Badges ────────────────────────────────────────────────────────────────────────────

export const STREAK_TIERS = [3, 7, 14, 30, 60, 100, 365] as const;
export type StreakTier = (typeof STREAK_TIERS)[number];

export const SPECIAL_BADGES = ["first-checkin", "comeback", "shield-saved", "perfect-week", "balanced-week", "century"] as const;
export type SpecialBadgeId = (typeof SPECIAL_BADGES)[number];

export type BadgeId = `streak-${Scope}-${StreakTier}` | SpecialBadgeId;

export interface Badge {
  id: BadgeId;
  /** The day the badge was earned (first time the condition held). */
  earnedOn: DayKey;
}

export const SCOPES: readonly Scope[] = [...PILLARS.map((p) => p.id), "all"];

/** Every badge the log has earned, oldest first. Derived, never stored. */
export function badges(log: CheckinLog, today: DayKey): Badge[] {
  const earned = new Map<BadgeId, DayKey>();
  const award = (id: BadgeId, day: DayKey) => {
    if (!earned.has(id)) earned.set(id, day);
  };

  for (const scope of SCOPES) {
    walk(log, today, scope, (e) => {
      if (e.kind === "done") for (const tier of STREAK_TIERS) if (e.run === tier) award(`streak-${scope}-${tier}`, e.day);
      if (e.kind === "shielded") award("shield-saved", e.day);
    });
  }

  let total = 0;
  let seenActivity = false;
  let missedSince = false;
  for (const day of daysUntil(log, today)) {
    const count = log[day]?.done.length ?? 0;
    if (count === 0) {
      if (seenActivity) missedSince = true;
      continue;
    }
    if (!seenActivity) award("first-checkin", day);
    else if (missedSince) award("comeback", day);
    seenActivity = true;
    missedSince = false;
    const before = total;
    total += count;
    if (before < 100 && total >= 100) award("century", day);

    // Week badges are judged on Sundays, over the full Monday–Sunday week just lived.
    if (weekdayIndex(day) === 6) {
      const days = Array.from({ length: 7 }, (_, i) => addDays(day, i - 6));
      if (days.every((d) => doneOn(log, d, "all"))) award("perfect-week", day);
      const balanced = PILLARS.every(({ id }) => days.filter((d) => doneOn(log, d, id)).length >= 4);
      if (balanced) award("balanced-week", day);
    }
  }

  return [...earned.entries()].map(([id, earnedOn]) => ({ id, earnedOn })).sort((a, b) => a.earnedOn.localeCompare(b.earnedOn));
}

/** The highest streak tier reached for a scope, or null. */
export function tierReached(all: readonly Badge[], scope: Scope): StreakTier | null {
  let top: StreakTier | null = null;
  for (const tier of STREAK_TIERS) if (all.some((b) => b.id === `streak-${scope}-${tier}`)) top = tier;
  return top;
}

// ── Focus and recap ───────────────────────────────────────────────────────────────────

/**
 * The pillar that got the least attention in the last seven days — a direction for today,
 * not a verdict. Null when every pillar is level (nothing to single out).
 */
export function focusPillar(log: CheckinLog, today: DayKey): PillarId | null {
  const counts = PILLARS.map(({ id }) => {
    let n = 0;
    for (let i = 0; i < 7; i++) if (doneOn(log, addDays(today, -i), id)) n++;
    return { id, n };
  });
  const min = Math.min(...counts.map((c) => c.n));
  const max = Math.max(...counts.map((c) => c.n));
  if (min === max) return null;
  return counts.find((c) => c.n === min)!.id;
}

export interface WeekRecap {
  start: DayKey;
  end: DayKey;
  /** Days each pillar was done, 0–7. */
  counts: Record<PillarId, number>;
  /** Pillar-days done, 0–35, and the same for the week before. */
  total: number;
  previous: number;
  fullDays: number;
  strongest: PillarId[];
  weakest: PillarId[];
}

/** The last COMPLETED Monday–Sunday week, compared with the week before it. */
export function weekRecap(log: CheckinLog, today: DayKey): WeekRecap {
  const start = addDays(today, -weekdayIndex(today) - 7);
  const end = addDays(start, 6);
  const sum = (from: DayKey) => {
    let n = 0;
    for (let i = 0; i < 7; i++) n += log[addDays(from, i)]?.done.length ?? 0;
    return n;
  };
  const counts = Object.fromEntries(
    PILLARS.map(({ id }) => {
      let n = 0;
      for (let i = 0; i < 7; i++) if (doneOn(log, addDays(start, i), id)) n++;
      return [id, n];
    })
  ) as Record<PillarId, number>;
  const values = PILLARS.map(({ id }) => counts[id]);
  const hi = Math.max(...values);
  const lo = Math.min(...values);
  let fullDays = 0;
  for (let i = 0; i < 7; i++) if (doneOn(log, addDays(start, i), "all")) fullDays++;
  return {
    start,
    end,
    counts,
    total: sum(start),
    previous: sum(addDays(start, -7)),
    fullDays,
    strongest: hi === 0 ? [] : PILLARS.filter(({ id }) => counts[id] === hi).map(({ id }) => id),
    weakest: hi === lo ? [] : PILLARS.filter(({ id }) => counts[id] === lo).map(({ id }) => id),
  };
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
  return sanitizeLog(data);
}

function sanitizeLog(data: unknown): CheckinLog {
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

/**
 * The cloud copy: `{"v":1,"d":{"2026-10-13":[31,"note"]}}` — pillars as a bitmask in PILLARS
 * order, the note only when there is one. About a tenth of the verbose shape, so a year
 * with notes stays a few dozen kilobytes in one document.
 */
export const CLOUD_FORMAT = 1;

export function encodeLog(log: CheckinLog): string {
  const d: Record<string, [number] | [number, string]> = {};
  for (const key of Object.keys(log).sort()) {
    const entry = log[key]!;
    let mask = 0;
    PILLARS.forEach(({ id }, i) => {
      if (entry.done.includes(id)) mask |= 1 << i;
    });
    d[key] = entry.note ? [mask, entry.note] : [mask];
  }
  return JSON.stringify({ v: CLOUD_FORMAT, d });
}

export function decodeLog(raw: string | null | undefined): CheckinLog {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== "object") return {};
  const d = (data as { d?: unknown }).d;
  if (!d || typeof d !== "object" || Array.isArray(d)) return {};
  const verbose: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(d as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const [mask, note] = value as [unknown, unknown];
    const bits = typeof mask === "number" ? mask : 0;
    verbose[key] = { done: PILLARS.filter((_, i) => bits & (1 << i)).map(({ id }) => id), note };
  }
  return sanitizeLog(verbose);
}

/** Two copies of the same log, neither authoritative: a day keeps every pillar either side
 * marked, and `primary`'s note when both have one. */
export function mergeLogs(primary: CheckinLog, secondary: CheckinLog): CheckinLog {
  const out: CheckinLog = {};
  for (const key of new Set([...Object.keys(primary), ...Object.keys(secondary)])) {
    const a = primary[key];
    const b = secondary[key];
    const done = PILLARS.map(({ id }) => id).filter((id) => a?.done.includes(id) || b?.done.includes(id));
    const note = a?.note || b?.note;
    if (done.length === 0 && !note) continue;
    out[key] = note ? { done, note } : { done };
  }
  return out;
}

export function sameLog(a: CheckinLog, b: CheckinLog): boolean {
  return encodeLog(a) === encodeLog(b);
}

// ── Cloud reconciliation ──────────────────────────────────────────────────────────────

export interface SyncMeta {
  /** The account the local copy belongs to; null while anonymous. */
  uid: string | null;
  /** The cloud document's `updatedAt` (ms) this device last agreed with; 0 = never. */
  stamp: number;
  /** Local edits since then. */
  dirty: boolean;
}

export interface CloudCopy {
  log: CheckinLog;
  stamp: number;
}

export interface Reconciled {
  /** What this device should hold from now on. */
  log: CheckinLog;
  /** Whether the cloud needs this copy. */
  push: boolean;
  meta: SyncMeta;
}

/**
 * Decides, without touching the network, what a device holds after seeing the cloud copy.
 *
 * - First sign-in on a device with anonymous history: the two are merged, so nothing a
 *   visitor logged before creating an account is lost.
 * - Another account's history on this device is not merged into this one; the cloud copy
 *   replaces it (the other account's data is in that account's cloud).
 * - Same account: a clean device takes the cloud as truth (that is how an un-tap made on
 *   another device arrives here); a dirty device pushes when the cloud has not moved, and
 *   merges when both moved.
 */
export function reconcile(local: CheckinLog, meta: SyncMeta, cloud: CloudCopy | null, uid: string): Reconciled {
  const cloudLog = cloud?.log ?? {};
  const stamp = cloud?.stamp ?? 0;
  if (meta.uid !== uid) {
    if (meta.uid === null) {
      const log = mergeLogs(local, cloudLog);
      return { log, push: !sameLog(log, cloudLog), meta: { uid, stamp, dirty: false } };
    }
    return { log: cloudLog, push: false, meta: { uid, stamp, dirty: false } };
  }
  if (!cloud) return { log: local, push: Object.keys(local).length > 0, meta: { uid, stamp: 0, dirty: false } };
  if (!meta.dirty) return { log: cloudLog, push: false, meta: { uid, stamp, dirty: false } };
  if (stamp === meta.stamp) return { log: local, push: true, meta: { uid, stamp, dirty: false } };
  const log = mergeLogs(local, cloudLog);
  return { log, push: !sameLog(log, cloudLog), meta: { uid, stamp, dirty: false } };
}

export function parseSyncMeta(raw: string | null): SyncMeta {
  const none: SyncMeta = { uid: null, stamp: 0, dirty: false };
  if (!raw) return none;
  try {
    const data = JSON.parse(raw) as Partial<SyncMeta> | null;
    if (!data || typeof data !== "object") return none;
    return {
      uid: typeof data.uid === "string" ? data.uid : null,
      stamp: typeof data.stamp === "number" && Number.isFinite(data.stamp) ? data.stamp : 0,
      dirty: data.dirty === true,
    };
  } catch {
    return none;
  }
}
