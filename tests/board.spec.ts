import { test, expect } from "@playwright/test";
import { groupByField } from "../lib/board";
import type { EntityRecord } from "../lib/records";
import type { EntityField } from "../lib/prototype-config";

const field: EntityField = { key: "status", type: "select", options: ["Open", "Done"], required: false, label: "Status" };
const r = (id: string, status?: string): EntityRecord => ({ id, userId: "u", createdAt: new Date(0), values: status ? { status } : {} });

test("one column per option, in option order; empty and unknown values in a trailing no-value column", () => {
  const cols = groupByField([r("a", "Done"), r("b", "Open"), r("c"), r("d", "Legacy")], field);
  expect(cols.map((c) => [c.value, c.records.map((x) => x.id)])).toEqual([
    ["Open", ["b"]],
    ["Done", ["a"]],
    [null, ["c", "d"]],
  ]);
});

test("no trailing column when every record has a known value", () => {
  expect(groupByField([r("a", "Open")], field).map((c) => c.value)).toEqual(["Open", "Done"]);
});
