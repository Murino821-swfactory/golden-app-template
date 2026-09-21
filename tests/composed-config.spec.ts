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
 * `prototype.config.json` matters for a different reason: it is what gets published. A
 * section with no content slice falls back to this repo's `messages/*.json`, so a locked
 * section puts placeholder copy on a public page — which is how the demo spent a while
 * answering "How does it work?" with "It just works." In this repo that page is
 * /demo/golden; in a prototype build it is the customer's own site, and the rule is the
 * same one, because both are shown to a real person.
 */

/**
 * The fixture a CI matrix job swapped in, set per job in ci.yml. Absent (or "default")
 * means `prototype.config.json` is whatever the checkout holds — this repo's own config
 * in CI, the customer's config when the factory runs this suite as its smoke gate.
 */
const SWAPPED_IN_FIXTURE = process.env.PROTOTYPE_CONFIG_FIXTURE;

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

test("the config on disk puts no placeholder copy on a published page", () => {
  // Read the working tree, NOT `git show HEAD:`. This suite is also the factory's smoke
  // gate, where it runs inside a container over a bind-mounted checkout that git refuses
  // to read at all ("detected dubious ownership in repository at '/work'"). That refusal
  // failed five consecutive customer builds on 2026-09-19 while 184 other tests passed,
  // and reported the gate as `unknown` — so no git, in a test that has a file to read.
  //
  // Disk is also the more useful subject. Here it is what /demo/golden ships; in a
  // prototype build it is the customer's config, and checking it costs nothing behind the
  // harness's own composition check.
  //
  // The exception is a matrix job that deliberately swapped a fixture in: `full` uses
  // locked sections on purpose, to prove their components still render. A job holding a
  // config nobody publishes cannot answer a question about published ones, so it says so
  // instead of reconstructing a file it no longer has.
  test.skip(
    Boolean(SWAPPED_IN_FIXTURE) && SWAPPED_IN_FIXTURE !== "default",
    `prototype.config.json was replaced with fixtures/${SWAPPED_IN_FIXTURE}.config.json`
  );

  const selectable = modelSelectableSections() as string[];
  for (const section of sectionsOf(configAt("prototype.config.json"))) {
    expect(
      selectable,
      `"${section}" has no content slice, so it renders messages/*.json — placeholder copy on a published page`
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
