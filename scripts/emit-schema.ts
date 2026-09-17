/**
 * emit-schema.ts — publish the config contract as JSON Schema.
 *
 * The harness composes prototype.config.json from a model's answer, and it must ask for
 * exactly the shape `lib/prototype-config.ts` will later enforce. Generating the schema
 * from those same zod objects means the question and the gate cannot disagree; a
 * hand-maintained copy could, silently, until a customer's build failed.
 *
 * Run `npm run schema` after changing PATTERN_SCHEMAS. CI fails if you forget.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import {
  CONTENT_SCHEMAS,
  LOCALE_DESCRIPTION_SCHEMA,
  PATTERN_SCHEMAS,
  prototypeConfigSchema,
} from "../lib/prototype-config";

// `io: "input"` describes what a producer must SEND. Without it, fields carrying a zod
// default (entityField.required) are emitted as required output fields, and the content
// agent would be told to supply something it is allowed to omit.
const toJson = (schema: z.ZodType) => z.toJSONSchema(schema, { io: "input" });

// Two sections because a config has two halves. `patterns` is what a prototype IS and is
// written once; `content` is what it SAYS and is written per locale. The harness embeds
// both in the content prompt, so asking for one shape and enforcing another is impossible
// by construction.
const document = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  patterns: Object.fromEntries(
    Object.entries(PATTERN_SCHEMAS).map(([id, schema]) => [id, toJson(schema)])
  ),
  content: {
    description: toJson(LOCALE_DESCRIPTION_SCHEMA),
    ...Object.fromEntries(
      Object.entries(CONTENT_SCHEMAS).map(([id, schema]) => [id, toJson(schema)])
    ),
  },
  root: toJson(prototypeConfigSchema),
};

const json = JSON.stringify(document, null, 2) + "\n";

if (process.argv.includes("--stdout")) {
  process.stdout.write(json);
} else {
  writeFileSync(resolve(__dirname, "../prototype.schema.json"), json);
  console.log("prototype.schema.json written");
}
