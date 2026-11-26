import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_LABELS, format } from "../src/header/labels";
import { IMAGE_TRANSPARENCY_STEPS } from "../src/theming/image-transparency";
import {
  DEFAULT_IMAGE_VEIL,
  IMAGE_VEIL_STATES,
  isImageVeil,
  nextImageVeil,
} from "../src/theming/image-veil";
import { themeBootstrapScript } from "../src/theming/ThemeBootstrap";

/**
 * The veil over a page's picture, on or off (founder, 2026-11-26: "a configuration that turns the
 * layer used today on and off; it does not touch the transparency"): the two states, the toggle,
 * the script that brings a returning visitor's choice back, and the control's words.
 */

test("the veil is on or off, a first visit has it on, and one click toggles it", () => {
  assert.deepEqual([...IMAGE_VEIL_STATES], ["on", "off"]);
  assert.equal(DEFAULT_IMAGE_VEIL, "on");
  assert.equal(nextImageVeil("on"), "off");
  assert.equal(nextImageVeil("off"), "on");
});

test("only on and off are states", () => {
  for (const state of IMAGE_VEIL_STATES) assert.equal(isImageVeil(state), true);
  for (const other of ["true", "false", "1", "0", "On", "", null, undefined]) assert.equal(isImageVeil(other), false, String(other));
});

test("the veil is not a step of the transparency: the two controls share no value", () => {
  for (const state of IMAGE_VEIL_STATES) assert.equal((IMAGE_TRANSPARENCY_STEPS as readonly string[]).includes(state), false);
});

test("the bootstrap brings back a stored state only when the host turned the control on", () => {
  const without = themeBootstrapScript(true, true, true);
  const withVeil = themeBootstrapScript(true, true, true, true);
  assert.doesNotMatch(without, /imageVeil/);
  assert.match(withVeil, /localStorage\.getItem\('imageVeil'\)/);
  assert.match(withVeil, /d\.dataset\.imageVeil=/);
  // Only a state of the table is ever written to the document.
  assert.ok(withVeil.includes(JSON.stringify(IMAGE_VEIL_STATES)));
  // The transparency's part is the same with or without the veil: neither touches the other.
  assert.ok(withVeil.includes(`localStorage.getItem('imageTransparency')`));
  assert.equal(without, themeBootstrapScript(true, true, true, false));
});

test("the control has a name for the menu and a label that says the state on screen", () => {
  assert.ok(DEFAULT_LABELS.imageVeil.length > 0);
  assert.ok(DEFAULT_LABELS.imageVeilOn.length > 0);
  assert.ok(DEFAULT_LABELS.imageVeilOff.length > 0);
  assert.notEqual(DEFAULT_LABELS.imageVeilOn, DEFAULT_LABELS.imageVeilOff);
  const label = format(DEFAULT_LABELS.changeImageVeilLabel, { name: DEFAULT_LABELS.imageVeilOff });
  assert.match(label, new RegExp(DEFAULT_LABELS.imageVeilOff));
  assert.doesNotMatch(label, /\{/);
  // Its name is not the transparency's: a screen reader tells the two apart.
  assert.notEqual(DEFAULT_LABELS.imageVeil, DEFAULT_LABELS.imageTransparency);
});
