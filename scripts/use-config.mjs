/**
 * use-config.mjs — swap prototype.config.json for one of the CI fixtures.
 *
 * CI builds the template against several configs because a prototype differs from this
 * repo ONLY by this file. If the template builds green for the shipped config but breaks
 * for one a customer could pick, the build gate is theatre.
 *
 * Usage: node scripts/use-config.mjs <minimal|full|composed|default>
 *
 * "default" means "whatever is checked in" and is a no-op — correct in CI, where every
 * matrix job starts from a fresh checkout. Locally, after swapping to a fixture, restore
 * with `git checkout prototype.config.json`; this script will not do it for you, because
 * silently reverting a file someone may have edited on purpose is worse than the chore.
 */
import { copyFileSync, existsSync } from "node:fs";

const name = process.argv[2];
if (!name) {
  console.error("usage: node scripts/use-config.mjs <minimal|full|default>");
  process.exit(1);
}

if (name === "default") {
  console.log("[use-config] keeping the repo's own prototype.config.json");
  process.exit(0);
}

const src = `fixtures/${name}.config.json`;
if (!existsSync(src)) {
  console.error(`[use-config] no such fixture: ${src}`);
  process.exit(1);
}

copyFileSync(src, "prototype.config.json");
console.log(`[use-config] prototype.config.json <- ${src}`);
