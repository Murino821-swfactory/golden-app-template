import { test, expect } from "@playwright/test";
import {
  RECORD_LIMIT,
  buildCreateOps,
  buildDeleteOps,
  buildUpdateOps,
  coerceValues,
  filterRecords,
  formatValue,
  recordsPath,
  sandboxRoot,
  shouldSeed,
  sortRecords,
  writeErrorKind,
  type EntityRecord,
} from "../lib/records";
import type { EntityField } from "../lib/prototype-config";
import * as recordsHook from "../hooks/use-records";

/**
 * The grid's rules without a browser or Firestore. The op shapes are the contract
 * factory-web's rules enforce (firestore-tests/rules.test.mjs `createBatch`/`deleteBatch`):
 * a create or delete is the record write plus a counter move of ±1 naming that record.
 */

const fields: EntityField[] = [
  { key: "name", type: "text", required: true, label: "Name" },
  { key: "status", type: "select", options: ["Open", "Done"], required: false, label: "Status" },
  { key: "hours", type: "number", required: false, label: "Hours" },
  { key: "due", type: "date", required: false, label: "Due" },
  { key: "active", type: "boolean", required: false, label: "Active" },
  { key: "notes", type: "longtext", required: false, label: "Notes" },
];

const rec = (id: string, values: Record<string, unknown>, createdAt = "2026-09-01T00:00:00Z"): EntityRecord => ({
  id,
  userId: "u1",
  createdAt: new Date(createdAt),
  values,
});

test.describe("paths", () => {
  test("a demo sandbox lives under demos/{slug}/users/{uid}; local dev under users/{uid}", () => {
    expect(sandboxRoot("faunatrack", "u1")).toBe("demos/faunatrack/users/u1");
    expect(recordsPath("faunatrack", "u1")).toBe("demos/faunatrack/users/u1/records");
    expect(sandboxRoot(null, "u1")).toBe("users/u1");
  });
});

test.describe("ops", () => {
  test("create = record + counter +1 naming it", () => {
    expect(buildCreateOps("s", "u1", "r1", { name: "A" })).toEqual([
      { kind: "setRecord", path: "demos/s/users/u1/records/r1", values: { name: "A" } },
      { kind: "moveCounter", path: "demos/s/users/u1", delta: 1, last: "r1" },
    ]);
  });
  test("delete = record delete + counter −1 naming it", () => {
    expect(buildDeleteOps("s", "u1", "r1")).toEqual([
      { kind: "deleteRecord", path: "demos/s/users/u1/records/r1" },
      { kind: "moveCounter", path: "demos/s/users/u1", delta: -1, last: "r1" },
    ]);
  });
  test("update never touches the counter", () => {
    expect(buildUpdateOps("s", "u1", "r1", { name: "B" })).toEqual([
      { kind: "updateRecord", path: "demos/s/users/u1/records/r1", values: { name: "B" } },
    ]);
  });
});

test.describe("coerceValues", () => {
  test("form strings become stored types; empty optional fields are absent", () => {
    const { values, errors } = coerceValues(fields, {
      name: "  Fix roof ",
      status: "Open",
      hours: "2.5",
      due: "2026-10-01",
      active: true,
      notes: "",
    });
    expect(errors).toEqual([]);
    expect(values).toEqual({ name: "Fix roof", status: "Open", hours: 2.5, due: "2026-10-01", active: true });
  });
  test("unknown keys never reach Firestore", () => {
    expect(coerceValues(fields, { name: "A", userId: "evil" }).values).not.toHaveProperty("userId");
  });
  test("each rule has its own error code", () => {
    const { errors } = coerceValues(fields, {
      name: "",
      status: "Maybe",
      hours: "lots",
      due: "1.10.2026",
      notes: "x".repeat(2001),
    });
    expect(errors).toEqual([
      { key: "name", code: "required" },
      { key: "status", code: "option" },
      { key: "hours", code: "type" },
      { key: "due", code: "type" },
      { key: "notes", code: "tooLong" },
    ]);
  });
  test("text over 200 characters is too long", () => {
    expect(coerceValues(fields, { name: "x".repeat(201) }).errors).toEqual([{ key: "name", code: "tooLong" }]);
  });
});

test.describe("filter and sort", () => {
  const records = [
    rec("a", { name: "Fix roof", status: "Open", hours: 3 }, "2026-09-01T00:00:00Z"),
    rec("b", { name: "Paint wall", status: "Done", hours: 1 }, "2026-09-03T00:00:00Z"),
    rec("c", { name: "Buy nails", status: "Open" }, "2026-09-02T00:00:00Z"),
  ];
  test("search is case-insensitive across text and select fields", () => {
    expect(filterRecords(records, fields, "ROOF", null).map((r) => r.id)).toEqual(["a"]);
    expect(filterRecords(records, fields, "done", null).map((r) => r.id)).toEqual(["b"]);
  });
  test("a chip narrows to one select value, combined with search", () => {
    expect(filterRecords(records, fields, "", { key: "status", value: "Open" }).map((r) => r.id)).toEqual(["a", "c"]);
    expect(filterRecords(records, fields, "nails", { key: "status", value: "Open" }).map((r) => r.id)).toEqual(["c"]);
  });
  test("no sort = newest first; a number column sorts numerically with empties last in both directions", () => {
    expect(sortRecords(records, fields, null).map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(sortRecords(records, fields, { key: "hours", dir: "asc" }).map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(sortRecords(records, fields, { key: "hours", dir: "desc" }).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});

test.describe("display and lifecycle", () => {
  const yesNo = { yes: "Yes", no: "No" };
  test("formatValue: empty is a dash, booleans are words", () => {
    expect(formatValue(fields[0]!, "", yesNo)).toBe("—");
    expect(formatValue(fields[4]!, true, yesNo)).toBe("Yes");
    expect(formatValue(fields[4]!, false, yesNo)).toBe("No");
    expect(formatValue(fields[2]!, 2.5, yesNo)).toBe("2.5");
  });
  test("shouldSeed: only a first visit with samples — a visitor who deleted every sample keeps an empty grid", () => {
    expect(shouldSeed(false, [{}, {}, {}])).toBe(true);
    expect(shouldSeed(true, [{}, {}, {}])).toBe(false); // counter exists (maybe at 0): never re-seed
    expect(shouldSeed(false, undefined)).toBe(false);
    expect(shouldSeed(false, [])).toBe(false);
  });
  test("writeErrorKind: a refused create at the cap is the limit, not a permission error", () => {
    expect(writeErrorKind("permission-denied", RECORD_LIMIT, "create")).toBe("limit");
    expect(writeErrorKind("permission-denied", RECORD_LIMIT - 1, "create")).toBe("limit");
    expect(writeErrorKind("permission-denied", 10, "create")).toBe("denied");
    expect(writeErrorKind("permission-denied", RECORD_LIMIT, "update")).toBe("denied");
    expect(writeErrorKind("unavailable", 10, "create")).toBe("other");
    expect(writeErrorKind(undefined, 10, "delete")).toBe("other");
  });
});

test("hooks/use-records keeps re-exporting the helpers other modules import", () => {
  const mod = recordsHook;
  expect(typeof mod.sortByCreatedAtDesc).toBe("function");
  expect(typeof mod.emptyValues).toBe("function");
  expect(typeof mod.missingRequired).toBe("function");
  expect(typeof mod.RecordValidationError).toBe("function");
});
