#!/usr/bin/env node
/**
 * Serve the static export the way it will actually be served.
 *
 * A prototype is published as a subdirectory of tokenwise.sk, so it is built with
 * NEXT_PUBLIC_BASE_PATH=/newapp/<slug> and every asset URL it emits carries that prefix.
 * `serve out` puts index.html at `/`, where those URLs resolve to nothing — the page
 * loads and every stylesheet and chunk 404s. The smoke suite would then either fail for a
 * reason that has nothing to do with the prototype, or worse, pass against an unstyled
 * page and call it shipped.
 *
 * So when a base path is set, the export is staged under that path first and served from
 * the parent. Without one, this is `serve out` exactly as before, which is what the
 * template's own CI runs.
 */

import { spawn } from "node:child_process";
import { cpSync, rmSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.env.PORT || "3000";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
// A customer's texts on the golden demo (2026-11-27): in production a preview link asks
// factory-web's `/api/prototype-preview/<token>`. With PREVIEW_SAMPLE_TEXTS=1 this local server
// answers it from `fixtures/customer-texts/<token>.json`, so a preview can be checked on a PC.
const sampleTexts = process.env.PREVIEW_SAMPLE_TEXTS === "1";

let root = "out";

if (basePath || sampleTexts) {
  const staged = join(".preview", basePath.replace(/^\//, ""));
  rmSync(".preview", { recursive: true, force: true });
  mkdirSync(staged, { recursive: true });
  cpSync("out", staged, { recursive: true });
  root = ".preview";
  console.log(`[preview] serving out/ at ${basePath || "/"} (root ${root})`);
}

if (sampleTexts) {
  const api = join(".preview", "api", "prototype-preview");
  mkdirSync(api, { recursive: true });
  for (const file of readdirSync(join("fixtures", "customer-texts"))) {
    if (!file.endsWith(".json")) continue;
    const token = file.slice(0, -".json".length);
    cpSync(join("fixtures", "customer-texts", file), join(api, token));
    console.log(`[preview] sample texts: http://localhost:${PORT}${basePath}/?preview=${token}`);
  }
}

const child = spawn("npx", ["serve", root, "-l", PORT], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
