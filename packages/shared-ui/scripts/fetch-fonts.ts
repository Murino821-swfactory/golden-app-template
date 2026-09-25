/**
 * `npm run fonts:fetch -w @tokenwise/shared-ui` — downloads every face in the font table
 * from Google Fonts into `fonts/`, with its OFL licence, then writes `fonts/manifest.json`
 * and regenerates `styles.css`. The output is committed; nothing is fetched at build time
 * or by a visitor's browser.
 *
 * Only the `latin` and `latin-ext` subsets are kept (latin-ext carries Slovak diacritics).
 * Google declares a variable face as ONE file per subset covering the whole weight axis, so
 * a variable face is two files and a static face two per weight.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_FONT_FACES, FONT_SUBSETS } from "../src/theming/font-families";
import { declaredWeights, renderStylesCss, type FontFile, type FontManifest } from "./font-css";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Google serves woff2 only to a browser it recognises.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function get(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res;
}

function familyOf(stack: string): string {
  return stack.match(/^"([^"]+)"/)![1]!;
}

function cssUrl(family: string, weights: readonly number[] | { min: number; max: number }): string {
  const axis =
    "min" in weights ? `${weights.min}..${weights.max}` : weights.join(";");
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${axis}&display=swap`;
}

/** Google's directory name in github.com/google/fonts: lower case, no spaces. */
function licenceUrl(family: string): string {
  return `https://raw.githubusercontent.com/google/fonts/main/ofl/${family.toLowerCase().replace(/\s+/g, "")}/OFL.txt`;
}

async function main(): Promise<void> {
  const manifest: FontManifest = {};

  for (const face of ALL_FONT_FACES) {
    const family = familyOf(face.stack);
    const css = await (await get(cssUrl(family, face.weights))).text();
    const dir = join(ROOT, "fonts", face.id);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });

    const files: FontFile[] = [];
    // Each block is preceded by a `/* subset */` comment.
    for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
      const subset = m[1]!;
      if (!(FONT_SUBSETS as readonly string[]).includes(subset)) continue;
      const body = m[2]!;
      const weight = body.match(/font-weight:\s*([^;]+);/)![1]!.trim();
      const src = body.match(/url\(([^)]+)\)/)![1]!;
      const unicodeRange = body.match(/unicode-range:\s*([^;]+);/)![1]!.trim();
      const name = weight.includes(" ") ? `${subset}.woff2` : `${subset}-${weight}.woff2`;
      const bytes = Buffer.from(await (await get(src)).arrayBuffer());
      await writeFile(join(dir, name), bytes);
      files.push({ file: `fonts/${face.id}/${name}`, subset, weight, unicodeRange });
    }

    const expected = declaredWeights(face.weights);
    for (const subset of FONT_SUBSETS) {
      for (const weight of expected) {
        if (!files.some((f) => f.subset === subset && f.weight === weight)) {
          throw new Error(`${family}: Google served no ${subset} file for weight ${weight}`);
        }
      }
    }

    await writeFile(join(dir, "OFL.txt"), await (await get(licenceUrl(family))).text());
    files.sort((a, b) => a.file.localeCompare(b.file));
    manifest[face.id] = files;
    console.log(`${family}: ${files.length} files`);
  }

  await writeFile(join(ROOT, "fonts", "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(join(ROOT, "styles.css"), renderStylesCss(manifest));
  console.log("wrote fonts/manifest.json and styles.css");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
