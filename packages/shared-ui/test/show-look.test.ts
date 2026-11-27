import assert from "node:assert/strict";
import { test } from "node:test";
import { COLOR_SCHEME_IDS } from "../src/theming/color-schemes";
import { showLook } from "../src/theming/show-look";
import { schemeStore } from "../src/theming/stores";

/**
 * A look shown for this page view and not kept (2026-11-27, the golden demo's tour: "as the
 * visitor scrolls down, every new section shows a random combination of colour, transparency,
 * font, CTA and dark/light; the language stays"). The page and the header's controls follow it
 * exactly as after a click — the same attributes, the same `.dark` class, the same events — but
 * nothing reaches localStorage: a reload brings back the visitor's own choice, and tokenwise.sk,
 * which shares the demo's origin, never opens in a look nobody chose.
 */

/** Just enough of a browser for the stores: `<html>`, the window's events, localStorage. */
function page() {
  const dataset: Record<string, string> = {};
  const classes = new Set<string>();
  const events: string[] = [];
  const stored = new Map<string, string>();
  const define = (name: string, value: unknown) =>
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  define("document", {
    documentElement: {
      dataset,
      classList: {
        toggle: (name: string, on?: boolean) => {
          if (on) classes.add(name);
          else classes.delete(name);
          return Boolean(on);
        },
      },
    },
  });
  define("window", { dispatchEvent: (event: Event) => events.push(event.type) > 0 });
  define("localStorage", { setItem: (key: string, value: string) => void stored.set(key, value) });
  return { dataset, classes, events, stored };
}

const SCHEME = COLOR_SCHEME_IDS[3]!;

test("a shown look reaches the page and the header's controls, and is not kept", () => {
  const p = page();
  p.classes.add("dark");
  showLook({ scheme: SCHEME, font: "nunito", appearance: "light", button: "orbit", imageTransparency: "70" });
  assert.deepEqual(
    { ...p.dataset },
    { scheme: SCHEME, font: "nunito", appearance: "light", button: "orbit", imageTransparency: "70" }
  );
  // Light drops shadcn's class, as the switch does.
  assert.equal(p.classes.has("dark"), false);
  // Each control hears its own change, as after a click: the header's icons follow.
  assert.deepEqual(
    [...p.events].sort(),
    ["appearance-change", "button-change", "font-change", "image-transparency-change", "scheme-change"]
  );
  assert.equal(p.stored.size, 0, `stored ${[...p.stored.keys()].join(", ")}`);
});

test("the dark side brings shadcn's class back", () => {
  const p = page();
  showLook({ appearance: "dark" });
  assert.equal(p.dataset.appearance, "dark");
  assert.equal(p.classes.has("dark"), true);
  assert.equal(p.stored.size, 0);
});

test("a control the look leaves out stays as it is, and hears nothing", () => {
  const p = page();
  p.dataset.font = "inter";
  showLook({ scheme: SCHEME });
  assert.equal(p.dataset.font, "inter");
  assert.deepEqual(p.events, ["scheme-change"]);
});

test("a click still keeps the visitor's own choice", () => {
  const p = page();
  schemeStore.select(SCHEME);
  assert.equal(p.dataset.scheme, SCHEME);
  assert.equal(p.stored.get("scheme"), SCHEME);
  assert.deepEqual(p.events, ["scheme-change"]);
});
