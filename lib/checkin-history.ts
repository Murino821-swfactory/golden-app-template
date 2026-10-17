import { addDays, PILLARS, type CheckinLog, type DayKey } from "./checkin-engine";

export function moveMonth(month: string, offset: number): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year!, m! - 1 + offset, 1)).toISOString().slice(0, 7);
}
/** Calendar-month rates count elapsed days only, including days with no entry. */
export function monthSummary(log: CheckinLog, month: string, today: DayKey) {
  const days: { day: DayKey; count: number; note: string }[] = [];
  for (let day = `${month}-01`; day.startsWith(month) && day <= today; day = addDays(day, 1)) {
    const entry = log[day];
    days.push({ day, count: entry?.done.length ?? 0, note: entry?.note ?? "" });
  }
  const total = days.reduce((sum, day) => sum + day.count, 0);
  return { month, days, total, active: days.filter((day) => day.count > 0).length,
    complete: days.filter((day) => day.count === PILLARS.length).length,
    rate: days.length ? Math.round(total / (days.length * PILLARS.length) * 100) : 0 };
}
