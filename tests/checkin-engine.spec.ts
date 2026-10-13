import { test, expect } from "@playwright/test";
import {
  LEVELS,
  PILLARS,
  SHIELD_MAX,
  addDays,
  badges,
  consistency,
  decodeLog,
  encodeLog,
  focusPillar,
  level,
  mergeLogs,
  monthHeat,
  parseLog,
  parseSyncMeta,
  reconcile,
  setNote,
  streak,
  tierReached,
  toggle,
  weekBalance,
  weekRecap,
  xp,
  type CheckinLog,
} from "../lib/checkin-engine";
import { googleCalendarUrl, isValidTime, reminderIcs } from "../lib/checkin-reminder";

/**
 * OTH-84 — the engine behind the daily check-in: pure functions over a date-keyed log,
 * no page. Dates are local calendar days ("YYYY-MM-DD"), never timestamps. The 2026-10-13
 * motivation layer (shields, XP, badges, focus, recap, cloud codec, reconcile) is tested
 * here too — it is all derived from the same log.
 */

const ALL = PILLARS.map((p) => p.id);

/** A log where `pillars` are done on each of the given days. */
function logOf(days: Record<string, string[]>): CheckinLog {
  return Object.fromEntries(Object.entries(days).map(([d, done]) => [d, { done }])) as CheckinLog;
}

/** `n` consecutive days of `pillars`, ending on `last`. */
function run(last: string, n: number, pillars: readonly string[] = ["work"]): Record<string, string[]> {
  const days: Record<string, string[]> = {};
  for (let i = 0; i < n; i++) days[addDays(last, -i)] = [...pillars];
  return days;
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
    expect(streak(log, today, "work")).toMatchObject({ current: 3, best: 3, shields: 0 });
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
    expect(streak(log, today, "fitness")).toMatchObject({ current: 2, best: 4 });
    expect(streak(log, today, "work")).toMatchObject({ current: 1, best: 1 });
  });

  test("the overall streak counts only days with all five pillars", () => {
    const log = logOf({ "2026-09-22": ALL, "2026-09-23": ALL, "2026-09-24": ["work"] });
    expect(streak(log, today, "all")).toMatchObject({ current: 2, best: 2 });
  });
});

test.describe("shields", () => {
  test("seven days in a row earn a shield; a missed day spends it and the run survives", () => {
    // 1–7 Sep done, 8 Sep missed, 9–10 Sep done, today 10 Sep.
    const log = logOf({ ...run("2026-09-07", 7), ...run("2026-09-10", 2) });
    const s = streak(log, "2026-09-10", "work");
    expect(s).toMatchObject({ current: 9, best: 9, shields: 0, protectedDays: ["2026-09-08"] });
  });

  test("without a shield the same gap resets the run", () => {
    const log = logOf({ ...run("2026-09-06", 6), ...run("2026-09-09", 2) });
    expect(streak(log, "2026-09-09", "work")).toMatchObject({ current: 2, best: 6, shields: 0, protectedDays: [] });
  });

  test("shields are capped, and a gap longer than the shields held breaks the run", () => {
    const twentyOne = logOf(run("2026-09-21", 21));
    expect(streak(twentyOne, "2026-09-21", "work").shields).toBe(SHIELD_MAX);
    // 22–23 Sep missed with two shields → still alive on 24 Sep; three missed days → broken.
    const twoMissed = logOf({ ...run("2026-09-21", 21), "2026-09-24": ["work"] });
    expect(streak(twoMissed, "2026-09-24", "work")).toMatchObject({ current: 22, shields: 0, protectedDays: ["2026-09-22", "2026-09-23"] });
    const threeMissed = logOf({ ...run("2026-09-21", 21), "2026-09-25": ["work"] });
    expect(streak(threeMissed, "2026-09-25", "work")).toMatchObject({ current: 1, best: 21, shields: 0 });
  });

  test("an unfinished today never spends a shield", () => {
    const log = logOf(run("2026-09-07", 7));
    expect(streak(log, "2026-09-08", "work")).toMatchObject({ current: 7, shields: 1, protectedDays: [] });
  });
});

test.describe("xp and levels", () => {
  test("ten XP per pillar and a full-day bonus", () => {
    const log = logOf({ "2026-09-23": ["work", "mind", "habits"], "2026-09-24": ALL, "2026-09-25": ALL });
    expect(xp(log, "2026-09-24")).toBe(30 + 75);
    expect(xp(log, "2026-09-25")).toBe(30 + 75 + 75);
  });

  test("levels climb from paper to unbroken", () => {
    expect(level(0)).toMatchObject({ id: "paper", number: 1, into: 0, span: 150, next: "wood", progress: 0 });
    expect(level(149).id).toBe("paper");
    expect(level(150)).toMatchObject({ id: "wood", number: 2, into: 0 });
    expect(level(5000)).toMatchObject({ id: "unbroken", number: LEVELS.length, span: null, next: null, progress: 1 });
    expect(level(99_999).id).toBe("unbroken");
  });
});

test.describe("badges", () => {
  test("first check-in, streak tiers and a comeback — each earned once, on the day it happened", () => {
    const log = logOf({ ...run("2026-09-03", 3), "2026-09-06": ["work"] });
    const earned = badges(log, "2026-09-06");
    expect(earned).toEqual(
      expect.arrayContaining([
        { id: "first-checkin", earnedOn: "2026-09-01" },
        { id: "streak-work-3", earnedOn: "2026-09-03" },
        { id: "comeback", earnedOn: "2026-09-06" },
      ])
    );
    expect(earned.filter((b) => b.id === "first-checkin")).toHaveLength(1);
    expect(tierReached(earned, "work")).toBe(3);
    expect(tierReached(earned, "mind")).toBeNull();
  });

  test("a shield that saved a run is a badge, and so is a perfect or balanced week", () => {
    // 2026-09-07 is a Monday; 7–13 Sep is one full week of all five, then 14 Sep is missed
    // and 15 Sep done — the shield earned on 13 Sep covers 14 Sep.
    const log = logOf({ ...run("2026-09-13", 7, ALL), "2026-09-15": ALL });
    const ids = badges(log, "2026-09-15").map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(["perfect-week", "balanced-week", "shield-saved", "streak-all-7"]));
    const shield = badges(log, "2026-09-15").find((b) => b.id === "shield-saved");
    expect(shield?.earnedOn).toBe("2026-09-14");
    expect(badges(log, "2026-09-15").find((b) => b.id === "perfect-week")?.earnedOn).toBe("2026-09-13");
  });

  test("a hundred pillar check-ins is the century", () => {
    const log = logOf(run("2026-09-20", 20, ALL)); // 20 × 5 = 100
    const century = badges(log, "2026-09-20").find((b) => b.id === "century");
    expect(century?.earnedOn).toBe("2026-09-20");
    expect(badges(logOf(run("2026-09-19", 19, ALL)), "2026-09-19").some((b) => b.id === "century")).toBe(false);
  });
});

test.describe("focus and recap", () => {
  test("the focus is the pillar with the least attention this week, or nothing when level", () => {
    const log = logOf({ "2026-09-23": ["work", "mind"], "2026-09-24": ["work", "mind", "habits"] });
    expect(focusPillar(log, "2026-09-24")).toBe("fitness");
    expect(focusPillar({}, "2026-09-24")).toBeNull();
    expect(focusPillar(logOf({ "2026-09-24": ALL }), "2026-09-24")).toBeNull();
  });

  test("the recap covers the last completed Monday–Sunday week and compares it with the one before", () => {
    // Today Thursday 24 Sep → last week 14–20 Sep, the week before 7–13 Sep.
    const log = logOf({
      ...run("2026-09-13", 7, ["work"]), // 7 check-ins the week before
      "2026-09-14": ALL,
      "2026-09-15": ["work", "mind"],
      "2026-09-16": ["work"],
      "2026-09-20": ["work", "mind", "fitness"],
    });
    const recap = weekRecap(log, "2026-09-24");
    expect(recap).toMatchObject({ start: "2026-09-14", end: "2026-09-20", total: 11, previous: 7, fullDays: 1 });
    expect(recap.counts).toEqual({ work: 4, mind: 3, fitness: 2, relationships: 1, habits: 1 });
    expect(recap.strongest).toEqual(["work"]);
    expect(recap.weakest).toEqual(["relationships", "habits"]);
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

test.describe("cloud codec and merge", () => {
  test("encode → decode is the identity, with pillars as a bitmask", () => {
    const log: CheckinLog = { "2026-09-24": { done: ["work", "habits"], note: "ok" }, "2026-09-23": { done: ALL } };
    const raw = encodeLog(log);
    expect(JSON.parse(raw)).toEqual({ v: 1, d: { "2026-09-23": [31], "2026-09-24": [17, "ok"] } });
    expect(decodeLog(raw)).toEqual(log);
    expect(decodeLog("nonsense")).toEqual({});
    expect(decodeLog(JSON.stringify({ v: 1, d: { "2026-09-24": ["x"], bad: [1] } }))).toEqual({});
  });

  test("merging keeps every pillar either side marked and prefers the primary's note", () => {
    const a: CheckinLog = { "2026-09-24": { done: ["work"], note: "mine" } };
    const b: CheckinLog = { "2026-09-24": { done: ["mind"], note: "theirs" }, "2026-09-23": { done: ["habits"] } };
    expect(mergeLogs(a, b)).toEqual({
      "2026-09-24": { done: ["work", "mind"], note: "mine" },
      "2026-09-23": { done: ["habits"] },
    });
  });
});

test.describe("reconcile", () => {
  const local: CheckinLog = { "2026-09-24": { done: ["work"] } };
  const cloudLog: CheckinLog = { "2026-09-23": { done: ["mind"] } };

  test("first sign-in merges anonymous history into the account and pushes", () => {
    const r = reconcile(local, { uid: null, stamp: 0, dirty: false }, { log: cloudLog, stamp: 10 }, "u1");
    expect(r.log).toEqual({ ...local, ...cloudLog });
    expect(r.push).toBe(true);
    expect(r.meta).toEqual({ uid: "u1", stamp: 10, dirty: false });
  });

  test("another account's history on this device is replaced by the cloud copy, not merged", () => {
    const r = reconcile(local, { uid: "someone-else", stamp: 5, dirty: true }, { log: cloudLog, stamp: 10 }, "u1");
    expect(r.log).toEqual(cloudLog);
    expect(r.push).toBe(false);
  });

  test("a clean device takes the cloud as truth — that is how an un-tap elsewhere arrives", () => {
    const r = reconcile(local, { uid: "u1", stamp: 5, dirty: false }, { log: cloudLog, stamp: 10 }, "u1");
    expect(r.log).toEqual(cloudLog);
    expect(r.meta.stamp).toBe(10);
  });

  test("a dirty device pushes when the cloud has not moved, merges when both moved", () => {
    const unmoved = reconcile(local, { uid: "u1", stamp: 10, dirty: true }, { log: cloudLog, stamp: 10 }, "u1");
    expect(unmoved).toMatchObject({ log: local, push: true });
    const moved = reconcile(local, { uid: "u1", stamp: 5, dirty: true }, { log: cloudLog, stamp: 10 }, "u1");
    expect(moved.log).toEqual({ ...local, ...cloudLog });
    expect(moved.push).toBe(true);
    const nothingThere = reconcile(local, { uid: "u1", stamp: 0, dirty: false }, null, "u1");
    expect(nothingThere).toMatchObject({ log: local, push: true });
    expect(reconcile({}, { uid: "u1", stamp: 0, dirty: false }, null, "u1").push).toBe(false);
  });

  test("sync meta survives garbage", () => {
    expect(parseSyncMeta(null)).toEqual({ uid: null, stamp: 0, dirty: false });
    expect(parseSyncMeta("{bad")).toEqual({ uid: null, stamp: 0, dirty: false });
    expect(parseSyncMeta(JSON.stringify({ uid: "u", stamp: 3, dirty: true }))).toEqual({ uid: "u", stamp: 3, dirty: true });
  });
});

test.describe("reminder", () => {
  const input = { time: "20:30", from: "2026-10-13", title: "Unbroken check-in", description: "Ten seconds; tap, done", url: "https://apps.tokenwise.sk/newapp/unbroken/checkin" };

  test("the Google Calendar link recurs daily at the chosen floating time", () => {
    const url = new URL(googleCalendarUrl(input));
    expect(url.searchParams.get("recur")).toBe("RRULE:FREQ=DAILY");
    expect(url.searchParams.get("dates")).toBe("20261013T203000/20261013T204000");
    expect(url.searchParams.get("details")).toContain(input.url);
    expect(new URL(googleCalendarUrl({ ...input, time: "23:55" })).searchParams.get("dates")).toBe("20261013T235500/20261014T000500");
  });

  test("the .ics is one daily event with an alarm, text escaped, lines folded", () => {
    const ics = reminderIcs(input);
    expect(ics).toContain("RRULE:FREQ=DAILY\r\n");
    expect(ics).toContain("DTSTART:20261013T203000\r\n");
    expect(ics).toContain("DESCRIPTION:Ten seconds\\; tap\\, done\r\n");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics.split("\r\n").every((line) => line.length <= 75)).toBe(true);
    expect(isValidTime("07:05")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
  });
});
