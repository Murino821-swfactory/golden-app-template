import { test, expect } from "@playwright/test";
import {
  PILLARS,
  addDays,
  consistency,
  monthHeat,
  parseLog,
  setNote,
  streak,
  toggle,
  weekBalance,
  type CheckinLog,
} from "../lib/checkin-engine";

/**
 * OTH-84 — the engine behind the daily check-in: pure functions over a date-keyed log,
 * no page. Dates are local calendar days ("YYYY-MM-DD"), never timestamps.
 */

const ALL = PILLARS.map((p) => p.id);

/** A log where `pillars` are done on each of the given days. */
function logOf(days: Record<string, string[]>): CheckinLog {
  return Object.fromEntries(Object.entries(days).map(([d, done]) => [d, { done }])) as CheckinLog;
}

test.describe("toggle / setNote", () => {
  test("toggle marks a pillar and a second toggle clears it — without mutating", () => {
    const empty: CheckinLog = {};
    const once = toggle(empty, "2026-09-24", "work");
    expect(once["2026-09-24"]!.done).toEqual(["work"]);
    expect(empty).toEqual({});
    expect(toggle(once, "2026-09-24", "work")["2026-09-24"]).toBeUndefined();
  });

  test("a note is trimmed, capped, and an empty day disappears", () => {
    const withNote = setNote({}, "2026-09-24", "  slept badly  ");
    expect(withNote["2026-09-24"]).toEqual({ done: [], note: "slept badly" });
    expect(setNote(withNote, "2026-09-24", "   ")["2026-09-24"]).toBeUndefined();
    expect(setNote({}, "2026-09-24", "x".repeat(500))["2026-09-24"]!.note).toHaveLength(280);
  });
});

test.describe("streak", () => {
  const today = "2026-09-24";

  test("counts consecutive days that end today", () => {
    const log = logOf({ "2026-09-22": ["work"], "2026-09-23": ["work"], "2026-09-24": ["work"] });
    expect(streak(log, today, "work")).toEqual({ current: 3, best: 3 });
  });

  test("an unfinished today does not break it; a missed full day does", () => {
    const log = logOf({ "2026-09-22": ["mind"], "2026-09-23": ["mind"] });
    expect(streak(log, today, "mind").current).toBe(2);
    const gap = logOf({ "2026-09-21": ["mind"], "2026-09-22": ["mind"] });
    expect(streak(gap, today, "mind").current).toBe(0);
  });

  test("best is the longest run ever, per pillar", () => {
    const log = logOf({
      "2026-09-01": ["fitness"],
      "2026-09-02": ["fitness"],
      "2026-09-03": ["fitness"],
      "2026-09-04": ["fitness"],
      "2026-09-23": ["fitness", "work"],
      "2026-09-24": ["fitness"],
    });
    expect(streak(log, today, "fitness")).toEqual({ current: 2, best: 4 });
    expect(streak(log, today, "work")).toEqual({ current: 1, best: 1 });
  });

  test("the overall streak counts only days with all five pillars", () => {
    const log = logOf({ "2026-09-22": ALL, "2026-09-23": ALL, "2026-09-24": ["work"] });
    expect(streak(log, today, "all")).toEqual({ current: 2, best: 2 });
  });
});

test.describe("consistency", () => {
  test("is the share of pillar-days done in the window ending today", () => {
    const days: Record<string, string[]> = {};
    for (let i = 0; i < 7; i++) days[addDays("2026-09-24", -i)] = ["work", "mind", "habits"];
    expect(consistency(logOf(days), "2026-09-24", 7)).toBe(60);
    expect(consistency(logOf(days), "2026-09-24", 30)).toBe(14); // 21 of 150
    expect(consistency({}, "2026-09-24", 7)).toBe(0);
  });
});

test.describe("weekBalance", () => {
  test("covers Monday to Sunday and divides only by the days already lived", () => {
    // 2026-09-24 is a Thursday → week 21–27 Sep, 4 days lived.
    const log = logOf({ "2026-09-21": ["work"], "2026-09-22": ["work", "mind"], "2026-09-24": ["work"] });
    const week = weekBalance(log, "2026-09-24", "2026-09-24");
    expect(week.start).toBe("2026-09-21");
    expect(week.end).toBe("2026-09-27");
    expect(week.values.work).toBeCloseTo(3 / 4);
    expect(week.values.mind).toBeCloseTo(1 / 4);
    expect(week.values.fitness).toBe(0);
  });

  test("a past week divides by all seven days", () => {
    const log = logOf({ "2026-09-14": ["habits"] });
    expect(weekBalance(log, "2026-09-16", "2026-09-24").values.habits).toBeCloseTo(1 / 7);
  });
});

test.describe("monthHeat", () => {
  test("lays the month out as Monday-first weeks with a 0–5 count per day", () => {
    const log = logOf({ "2026-09-01": ALL, "2026-09-02": ["work", "mind"] });
    const heat = monthHeat(log, "2026-09-10", "2026-09-24");
    // September 2026 starts on a Tuesday and has 30 days → 5 week columns.
    expect(heat.weeks).toHaveLength(5);
    expect(heat.weeks[0]![0]).toBeNull(); // Monday 31 Aug is outside the month
    expect(heat.weeks[0]![1]).toMatchObject({ key: "2026-09-01", count: 5, future: false });
    expect(heat.weeks[0]![2]).toMatchObject({ key: "2026-09-02", count: 2 });
    expect(heat.weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(heat.weeks.flat().find((c) => c?.key === "2026-09-25")!.future).toBe(true);
  });
});

test.describe("parseLog", () => {
  test("keeps valid days and drops anything else", () => {
    const raw = JSON.stringify({
      "2026-09-24": { done: ["work", "cooking"], note: "ok" },
      "not-a-date": { done: ["work"] },
      "2026-09-23": "garbage",
    });
    expect(parseLog(raw)).toEqual({ "2026-09-24": { done: ["work"], note: "ok" } });
    expect(parseLog("{broken")).toEqual({});
    expect(parseLog(null)).toEqual({});
  });
});
