import { test, expect } from "@playwright/test";
import { sortByCreatedAtDesc, type EntityRecord } from "../hooks/use-records";

/**
 * The dashboard's data layer no longer orders records in the Firestore query (see the
 * comment on `sortByCreatedAtDesc` in `hooks/use-records.ts` for why: the collection name
 * is chosen per prototype, so the composite index an `orderBy` needs cannot be
 * pre-declared for an unbounded set of collection names). This suite is what stops that
 * sort from silently going missing, or from being "optimised" back into the query by a
 * future edit — pure, no browser, no Firestore.
 */

function record(id: string, createdAt: string): EntityRecord {
  return { id, userId: "u1", createdAt: new Date(createdAt), values: {} };
}

test.describe("sortByCreatedAtDesc", () => {
  test("orders records newest first", () => {
    const out = sortByCreatedAtDesc([
      record("a", "2026-01-01T00:00:00Z"),
      record("b", "2026-03-01T00:00:00Z"),
      record("c", "2026-02-01T00:00:00Z"),
    ]);

    expect(out.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  test("does not mutate the array it was given", () => {
    const input = [record("a", "2026-01-01T00:00:00Z"), record("b", "2026-03-01T00:00:00Z")];
    const originalOrder = input.map((r) => r.id);

    sortByCreatedAtDesc(input);

    expect(input.map((r) => r.id)).toEqual(originalOrder);
  });

  test("an already-descending input is left in order", () => {
    const out = sortByCreatedAtDesc([
      record("newest", "2026-03-01T00:00:00Z"),
      record("oldest", "2026-01-01T00:00:00Z"),
    ]);

    expect(out.map((r) => r.id)).toEqual(["newest", "oldest"]);
  });

  test("empty input stays empty", () => {
    expect(sortByCreatedAtDesc([])).toEqual([]);
  });
});
