import { test, expect } from "@playwright/test";
import { encodeSnapshot, decodeSnapshot, repeatInput, type ResearchSnapshot } from "../lib/law-expert/saved";
import { searchQueryString } from "../lib/law-expert/api";
import { safePdfUrl } from "../lib/law-expert/view";
const snapshot: ResearchSnapshot = { version: 1, mode: "search", locale: "sk", facts: "Opis problému", filters: { source: "all", q: "krádež", page: 3, to: "2026-09-29" }, includeMemo: false, searchedAt: "2026-09-29T12:00:00Z", search: null, memo: null, selectedIds: ["nsud:247174"] };
test("snapshot roundtrip preserves inputs and selection; repeating resets only page", () => {
  const saved = decodeSnapshot(encodeSnapshot(snapshot));
  expect(saved).toEqual(snapshot);
  expect(repeatInput(saved)).toEqual({ mode: "search", facts: snapshot.facts, filters: { ...snapshot.filters, page: 0 }, includeMemo: false });
  expect(saved.filters.page).toBe(3);
});
test("unknown snapshots and oversized records fail before writing", () => {
  expect(() => decodeSnapshot('{"version":2}')).toThrow();
  expect(() => encodeSnapshot({ ...snapshot, facts: "x".repeat(700001) })).toThrow();
});
test("combined-search filters and source are serialized without dropping exact identifiers", () => {
  const p = new URLSearchParams(searchQueryString({ source: "nsud", fileNumber: "1Tdo/47/2026", ecli: "ECLI:SK:NSSR:2026:1", sort: "relevance", to: "2026-09-29" }));
  expect(p.get("source")).toBe("nsud"); expect(p.get("fileNumber")).toBe("1Tdo/47/2026");
  expect(p.get("ecli")).toBe("ECLI:SK:NSSR:2026:1"); expect(p.get("to")).toBe("2026-09-29");
});
test("NS SR PDF allowlist rejects redirects, query strings, traversal and lookalike hosts", () => {
  expect(safePdfUrl("https://www.nsud.sk/data/att/5a8/874346.283215.pdf")).not.toBeNull();
  for (const url of ["https://www.nsud.sk.evil.test/data/att/5a8/x.pdf", "https://www.nsud.sk/data/att/../x.pdf", "https://www.nsud.sk/data/att/5a8/x.pdf?next=evil", "javascript:alert(1)"]) expect(safePdfUrl(url)).toBeNull();
});
