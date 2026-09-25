import { test, expect } from "@playwright/test";
import { searchQueryString, errorFromResponse } from "../lib/law-expert/api";
import {
  groupMemo,
  isUnsupported,
  citedSources,
  facetShares,
  factsState,
  caseRecordValues,
  safePdfUrl,
  FACTS_MIN,
  FACTS_MAX,
} from "../lib/law-expert/view";
import type { MemoBlock, MemoResponse, SourceDoc } from "../lib/law-expert/types";

/**
 * The law-expert research page (OTH-91) — the logic that decides what the page shows.
 * The signed-in page itself has no e2e test: the template's suite does not sign in with
 * Google. What it renders is decided here, and this file is where that is pinned.
 */

test.describe("searchQueryString", () => {
  test("drops empty filters and a first page", () => {
    expect(searchQueryString({ q: "  ", paragraph: "", page: 0 })).toBe("");
  });

  test("a date goes out as the date input gives it — yyyy-MM-dd, the only form InfoSúd honours", () => {
    expect(new URLSearchParams(searchQueryString({ from: "2024-01-31" })).get("from")).toBe("2024-01-31");
  });

  test("keeps set filters, trimmed and encoded", () => {
    const qs = new URLSearchParams(searchQueryString({ q: " krádež ", paragraph: "212", courtType: "Krajský súd", page: 2 }));
    expect(qs.get("q")).toBe("krádež");
    expect(qs.get("paragraph")).toBe("212");
    expect(qs.get("courtType")).toBe("Krajský súd");
    expect(qs.get("page")).toBe("2");
  });
});

test.describe("errorFromResponse", () => {
  test("names each failure the server can report", () => {
    expect(errorFromResponse(401, { error: "auth" })).toBe("auth");
    expect(errorFromResponse(400, { error: "invalid", field: "facts" })).toBe("invalid");
    expect(errorFromResponse(429, { error: "quota", reason: "user-daily" })).toBe("quota-user");
    expect(errorFromResponse(429, { error: "quota", reason: "global-daily" })).toBe("quota-global");
    expect(errorFromResponse(429, { error: "quota", reason: "rate" })).toBe("rate");
    expect(errorFromResponse(502, { error: "source" })).toBe("source");
  });

  test("anything unrecognised is an internal error, not a silent success", () => {
    expect(errorFromResponse(500, { error: "internal" })).toBe("internal");
    expect(errorFromResponse(404, "<html>")).toBe("internal");
    expect(errorFromResponse(503, null)).toBe("internal");
  });
});

const cited = (text: string, source = 0): MemoBlock => ({ text, citations: [{ source, quote: `q${source}` }] });
const plain = (text: string): MemoBlock => ({ text, citations: [] });

test.describe("memo rendering", () => {
  test("blocks group under their headings, in order", () => {
    const sections = groupMemo([
      { heading: "Právna kvalifikácia", text: "", citations: [] },
      cited("Skutok napĺňa znaky krádeže."),
      { heading: "Neistoty", text: "", citations: [] },
      plain("Nie je jasné, či išlo o vlámanie do uzavretého priestoru."),
    ]);
    expect(sections.map((s) => s.heading)).toEqual(["Právna kvalifikácia", "Neistoty"]);
    expect(sections[0]!.parts).toHaveLength(1);
    expect(sections[1]!.parts[0]!.unsupported).toBe(true);
  });

  test("text before the first heading is kept in an untitled section", () => {
    const sections = groupMemo([plain("Úvod."), { heading: "A", text: "", citations: [] }]);
    expect(sections[0]!.heading).toBeNull();
  });

  test("a sentence without a citation is flagged; connective fragments are not", () => {
    expect(isUnsupported(plain("Súdy v podobných prípadoch ukladali podmienečný trest odňatia slobody."))).toBe(true);
    expect(isUnsupported(plain(". "))).toBe(false);
    expect(isUnsupported(cited("Súdy v podobných prípadoch ukladali podmienečný trest odňatia slobody."))).toBe(false);
  });

  test("citation markers are the 1-based source numbers, each once, in order", () => {
    expect(
      citedSources({
        text: "x",
        citations: [
          { source: 2, quote: "a" },
          { source: 0, quote: "b" },
          { source: 2, quote: "c" },
        ],
      })
    ).toEqual([1, 3]);
  });
});

test.describe("facetShares", () => {
  test("top values with their share of the whole, largest first", () => {
    const shares = facetShares(
      [
        { value: "Trestný rozkaz", count: 15 },
        { value: "Rozsudok", count: 30 },
        { value: "Uznesenie", count: 5 },
      ],
      2
    );
    expect(shares).toEqual([
      { value: "Rozsudok", count: 30, percent: 60 },
      { value: "Trestný rozkaz", count: 15, percent: 30 },
    ]);
  });

  test("no values, no bars", () => {
    expect(facetShares([])).toEqual([]);
  });
});

test.describe("factsState", () => {
  test(`needs ${FACTS_MIN}–${FACTS_MAX} characters after trimming`, () => {
    expect(factsState("   krátke   ").valid).toBe(false);
    expect(factsState("x".repeat(FACTS_MIN)).valid).toBe(true);
    expect(factsState("x".repeat(FACTS_MAX + 1)).tooLong).toBe(true);
  });
});

test.describe("caseRecordValues", () => {
  const source: SourceDoc = {
    id: "a:b",
    court: "Okresný súd Košice I",
    fileNumber: "7T/6/2004",
    date: "04.06.2004",
    form: "Rozsudok",
    nature: [],
    snippet: [],
    pdfUrl: null,
    ecli: "ECLI:SK:OSKE1:2004:7104892312.6",
    truncated: false,
  };
  const memo: MemoResponse = {
    qualification: [{ section: "212", reason: "Vzatie cudzej veci.", slovLexUrl: "https://example" }],
    crimeType: "Majetkový",
    memo: { blocks: [] },
    sources: [source],
    facets: { courtType: [], region: [], form: [], nature: [], subarea: [] },
    model: "claude-haiku-4-5",
    costUsd: 0.02,
    timingsMs: {},
  };

  test("fills the case entity's own fields, with the qualification and sources in the notes", () => {
    const v = caseRecordValues(memo, { caseNumber: " 2T/5/2026 ", courtName: " Okresný súd Prešov " });
    expect(v.caseNumber).toBe("2T/5/2026");
    expect(v.courtName).toBe("Okresný súd Prešov");
    expect(v.crimeType).toBe("Majetkový");
    expect(v.status).toBe("Prebieha");
    expect(String(v.notes)).toContain("§ 212");
    expect(String(v.notes)).toContain("ECLI:SK:OSKE1:2004:7104892312.6");
  });
});

test.describe("safePdfUrl", () => {
  test("only InfoSúd's public decision links are rendered as links", () => {
    const ok = "https://obcan.justice.sk/content/public/item/2c9933d2-247e-4204-9ae9-f188535ec361";
    expect(safePdfUrl(ok)).toBe(ok);
    expect(safePdfUrl("javascript:alert(1)")).toBeNull();
    expect(safePdfUrl("https://evil.example/content/public/item/x")).toBeNull();
    expect(safePdfUrl(null)).toBeNull();
  });
});
