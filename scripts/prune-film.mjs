/**
 * prune-film.mjs — runs after `next build` (npm `postbuild`).
 *
 * The hero assets (`public/film/`, `lib/hero-film.ts` — the films and the still scenes) are the
 * factory's own pictures, shown only by a config that names a film (`patterns.landing.film`) or
 * lets a visitor walk the database (`patterns.landing.tryIt`) — the golden demo. Every other
 * export drops the folder, so a customer's prototype never ships pictures it cannot show
 * (`tests/hero-film.spec.ts` asks the built site for a film and expects 404 there).
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
