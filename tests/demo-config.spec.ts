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
 * The demo at /demo/golden is an ordinary prototype built from this config, and it has two
 * jobs that pull in opposite directions.
 *
 * It is the template's regression canary: every pattern is on, so a merge that breaks one
 * fails here before it reaches a customer. Its config is fixed and hand-written rather than
 * model-chosen, which is what keeps the schema gate sharp now that the model picks its own
 * patterns and could otherwise always choose a set it can satisfy.
 *
 * It is also public — linked from the profile menu for every signed-in user. So unlike
 * `fixtures/full.config.json`, which exists to prove all seven section components render
 * and may use the locked three, this config may use only sections a model could have
 * written words for. A section falling back to `messages/*.json` on a public page shows
 * this repo's placeholder copy as though it were the product's own.
 */

const demo = JSON.parse(
  readFileSync(resolve(__dirname, "../fixtures/demo.config.json"), "utf-8")
) as Record<string, unknown>;

test.describe("demo config", () => {
  test("is a valid config", () => {
    expect(() => parsePrototypeConfig(demo)).not.toThrow();
  });

  test("enables every pattern, so a broken one fails here first", () => {
    const enabled = Object.keys((demo.patterns ?? {}) as Record<string, unknown>).sort();
    const all = (Object.keys(PATTERN_SCHEMAS) as PatternId[]).sort();
    expect(enabled).toEqual(all);
  });

  test("uses only sections a model could have written words for", () => {
    const patterns = demo.patterns as { landing?: { sections?: string[] } };
    const sections = patterns.landing?.sections ?? [];
    const selectable = modelSelectableSections() as string[];

    expect(sections.length, "the demo landing renders no sections").toBeGreaterThan(0);
    for (const section of sections) {
      expect(selectable, `"${section}" has no copy schema and must not be on a public page`)
        .toContain(section);
    }
  });
});
