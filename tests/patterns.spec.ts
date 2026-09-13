import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PATTERN_SCHEMAS, type PatternId } from "../lib/prototype-config";
import { PATTERN_IMPLEMENTATIONS } from "../lib/patterns";

/**
 * A pattern the wizard can offer must have code behind it.
 *
 * Without this, enabling a pattern nobody implemented renders nothing and no test notices:
 * an unimplemented pattern and a disabled one look identical from the outside. That is the
 * exact shape of the OTH-73 failure one level up — a customer asked for a map against a
 * template that had no map.
 */

const repoRoot = resolve(__dirname, "..");
const patternIds = Object.keys(PATTERN_SCHEMAS) as PatternId[];

test.describe("pattern implementations", () => {
  test("every pattern in the schema is listed in PATTERN_IMPLEMENTATIONS", () => {
    const listed = Object.keys(PATTERN_IMPLEMENTATIONS).sort();
    expect(listed).toEqual([...patternIds].sort());
  });

  for (const id of patternIds) {
    test(`${id}: declares at least one file, and every file exists`, () => {
      const files = PATTERN_IMPLEMENTATIONS[id];
      expect(files.length, `${id} declares no implementation files`).toBeGreaterThan(0);

      for (const file of files) {
        expect(
          existsSync(resolve(repoRoot, file)),
          `pattern "${id}" declares ${file}, which does not exist`
        ).toBe(true);
      }
    });
  }
});
