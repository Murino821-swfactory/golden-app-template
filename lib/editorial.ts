/**
 * editorial.ts — the pure rules of the editorial presentation (2026-10-26, sw-factory
 * decision "premium prototype design"): which bento card is wide, which phrase of a
 * headline carries the weight, what the hero's object is and where the app's name is said.
 * No DOM, so `tests/editorial.spec.ts` pins them without a browser. The styles live beside
 * the components in `components/editorial/editorial.css`.
 */

import { cn } from "./utils";

export interface BentoSpan {
  /** The desktop decision: this card spans two of the three columns. */
  wide: boolean;
  className: string;
}

/**
 * Which cards span two columns, so every row of the bento is full. Three columns on a
 * desktop: six cards alternate wide-left, wide-right, wide-left (0, 3, 4); five get one
 * wide card, four get two, three fill one row as they are. Two columns on a tablet: the
 * first and, for an even count, the last.
 */
export function bentoSpan(index: number, count: number): BentoSpan {
  const lg = count % 3 === 0 ? (count >= 6 ? [0, 3, 4] : []) : count % 3 === 1 ? [0, 3] : [0];
  const sm = count % 2 === 0 ? [0, count - 1] : [0];
  const wideLg = lg.includes(index);
  const wideSm = sm.includes(index);
  return {
    wide: wideLg,
    className: cn(wideSm && "sm:col-span-2", wideLg ? "lg:col-span-2" : wideSm && "lg:col-span-1"),
  };
}

export interface DisplaySplit {
  before: string;
  /** The one phrase set in weight — the one emphasis a one-hue palette leaves. */
  emphasis: string;
  after: string;
}

const CLAUSE_BREAKS: ReadonlyArray<{ pattern: RegExp; keep: number }> = [
  { pattern: /\s[—–-]\s/, keep: 0 },
  { pattern: /:\s/, keep: 1 },
  { pattern: /\.\s/, keep: 1 },
];

/**
 * Splits a headline so one phrase carries the weight. A headline with a clause break — a
 * dash, a colon or a full stop with more words after it — leads with its first clause; a
 * longer one closes on its last two words; a short one is set in weight throughout. The
 * three parts concatenate back to the configured string, character for character: tests,
 * search engines and assistive technology read the same words.
 */
export function splitDisplay(text: string): DisplaySplit {
  let best: { at: number } | null = null;
  for (const { pattern, keep } of CLAUSE_BREAKS) {
    const match = pattern.exec(text);
    if (!match) continue;
    const at = match.index + keep;
    const rest = text.slice(match.index + match[0].length);
    if (at === 0 || !/\S/.test(rest)) continue;
    if (!best || at < best.at) best = { at };
  }
  if (best) return { before: "", emphasis: text.slice(0, best.at), after: text.slice(best.at) };
  const words = text.trim().split(/\s+/);
  if (words.length < 5) return { before: "", emphasis: text, after: "" };
  const emphasis = words.slice(-2).join(" ");
  const cut = text.lastIndexOf(emphasis);
  return { before: text.slice(0, cut), emphasis, after: text.slice(cut + emphasis.length) };
}

export type HeroObjectKind = "preview" | "offers" | "none";

/**
 * What the lit frame under the headline holds: the product itself — the sample records the
 * grid will show, else the first offers of the catalogue — and nothing when the prototype
 * has neither (a concept presentation reads as typography and light alone).
 */
export function heroObjectKind(input: { samples: number; offers: number }): HeroObjectKind {
  if (input.samples > 0) return "preview";
  if (input.offers > 0) return "offers";
  return "none";
}

export type HeroNamePlacement = "frame" | "eyebrow" | "hidden";

/**
 * Where the hero says the app's name, exactly once (`[data-app-name]`): in the frame's
 * title bar when there is a frame; in the eyebrow pill when the customer wrote no eyebrow
 * of their own; otherwise out of sight, for assistive technology and tests only.
 */
export function heroNamePlacement(input: { hasFrame: boolean; customEyebrow: boolean }): HeroNamePlacement {
  if (input.hasFrame) return "frame";
  return input.customEyebrow ? "hidden" : "eyebrow";
}
