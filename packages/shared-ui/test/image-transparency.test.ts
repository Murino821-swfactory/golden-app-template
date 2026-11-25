import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_LABELS, format } from "../src/header/labels";
import {
  DEFAULT_IMAGE_TRANSPARENCY,
  IMAGE_TRANSPARENCY_STEPS,
  isImageTransparency,
  nextImageTransparency,
  type ImageTransparency,
} from "../src/theming/image-transparency";
import { themeBootstrapScript } from "../src/theming/ThemeBootstrap";

/**
 * The transparency of a page's picture (founder, 2026-11-25: "a new button in the header's menu
 * that sets the picture's transparency from 0 to 100 % in tens"): the steps, the cycle one button
 * walks, the script that brings a returning visitor's step back, and the control's words.
 */

test("the steps run from 0 to 100 % in tens, and the cycle wraps", () => {
  assert.deepEqual([...IMAGE_TRANSPARENCY_STEPS], ["0", "10", "20", "30", "40", "50", "60", "70", "80", "90", "100"]);
  assert.equal(DEFAULT_IMAGE_TRANSPARENCY, "0");
  let step: ImageTransparency = DEFAULT_IMAGE_TRANSPARENCY;
  const walked: string[] = [];
  for (let i = 0; i < IMAGE_TRANSPARENCY_STEPS.length; i++) {
    step = nextImageTransparency(step);
    walked.push(step);
  }
  assert.deepEqual(walked, ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "0"]);
});

test("only a step of the table is a step", () => {
  for (const step of IMAGE_TRANSPARENCY_STEPS) assert.equal(isImageTransparency(step), true);
  for (const other of ["5", "110", "-10", "0.5", "50%", "", null, undefined]) assert.equal(isImageTransparency(other), false, String(other));
});

test("the bootstrap brings back a stored step only when the host turned the control on", () => {
  const off = themeBootstrapScript(true, true);
  const on = themeBootstrapScript(true, true, true);
  assert.doesNotMatch(off, /imageTransparency/);
  assert.match(on, /localStorage\.getItem\('imageTransparency'\)/);
  assert.match(on, /d\.dataset\.imageTransparency=/);
  // Only a step of the table is ever written to the document.
  assert.ok(on.includes(JSON.stringify(IMAGE_TRANSPARENCY_STEPS)));
  // Still one constant per set of switches, and nothing else changed for a host without it.
  assert.equal(on, themeBootstrapScript(true, true, true));
  assert.equal(off, themeBootstrapScript(true, true, false));
});

test("the control has a name for the menu and a label that says the step on screen", () => {
  assert.ok(DEFAULT_LABELS.imageTransparency.length > 0);
  const label = format(DEFAULT_LABELS.changeImageTransparencyLabel, { value: "30", position: 4, total: 11 });
  assert.match(label, /30 %/);
  assert.match(label, /4 of 11/);
  assert.doesNotMatch(label, /\{/);
});
