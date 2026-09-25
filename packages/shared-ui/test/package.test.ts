import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  ALL_FONT_FACES,
  FONT_FAMILIES,
  FONT_IDS,
  FONT_SUBSETS,
  nextFontId,
} from "../src/theming/font-families";
import { themeBootstrapScript } from "../src/theming/ThemeBootstrap";
import { VERSION } from "../src/version";
import { declaredWeights, renderStylesCss, type FontManifest } from "../scripts/font-css";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(ROOT, "fonts/manifest.json"), "utf-8")) as FontManifest;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("the font table is the founder's ten, in the founder's order", () => {
  assert.deepEqual(FONT_IDS, [
    "outfit",
    "inter",
    "nunito",
    "lexend",
    "archivo-black",
    "montserrat",
    "varela-round",
    "space-grotesk",
    "plus-jakarta-sans",
    "source-sans-3",
  ]);
  assert.equal(nextFontId("source-sans-3"), "outfit");
});

// AC 4: every face has a woff2 for every declared weight in both subsets.
test("every face ships woff2 for each declared weight in latin and latin-ext", () => {
  for (const face of ALL_FONT_FACES) {
    const files = manifest[face.id];
    assert.ok(files, `${face.id} missing from fonts/manifest.json — run fonts:fetch`);
    for (const subset of FONT_SUBSETS) {
      for (const weight of declaredWeights(face.weights)) {
        const hit = files.find((f) => f.subset === subset && f.weight === weight);
        assert.ok(hit, `${face.id}: no ${subset} file for weight ${weight}`);
        assert.ok(existsSync(join(ROOT, hit.file)), `${hit.file} is in the manifest but not on disk`);
      }
    }
    // A weight in the files the table does not declare means the table lies about the face.
    for (const f of files) {
      assert.ok(
        declaredWeights(face.weights).includes(f.weight),
        `${face.id}: file ${f.file} has weight ${f.weight} the table does not declare`
      );
    }
    assert.ok(existsSync(join(ROOT, "fonts", face.id, "OFL.txt")), `${face.id}: licence missing`);
  }
});

test("styles.css is what the table and the manifest generate", () => {
  assert.equal(
    readFileSync(join(ROOT, "styles.css"), "utf-8"),
    renderStylesCss(manifest),
    "styles.css is stale — run `npm run fonts:fetch -w @tokenwise/shared-ui`"
  );
});

test("styles.css never declares a weight a face does not have", () => {
  const css = readFileSync(join(ROOT, "styles.css"), "utf-8");
  for (const block of css.matchAll(/@font-face \{([^}]*)\}/g)) {
    const family = block[1]!.match(/font-family: "([^"]+)"/)![1];
    const weight = block[1]!.match(/font-weight: ([^;]+);/)![1]!;
    const face = ALL_FONT_FACES.find((f) => f.stack.startsWith(`"${family}"`));
    assert.ok(face, `@font-face for unknown family ${family}`);
    assert.ok(declaredWeights(face.weights).includes(weight), `${family} declares weight ${weight}`);
  }
  for (const f of FONT_FAMILIES) {
    assert.ok(css.includes(`html[data-font="${f.id}"]`), `no html[data-font] rule for ${f.id}`);
  }
});

// AC 5: the package cannot reach auth, i18n or the host, and fetches nothing.
test("the package imports no firebase, no next-intl, no host alias, and fetches nothing", () => {
  const sources = walk(join(ROOT, "src"));
  assert.ok(sources.length > 5);
  for (const file of sources) {
    const text = readFileSync(file, "utf-8");
    const where = relative(ROOT, file);
    for (const m of text.matchAll(/from\s+"([^"]+)"/g)) {
      const spec = m[1]!;
      assert.ok(
        spec.startsWith(".") || ["react", "react-dom", "next/link", "next/image"].includes(spec),
        `${where} imports "${spec}" — the package may import only react, react-dom, next/link, next/image and itself`
      );
    }
    assert.doesNotMatch(text, /\bfetch\(|XMLHttpRequest|https?:\/\//, `${where} reaches the network`);
  }
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), [], "the package has no runtime dependencies");
});

test("styles.css loads no font from a third party", () => {
  const css = readFileSync(join(ROOT, "styles.css"), "utf-8");
  for (const m of css.matchAll(/url\("([^"]+)"\)/g)) {
    assert.match(m[1]!, /^\.\/fonts\//, `styles.css loads ${m[1]}`);
  }
});

test("the version stamped on the header is the package version", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  assert.equal(VERSION, pkg.version);
});

test("the bootstrap script is a constant built only from the id lists", () => {
  assert.equal(themeBootstrapScript(true), themeBootstrapScript(true));
  assert.doesNotMatch(themeBootstrapScript(false), /scheme/);
  assert.match(themeBootstrapScript(true), /localStorage\.getItem\('scheme'\)/);
  for (const id of FONT_IDS) assert.ok(themeBootstrapScript(false).includes(`"${id}"`));
  // Never throws on a hostile store: everything sits inside one try.
  assert.match(themeBootstrapScript(true), /^try\{.*\}catch\(e\)\{\}$/);
});
