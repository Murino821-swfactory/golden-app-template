import { test, expect } from "@playwright/test";
import { monthSummary, moveMonth } from "../lib/checkin-history";
import { PILLARS } from "../lib/checkin-engine";

test("monthly totals include missing elapsed days but exclude future days", () => {
  const result = monthSummary({
    "2026-10-01": { done: PILLARS.map((p) => p.id) },
    "2026-10-02": { done: [], note: "Rest day" },
    "2026-10-20": { done: ["work"] },
    "2026-09-30": { done: ["work"] },
  }, "2026-10", "2026-10-10");
  expect(result).toMatchObject({ active: 1, complete: 1, total: 5, rate: 10 });
  expect(result.days).toHaveLength(10);
  expect(result.days[1].note).toBe("Rest day");
});
test("month navigation and leap years preserve calendar boundaries", () => {
  expect(moveMonth("2026-01", -1)).toBe("2025-12");
  expect(moveMonth("2026-12", 1)).toBe("2027-01");
  expect(monthSummary({}, "2024-02", "2026-10-16").days).toHaveLength(29);
  expect(monthSummary({}, "2026-11", "2026-10-16").rate).toBe(0);
});
