import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * The committed schema is what the harness sends to the content agent; the zod in
 * lib/prototype-config.ts is what fails the build. If they drift, a prototype is asked
 * for one shape and judged against another — the failure mode this file exists to make
 * impossible. Regenerating is one command: `npm run schema`.
 */
test("the committed prototype.schema.json is what the code emits", () => {
  const committed = readFileSync("prototype.schema.json", "utf-8");
  const fresh = execFileSync("npm", ["run", "--silent", "schema", "--", "--stdout"], {
    encoding: "utf-8",
  });
  expect(committed).toBe(fresh);
});

test("every pattern id in the code has an entry in the schema", async () => {
  const { PATTERN_SCHEMAS } = await import("../lib/prototype-config");
  const schema = JSON.parse(readFileSync("prototype.schema.json", "utf-8"));
  expect(Object.keys(schema.patterns).sort()).toEqual(Object.keys(PATTERN_SCHEMAS).sort());
});

test("the schema describes the closed enums, not free strings", () => {
  const schema = JSON.parse(readFileSync("prototype.schema.json", "utf-8"));
  const sections = schema.patterns.landing.properties.sections.items.enum;
  expect(sections).toContain("hero");
  expect(sections).not.toContain("gallery");
  const types = schema.patterns.dataGrid.properties.entity.properties.fields.items.properties.type.enum;
  expect(types).toEqual(["text", "longtext", "number", "date", "boolean", "select"]);
});
