/**
 * validate-config.ts — is prototype.config.json valid, without building?
 *
 * The assembly line needs to distinguish "the content call returned an unusable shape"
 * from "this template regressed". Before this script the only verdict available was
 * `npm run build`, which reported both as a build failure — so a schema defect looked
 * like a template bug and got retried instead of fixed.
 *
 * Deliberately reuses parsePrototypeConfig rather than the emitted JSON Schema: the zod
 * is what the build enforces, so this is the same judge, not a second opinion.
 *
 * No "type": "module" in package.json, so tsx runs this file as CJS: no top-level await,
 * and no `with { type: "json" }` import attribute — hence readFileSync + JSON.parse for
 * the config, and a dynamic import (awaited inside main()) for the module under test.
 * The dynamic import matters for a second reason: lib/prototype-config.ts parses its own
 * module-load-time `rawConfig` import at line 178, so a STATIC import of that module would
 * throw before this script's try block was ever entered, printing a raw stack trace
 * instead of the formatted zod issue list.
 *
 * Takes an optional path argument (`process.argv[2]`) so a test can assert a rejection
 * against a scratch file without touching the repo's shipped prototype.config.json.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  try {
    const target = process.argv[2] ?? resolve(__dirname, "../prototype.config.json");
    const rawConfig = JSON.parse(readFileSync(target, "utf-8"));
    const { parsePrototypeConfig } = await import("../lib/prototype-config");
    const config = parsePrototypeConfig(rawConfig);
    const enabled = (Object.keys(config.patterns) as Array<keyof typeof config.patterns>).filter(
      (k) => config.patterns[k] !== undefined
    );
    console.log(`prototype.config.json OK — "${config.appName}", patterns: ${enabled.join(", ")}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
