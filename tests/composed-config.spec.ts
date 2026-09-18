import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PATTERN_SCHEMAS,
  modelSelectableSections,
  parsePrototypeConfig,
  type PatternId,
} from "../lib/prototype-config";

/**
 * Two rules about the configs this repo commits, and one deliberate exception.
 *
 * `composed.config.json` is the shape a MODEL can produce: every pattern on, and only
 * sections it is allowed to choose. `full.config.json` looks similar and is not the same
 * thing — it uses all seven sections to prove every section component still renders, which
 * means it uses three a model may never pick. Keeping both is the point: one covers the
 * components, the other covers the output space the content call actually has.
 *
 * The committed `prototype.config.json` matters for a different reason: it is what
 * /demo/golden ships. A section with no content slice falls back to this repo's
 * `messages/*.json`, so a locked section there puts placeholder copy on a public page —
 * which is how the demo spent a while answering "How does it work?" with "It just works."
 */

function configAt(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(__dirname, "..", path), "utf-8")) as Record<
    string,
    unknown
  >;
}

function sectionsOf(config: Record<string, unknown>): string[] {
  const patterns = config.patterns as { landing?: { sections?: string[] } };
  return patterns.landing?.sections ?? [];
}

test.describe("composed config", () => {
  const composed = configAt("fixtures/composed.config.json");

  test("is a valid config", () => {
    expect(() => parsePrototypeConfig(composed)).not.toThrow();
  });

  test("enables every pattern, so a broken one fails here first", () => {
    const enabled = Object.keys(composed.patterns as Record<string, unknown>).sort();
    expect(enabled).toEqual((Object.keys(PATTERN_SCHEMAS) as PatternId[]).sort());
  });

  test("uses only sections a model could have chosen", () => {
    const selectable = modelSelectableSections() as string[];
    const sections = sectionsOf(composed);
    expect(sections.length, "the landing renders no sections").toBeGreaterThan(0);
    for (const section of sections) {
      expect(selectable, `a model may not choose "${section}", so this fixture may not either`)
        .toContain(section);
    }
  });
});

test("the shipped config puts no placeholder copy on the public demo", () => {
  const selectable = modelSelectableSections() as string[];
  for (const section of sectionsOf(configAt("prototype.config.json"))) {
    expect(
      selectable,
      `/demo/golden would render "${section}" from messages/*.json — placeholder copy on a public page`
    ).toContain(section);
  }
});

test("full.config.json is the exception, and still covers every section component", () => {
  // Not a violation of the rule above: nothing publishes this config, it exists so that a
  // section component cannot rot unnoticed while no other config renders it.
  const sections = sectionsOf(configAt("fixtures/full.config.json"));
  for (const locked of ["faq", "pricing", "testimonials"]) {
    expect(sections, `nothing else renders "${locked}" — this fixture is its only coverage`)
      .toContain(locked);
  }
});
