import { test, expect } from "@playwright/test";
import { PILLARS, level, toggle, xp } from "../lib/checkin-engine";
import { DEMO_TODAY, demoLog, demoState } from "../lib/checkin-demo";

/**
 * The landing's check-in demo (T-384, from the T-344 v3 redesign): thirteen days with day 10 missed, run by the
 * app's own engine — a shield earned at day 7 covers day 10, so the streak survives; today's five pillars add
 * their XP. Pure, no browser.
 */
test.describe("landing check-in demo (pure)", () => {
  test("thirteen days, day 10 missed and covered by the shield earned at day 7", () => {
    const log = demoLog();
    const state = demoState(log);
    expect(state.days).toHaveLength(14);
    expect(state.days.map((d) => d.kind)).toEqual([...Array(9).fill("done"), "shielded", "done", "done", "done", "today"]);
    expect(state.streak.current).toBe(12);
    expect(state.streak.protectedDays).toHaveLength(1);
  });

  test("ticking all five pillars today extends the streak and adds a perfect day's XP", () => {
    const before = demoLog();
    let log = before;
    for (const p of PILLARS) log = toggle(log, DEMO_TODAY, p.id);
    const state = demoState(log);
    expect(state.streak.current).toBe(13);
    expect(state.days.at(-1)!.kind).toBe("done");
    expect(xp(log, DEMO_TODAY) - xp(before, DEMO_TODAY)).toBe(75);
    expect(state.level).toEqual(level(xp(log, DEMO_TODAY)));
  });
});
