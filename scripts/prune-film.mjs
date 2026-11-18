/**
 * prune-film.mjs — runs after `next build` (npm `postbuild`).
 *
 * The hero films (`public/film/`, `lib/hero-film.ts`) are the factory's own footage, shown only
 * by a config that names one (`patterns.landing.film`) or lets a visitor walk the library
 * (`patterns.landing.tryIt`) — the golden demo. Every other export drops the folder, so a
 * customer's prototype never ships footage it cannot show (`tests/hero-film.spec.ts` asks the
 * built site for a film and expects 404 there).
 */
import { existsSync, readFileSync, rmSync } from "node:fs";

const landing = JSON.parse(readFileSync("prototype.config.json", "utf-8")).patterns?.landing ?? {};
const shown = typeof landing.film === "string" || landing.tryIt === true;
if (!shown && existsSync("out/film")) {
  rmSync("out/film", { recursive: true });
  console.log("[prune-film] this config shows no film — removed out/film");
} else {
  console.log(`[prune-film] ${shown ? "films kept" : "no out/film to remove"}`);
}
