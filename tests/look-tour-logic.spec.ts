import { test, expect } from "@playwright/test";
import {
  APPEARANCES,
  BUTTON_STYLE_IDS,
  COLOR_SCHEME_IDS,
  FONT_IDS,
  IMAGE_TRANSPARENCY_STEPS,
} from "@tokenwise/shared-ui/theming";
import { lookOf, nextLook } from "../lib/look-tour";

/**
 * The golden demo's tour of looks (founder, 2026-11-26): as the visitor scrolls down, every new
 * section brings a random combination of colour, the picture's transparency, font, the action's
 * look and dark/light — the language stays. The rule is pure: from the look on screen, the next.
 */

const CONTROLS = {
  scheme: COLOR_SCHEME_IDS,
  font: FONT_IDS,
  appearance: APPEARANCES,
  button: BUTTON_STYLE_IDS,
  imageTransparency: IMAGE_TRANSPARENCY_STEPS,
} as const;
type Control = keyof typeof CONTROLS;
const KEYS = Object.keys(CONTROLS) as Control[];

const NOW = {
  scheme: COLOR_SCHEME_IDS[0]!,
  font: FONT_IDS[0]!,
  appearance: "dark",
  button: BUTTON_STYLE_IDS[0]!,
  imageTransparency: IMAGE_TRANSPARENCY_STEPS[0]!,
} as const;

test("every control changes — another palette, face, look of the action, step and the other side", () => {
  for (const r of [0, 0.2, 0.5, 0.8, 0.999]) {
    const next = nextLook(NOW, () => r);
    // The five controls and nothing else: the language is not a look.
    expect(Object.keys(next).sort()).toEqual([...KEYS].sort());
    for (const key of KEYS) {
      expect(CONTROLS[key] as readonly string[], key).toContain(next[key]);
      expect(next[key], key).not.toBe(NOW[key]);
    }
  }
});

test("it is random: any other value of each control can come up", () => {
  for (const key of KEYS) {
    const others = CONTROLS[key].length - 1;
    const seen = new Set<string>();
    for (let i = 0; i < others; i++) seen.add(nextLook(NOW, () => (i + 0.5) / others)[key]);
    expect(seen.size, key).toBe(others);
  }
});

test("a page without a mark is no obstacle: every value is open", () => {
  const next = nextLook({}, () => 0);
  for (const key of KEYS) expect(next[key], key).toBe(CONTROLS[key][0]);
});

test("the look on screen is read off <html>: dark is the page without the light mark", () => {
  expect(lookOf({ dataset: { scheme: "s", font: "f", button: "b", imageTransparency: "40" } })).toEqual({
    scheme: "s",
    font: "f",
    appearance: "dark",
    button: "b",
    imageTransparency: "40",
  });
  expect(lookOf({ dataset: { appearance: "light" } }).appearance).toBe("light");
  expect(lookOf({ dataset: { appearance: "dark" } }).appearance).toBe("dark");
});
