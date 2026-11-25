import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PRESS_HOLD_MS, PRESS_SETTLE_MS } from "../src/theming/action-press";
import {
  BUTTON_STYLES,
  BUTTON_STYLE_IDS,
  DEFAULT_BUTTON_STYLE,
  buttonStyleById,
  isButtonStyleId,
  nextButtonStyleId,
} from "../src/theming/button-styles";
import { themeBootstrapScript } from "../src/theming/ThemeBootstrap";

/**
 * The look of a page's action (founder, 2026-11-25): a visitor steps through five looks with one
 * button, the same way as through the palettes and the faces. A look is a character of its own —
 * a surface, a depth, an answer to the pointer and to the click — not a corner radius: the table,
 * the cycle, the stylesheet a host imports and the script that brings a returning visitor's look
 * back.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** The stylesheet without its comments: prose may name a colour, a rule may not. */
const CSS = readFileSync(join(ROOT, "buttons.css"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of the first rule whose selector list is exactly `selector`. */
function rule(selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return CSS.match(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? null;
}

/** `css` with every block that opens with `opener` cut out (braces matched). */
function without(css: string, opener: RegExp): string {
  let out = css;
  for (let m = out.match(opener); m; m = out.match(opener)) {
    let depth = 0;
    let end = m.index! + m[0].length - 1;
    for (; end < out.length; end++) {
      if (out[end] === "{") depth++;
      if (out[end] === "}" && --depth === 0) break;
    }
    out = out.slice(0, m.index!) + out.slice(end + 1);
  }
  return out;
}

test("the looks are five, in the cycle's order, and the cycle wraps", () => {
  assert.deepEqual(BUTTON_STYLE_IDS, ["glow", "block", "glass", "orbit", "marker"]);
  assert.equal(DEFAULT_BUTTON_STYLE, "glow");
  assert.equal(nextButtonStyleId("glow"), "block");
  assert.equal(nextButtonStyleId("marker"), "glow");
  // Every look has a name of its own for the control's accessible name.
  assert.equal(new Set(BUTTON_STYLES.map((s) => s.name)).size, BUTTON_STYLES.length);
  assert.equal(buttonStyleById("orbit").name, "Orbit");
});

test("only a look of the table is a look", () => {
  for (const id of BUTTON_STYLE_IDS) assert.ok(isButtonStyleId(id));
  for (const value of ["", "pill", "constructor", null, undefined]) assert.equal(isButtonStyleId(value), false);
});

test("every look has its rules: at rest, after the click, and its icon in the header", () => {
  for (const id of BUTTON_STYLE_IDS) {
    assert.ok(rule(`html[data-button="${id}"] [data-cta]`), `${id}: no rule at rest`);
    assert.match(CSS, new RegExp(`html\\[data-button="${id}"\\] \\[data-cta\\]\\[data-pressed\\]`), `${id}: nothing answers the click`);
    assert.ok(rule(`html[data-button="${id}"] .shared-button-glyph`), `${id}: no icon`);
  }
  // No rule for a look the table does not have.
  for (const m of CSS.matchAll(/html\[data-button="([^"]+)"\]/g)) assert.ok(isButtonStyleId(m[1]), `rule for unknown look ${m[1]}`);
});

// The founder's word on the first five (2026-11-25): a different corner is not a different look.
test("a look is more than its corners: no two are alike once the radius is set aside", () => {
  const bodies = BUTTON_STYLE_IDS.map((id) =>
    rule(`html[data-button="${id}"] [data-cta]`)!
      .replace(/border-radius:[^;]*;/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
  assert.equal(new Set(bodies).size, BUTTON_STYLE_IDS.length);
  // And each brings something of its own beyond a fill: a shadow, a blur, a line under the words…
  const own = (id: string, property: string) => new RegExp(`(?:^|[;\\s])${property}\\s*:`).test(rule(`html[data-button="${id}"] [data-cta]`)!);
  assert.ok(own("glow", "box-shadow"));
  assert.ok(own("block", "box-shadow") && own("block", "translate"));
  assert.ok(own("glass", "backdrop-filter"));
  assert.match(CSS, /html\[data-button="orbit"\] \[data-cta\]::before\s*\{[^}]*conic-gradient/);
  assert.ok(own("marker", "text-decoration-line"));
});

// A colour written into a look would be the one thing that does not repaint on "Change colour".
test("a look carries no colour of its own — only the host's --shared-* tokens", () => {
  assert.doesNotMatch(CSS, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\blab\(/i);
  for (const m of CSS.matchAll(/var\((--[\w-]+)/g)) assert.match(m[1]!, /^--shared-/, `reads ${m[1]}`);
});

test("every animation waits for the visitor's motion preference", () => {
  const still = without(without(CSS, /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{/), /@keyframes\s+[\w-]+\s*\{/);
  assert.doesNotMatch(still, /\banimation(?:-name)?\s*:/);
  // And there is something to wait for: the looks do move.
  assert.ok((CSS.match(/@keyframes\s+shared-cta-/g) ?? []).length >= 3);
});

test("keyboard focus stays visible on every look", () => {
  const focus = rule("html[data-button] [data-cta]:focus-visible");
  assert.ok(focus, "no focus rule");
  assert.match(focus, /outline\s*:/);
});

test("the package ships the stylesheet a host imports", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  assert.equal(pkg.exports["./buttons.css"], "./buttons.css");
  assert.ok(pkg.files.includes("buttons.css"));
});

// The click waits for the look's answer — briefly: past a third of a second a page feels slow.
test("the click is held for a moment, never for long", () => {
  assert.ok(PRESS_HOLD_MS >= 180 && PRESS_HOLD_MS <= 320, `${PRESS_HOLD_MS} ms`);
  assert.ok(PRESS_SETTLE_MS >= PRESS_HOLD_MS);
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
