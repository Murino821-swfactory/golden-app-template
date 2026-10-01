import { test, expect } from "@playwright/test";
import { computeKpi, dashboardKpis } from "../lib/kpi";
import type { EntityRecord } from "../lib/records";

const r = (values: Record<string, unknown>, createdAt = "2026-09-10T00:00:00Z"): EntityRecord => ({
  id: Math.random().toString(36).slice(2), userId: "u", createdAt: new Date(createdAt), values,
});
const records = [r({ mode: "Bus", km: 10 }), r({ mode: "Rail", km: 30 }), r({ mode: "Bus" }), r({ mode: "Bus", km: 20 }, "2026-08-01T00:00:00Z")];

test("count, sum, avg and share", () => {
  expect(computeKpi(records, { id: "a", field: "*", agg: "count" }, "en")).toBe("4");
  expect(computeKpi(records, { id: "b", field: "km", agg: "sum" }, "en")).toBe("60");
  expect(computeKpi(records, { id: "c", field: "km", agg: "avg" }, "en")).toBe("20");
  expect(computeKpi(records, { id: "d", field: "mode", agg: "share", value: "Bus" }, "en")).toBe("75%");
});

test("empty data never divides by zero", () => {
  expect(computeKpi([], { id: "c", field: "km", agg: "avg" }, "en")).toBe("—");
  expect(computeKpi([], { id: "d", field: "mode", agg: "share", value: "Bus" }, "en")).toBe("0%");
});

test("numbers follow the locale", () => {
  expect(computeKpi([r({ km: 1.25 }), r({ km: 2 })], { id: "c", field: "km", agg: "avg" }, "sk")).toBe("1,6");
});

test("without configured KPIs: total and added this month", () => {
  const cards = dashboardKpis(records, undefined, undefined, { total: "Records", thisMonth: "This month" }, new Date("2026-09-29T00:00:00Z"), "en");
  expect(cards).toEqual([
    { id: "total", label: "Records", value: "4" },
    { id: "thisMonth", label: "This month", value: "3" },
  ]);
});

test("configured KPIs use their labels", () => {
  const cards = dashboardKpis(records, [{ id: "busShare", field: "mode", agg: "share", value: "Bus" }], { busShare: "By bus" },
    { total: "", thisMonth: "" }, new Date(), "en");
  expect(cards).toEqual([{ id: "busShare", label: "By bus", value: "75%" }]);
});
