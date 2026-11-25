import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BUTTON_STYLES,
  BUTTON_STYLE_IDS,
  buttonCssBlocks,
  buttonStyleById,
  isButtonStyleId,
  nextButtonStyleId,
} from "../src/theming/button-styles";
import { themeBootstrapScript } from "../src/theming/ThemeBootstrap";

/**
 * The look of a page's action (founder, 2026-11-25): a visitor steps through it with one
 * button, the same way as through the palettes and the faces. The table, the cycle, the rules
 * a host's action reads and the script that brings a returning visitor's look back.
 */

const VARIABLES = [
  "--shared-button-radius",
  "--shared-button-bg",
  "--shared-button-bg-hover",
  "--shared-button-ink",
  "--shared-button-edge",
] as const;

test("the looks are five, in the cycle's order, and the cycle wraps", () => {
  assert.deepEqual(BUTTON_STYLE_IDS, ["pill", "rounded", "square", "outline", "soft"]);
  assert.equal(nextButtonStyleId("pill"), "rounded");
  assert.equal(nextButtonStyleId("soft"), "pill");
  // Every look has a name of its own for the control's accessible name.
  assert.equal(new Set(BUTTON_STYLES.map((s) => s.name)).size, BUTTON_STYLES.length);
  assert.equal(buttonStyleById("outline").name, "Outline");
});

test("only a look of the table is a look", () => {
  for (const id of BUTTON_STYLE_IDS) assert.ok(isButtonStyleId(id));
  for (const value of ["", "blob", "constructor", null, undefined]) assert.equal(isButtonStyleId(value), false);
});

test("every look is one rule keyed by html[data-button] that sets every variable an action reads", () => {
  const css = buttonCssBlocks();
  for (const id of BUTTON_STYLE_IDS) {
    const rule = css.match(new RegExp(`html\\[data-button="${id}"\\]\\{([^}]*)\\}`));
    assert.ok(rule, `no rule for ${id}`);
    for (const name of VARIABLES) assert.ok(rule[1]!.includes(`${name}:`), `${id} does not set ${name}`);
  }
  assert.equal(css.match(/html\[data-button=/g)!.length, BUTTON_STYLE_IDS.length);
});

test("the looks differ: no two set the same variables", () => {
  const bodies = BUTTON_STYLE_IDS.map((id) => buttonCssBlocks().match(new RegExp(`html\\[data-button="${id}"\\]\\{([^}]*)\\}`))![1]);
  assert.equal(new Set(bodies).size, BUTTON_STYLE_IDS.length);
});

// A colour written into a look would be the one thing that does not repaint on "Change colour".
test("a look carries no colour of its own — only the host's --shared-* tokens", () => {
  const css = buttonCssBlocks();
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/i);
  for (const m of css.matchAll(/var\((--[\w-]+)/g)) assert.match(m[1]!, /^--shared-/, `reads ${m[1]}`);
});

test("the bootstrap brings back a stored look only when the host turned looks on", () => {
  const off = themeBootstrapScript(true);
  const on = themeBootstrapScript(true, true);
  assert.doesNotMatch(off, /'button'/);
  assert.match(on, /localStorage\.getItem\('button'\)/);
  for (const id of BUTTON_STYLE_IDS) assert.ok(on.includes(`"${id}"`), id);
  // Still a constant, and still inside one try: a hostile store cannot blank the page.
  assert.equal(on, themeBootstrapScript(true, true));
  assert.match(on, /^try\{.*\}catch\(e\)\{\}$/);
  // The palette and the font are applied exactly as before.
  assert.ok(on.startsWith(off.slice(0, off.lastIndexOf("}catch"))));
});
