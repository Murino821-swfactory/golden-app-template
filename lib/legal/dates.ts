/** ISO `yyyy-MM-dd` arithmetic in UTC, so a calendar day is a calendar day in every zone. */

export function parseIso(isoDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error(`not an ISO date: ${isoDate}`);
  return new Date(`${isoDate}T00:00:00Z`);
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = parseIso(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** Same day number `months` later, or the last day of that month when it has none (CSP § 121 ods. 3). */
export function addMonths(isoDate: string, months: number): string {
  const d = parseIso(isoDate);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return toIso(target);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / 86_400_000);
}

let fixedToday: string | null = null;

/** Test harness only: pin "today" so seeded dates and urgency are stable across runs. */
export function setFixedToday(isoDate: string | null): void {
  fixedToday = isoDate;
}

export function todayIso(now: Date = new Date()): string {
  if (fixedToday) return fixedToday;
  // Local calendar day of the person using the app, not the UTC day.
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

/** Monday-first weekday index, 0 = Monday. */
export function weekdayMondayFirst(isoDate: string): number {
  return (parseIso(isoDate).getUTCDay() + 6) % 7;
}

export function daysInMonth(isoDate: string): number {
  const d = parseIso(isoDate);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}
