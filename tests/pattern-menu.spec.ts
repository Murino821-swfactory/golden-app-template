import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CONTENT_SCHEMAS,
  PATTERN_PURPOSE,
  PATTERN_SCHEMAS,
  SECTION_COPY_SOURCE,
  SECTION_IDS,
  modelSelectableSections,
  type ContentPatternId,
  type PatternId,
} from "../lib/prototype-config";

/**
 * The model picks the patterns and sections, so the template must publish a MENU: what
 * each pattern is for, and which sections it is safe to offer.
 *
 * Before this, the schema said what a pattern NEEDS and never what it is FOR, so a model
 * choosing between seven of them had nothing to choose on. And `SECTION_REGISTRY` renders
 * seven sections while only four have anywhere for a model to put words — the other three
 * fall back to `messages/*.json`, which on a customer-facing page means invented
 * testimonials and an invented price list.
 */

const patternIds = Object.keys(PATTERN_SCHEMAS) as PatternId[];

test.describe("pattern purpose", () => {
  test("every pattern in the schema has a purpose", () => {
    const described = Object.keys(PATTERN_PURPOSE).sort();
    expect(described).toEqual([...patternIds].sort());
  });

  for (const id of patternIds) {
    test(`${id}: purpose is a usable sentence, not a placeholder`, () => {
      const purpose = PATTERN_PURPOSE[id];
      // Written for a model, so it must actually say when to pick this pattern. A word or
      // two would parse and choose nothing.
      expect(purpose.trim().length, `purpose for "${id}" is too short to choose on`)
        .toBeGreaterThan(40);
    });
  }
});

test.describe("section copy source", () => {
  test("every section states where its words come from", () => {
    const stated = Object.keys(SECTION_COPY_SOURCE).sort();
    expect(stated).toEqual([...SECTION_IDS].sort());
  });

  test("a named copy source is a pattern that actually carries words", () => {
    const contentIds = Object.keys(CONTENT_SCHEMAS) as ContentPatternId[];
    for (const [section, source] of Object.entries(SECTION_COPY_SOURCE)) {
      if (source === null) continue;
      expect(contentIds, `section "${section}" names "${source}", which carries no copy`)
        .toContain(source);
    }
  });

  test("the model may choose exactly the sections that have a copy source", () => {
    const backed = SECTION_IDS.filter((id) => SECTION_COPY_SOURCE[id] !== null);
    expect([...modelSelectableSections()].sort()).toEqual([...backed].sort());
  });

  test("faq, pricing and testimonials are locked until they can be written", () => {
    const selectable = modelSelectableSections();
    for (const locked of ["faq", "pricing", "testimonials"] as const) {
      expect(selectable, `"${locked}" has no copy schema and must not be offered`)
        .not.toContain(locked);
    }
  });
});

/**
 * The menu only exists if it is PUBLISHED. The harness reads `prototype.schema.json` out of
 * the clone, never this module, so a purpose that lives only in TypeScript is a purpose no
 * model will ever see. CI already fails when the committed schema drifts from the code;
 * these assert the emitter carries the menu at all.
 */
test.describe("published menu", () => {
  const doc = JSON.parse(
    readFileSync(resolve(__dirname, "../prototype.schema.json"), "utf-8")
  ) as {
    menu?: {
      patterns?: Record<string, { purpose?: string }>;
      sections?: { selectable?: string[]; copySource?: Record<string, string | null> };
    };
  };

  test("every pattern's purpose reaches the schema verbatim", () => {
    const published = Object.fromEntries(
      Object.entries(doc.menu?.patterns ?? {}).map(([id, entry]) => [id, entry.purpose])
    );
    expect(published).toEqual(PATTERN_PURPOSE);
  });

  test("the selectable sections reach the schema", () => {
    expect(doc.menu?.sections?.selectable).toEqual(modelSelectableSections());
  });

  test("the copy-source map reaches the schema, locks included", () => {
    // Published with its nulls: the harness can then say WHY a section is unavailable
    // instead of silently not offering it.
    expect(doc.menu?.sections?.copySource).toEqual(SECTION_COPY_SOURCE);
  });
});
