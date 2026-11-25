import assert from "node:assert/strict";
import { test } from "node:test";
import {
  APPEARANCES,
  COLOR_SCHEME_IDS,
  cssBlocksForAll,
  cssBlocksForBothAppearances,
  cssVariablesFor,
  nextAppearance,
} from "../src/theming/color-schemes";
import { themeBootstrapScript } from "../src/theming/ThemeBootstrap";
import { DEFAULT_LABELS } from "../src/header/labels";

/**
 * Dark and light are the visitor's choice (founder decision 2026-11-25: the dark-only rule is
 * dropped). The header carries a switch beside colour and font, so a build ships BOTH variants
 * of every palette and the switch is an attribute write, like "Change colour".
 */

test("there are two appearances and the switch steps between them", () => {
  assert.deepEqual([...APPEARANCES], ["dark", "light"]);
  assert.equal(nextAppearance("dark"), "light");
  assert.equal(nextAppearance("light"), "dark");
});

test("one stylesheet carries both variants of every palette", () => {
  const css = cssBlocksForBothAppearances();
  // The dark rules are exactly the ones every build has always shipped, and they come first.
  assert.ok(css.startsWith(cssBlocksForAll("dark")));
  for (const id of COLOR_SCHEME_IDS) {
    const light = cssVariablesFor(id, "light");
    const rule = `html[data-appearance="light"][data-scheme="${id}"]{`;
    const at = css.indexOf(rule);
    assert.ok(at > -1, `no light rule for ${id}`);
    const body = css.slice(at + rule.length, css.indexOf("}", at));
    assert.ok(body.includes(`--background:${light["--background"]}`), `${id}: light page`);
    assert.ok(body.includes(`--foreground:${light["--foreground"]}`), `${id}: light words`);
  }
});

test("a light rule outranks its dark one by specificity, not by order", () => {
  // `html[data-appearance][data-scheme]` is (0,2,1) against the dark rule's (0,1,1): a host
  // may place the stylesheet anywhere and a light page still paints light.
  const css = cssBlocksForBothAppearances();
  const lightRules = css.match(/html\[data-appearance="light"\]\[data-scheme="[^"]+"\]\{/g) ?? [];
  assert.equal(lightRules.length, COLOR_SCHEME_IDS.length);
  // No rule is keyed by the dark appearance: dark is the document without the light mark.
  assert.doesNotMatch(css, /data-appearance="dark"/);
});

test("the bootstrap applies a stored appearance only for a host that ships both variants", () => {
  const withPalettes = themeBootstrapScript(true);
  assert.match(withPalettes, /localStorage\.getItem\('appearance'\)/);
  // The stored value is only compared against the two ids, never written into markup…
  assert.ok(withPalettes.includes(JSON.stringify(APPEARANCES)));
  // …and shadcn's `.dark` class follows it, so `dark:` utilities flip with the tokens.
  assert.match(withPalettes, /classList\.toggle\('dark'/);
  // A host without palettes has one fixed look: a choice stored by another app on the same
  // origin (the golden demo lives on tokenwise.sk) must not reach it.
  assert.doesNotMatch(themeBootstrapScript(false), /appearance/);
  assert.match(withPalettes, /^try\{.*\}catch\(e\)\{\}$/);
});

test("the switch has a name and a word for each appearance", () => {
  assert.ok(DEFAULT_LABELS.appearance.length > 0);
  assert.ok(DEFAULT_LABELS.changeAppearanceLabel.includes("{name}"));
  assert.ok(DEFAULT_LABELS.appearanceDark.length > 0);
  assert.ok(DEFAULT_LABELS.appearanceLight.length > 0);
});
