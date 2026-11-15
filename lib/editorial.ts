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

// ── PR D (2026-10-26): the brand block, the concept strip ─────────────────────────────

/** The nine letters set across the whole width at the foot of every editorial page. */
export const BRAND_LETTERS = ["T", "O", "K", "E", "N", "W", "I", "S", "E"] as const;
export const BRAND_SITE = "https://tokenwise.sk/";

/**
 * Where "Built by TOKENWISE" leads: tokenwise.sk, tagged so the funnel can tell which
 * prototype sent the visitor. No slug (local dev, the golden demo) → no `utm_content`.
 */
export function brandHref(slug: string | null): string {
  const url = new URL(BRAND_SITE);
  url.searchParams.set("utm_source", "prototype");
  url.searchParams.set("utm_medium", "brand-mark");
  if (slug) url.searchParams.set("utm_content", slug);
  return url.toString();
}

/** The two rows of the showcase strip (`lib/showcase.ts`): the first half and the second, the second never longer. */
export function stripRows<T>(tiles: readonly T[]): [T[], T[]] {
  const half = Math.ceil(tiles.length / 2);
  return [tiles.slice(0, half), tiles.slice(half)];
}


/**
 * The light loops (T-340, after framer.com, vercel.com, linear.app and apple.com): short
 * seamless videos rendered in Blender from `scripts/motion/<name>.py` — neutral light on
 * black, so the page screens them onto any palette and tints them with the palette's second
 * accent (`editorial.css`, `.editorial-light`). Since T-369 (the founder's pick of the `stage`
 * scene among the three of T-368, `stage.css`) the loops are the stage's: `stage-field`, a
 * board of mini-LEDs behind the headline; `stage-slab`, the device in the first feature card.
 * The close keeps T-340's `closing-light`, ribbons of light across the band (T-374: the founder
 * picked them over the stage's orb).
 *
 * T-350 (2026-11-11, the founder's pick in the T-349 lesson: a loop library) adds four more
 * backlight motifs in the same language — `pulse-ring`, `orbit-tiles`, `horizon-sweep`,
 * `data-lines` — so each project can wear a different hero backlight for €0 (one render serves
 * every project and palette). A project chooses with the one `patterns.landing.motion` token
 * (`HERO_LOOPS` below); every loop ships rendered, so this list is what the asset tests cover.
 */
export const MOTION_LOOPS = [
  "stage-field",
  "stage-slab",
  "closing-light",
  "pulse-ring",
  "orbit-tiles",
  "horizon-sweep",
  "data-lines",
] as const;
export type MotionLoopName = (typeof MOTION_LOOPS)[number];

/**
 * The backlight loops a project may choose between for its hero — the T-350 library. The stage
 * board (`stage-field`) is the default and leads; the four T-350 motifs join it. `stage-slab`
 * and `closing-light` keep their fixed roles (the first feature card, the closing band) and are
 * not hero choices, so they are not offered here.
 */
export const HERO_LOOPS = ["stage-field", "pulse-ring", "orbit-tiles", "horizon-sweep", "data-lines"] as const;
export type HeroLoopName = (typeof HERO_LOOPS)[number];
export const DEFAULT_HERO_LOOP: HeroLoopName = "stage-field";

/** The hero backlight a config names, or the stage board when it names none (or something stale). Pure. */
export function heroLoop(motion: string | undefined): HeroLoopName {
  return (HERO_LOOPS as readonly string[]).includes(motion ?? "") ? (motion as HeroLoopName) : DEFAULT_HERO_LOOP;
}

/**
 * The hero archetype a prototype brief picks (factory-web T-370, the project chat's "which hero
 * does the landing open with?"): `brand` is the project's logo in black lacquer
 * (blender/logo_hero.py), `product` is the built app on a 3D phone (blender/phone_mockup.py),
 * `light` is the palette-agnostic light loop the stage paints today (the `HERO_LOOPS` above).
 * The orchestrator resolves the brief's pick and records it on `prototypes/{id}.hero` (T-373);
 * the template reads it with `heroArchetype` below and the stage honours it (T-419).
 *
 * `brand` and `product` each need a render a prototype has not got at build time — brand a logo
 * (coordinates with T-353/T-350), product a screenshot of the first publish (T-351) — so until
 * those assets land both fall back to the `light` loop, and a build never ships a blank hero. The
 * archetype is still carried to the DOM (`data-hero-archetype`, `hero.tsx`), so the pick is
 * honoured and observable, and a brand/product scene can key off it the moment it exists.
 */
export const HERO_ARCHETYPES = ["brand", "product", "light"] as const;
export type HeroArchetype = (typeof HERO_ARCHETYPES)[number];
export const DEFAULT_HERO_ARCHETYPE: HeroArchetype = "light";

/** The hero archetype a config names, or `light` when it names none or something stale — mirrors
 *  the orchestrator's resolveHero (T-373): a build is never failed over the pick. Pure. */
export function heroArchetype(hero: string | null | undefined): HeroArchetype {
  return (HERO_ARCHETYPES as readonly string[]).includes(hero ?? "") ? (hero as HeroArchetype) : DEFAULT_HERO_ARCHETYPE;
}

export interface MotionLoop {
  poster: string;
  /** VP9 WebM first, H.264 MP4 for Safari; `small` is the same file at half the width
   * (`<name>-sm`), what a phone loads (`MOTION_SMALL_QUERY`, `LightLoop`). */
  sources: { src: string; type: string; small: string }[];
}

/** A phone, by the page's own `sm` breakpoint (`@media (min-width: 640px)` everywhere in the editorial styles). */
export const MOTION_SMALL_QUERY = "(max-width: 639px)";

/** One loop's files under this build's base path. */
export function motionLoop(basePath: string, name: MotionLoopName): MotionLoop {
  const base = `${basePath}/motion/${name}`;
  return {
    poster: `${base}.webp`,
    sources: [
      { src: `${base}.webm`, type: "video/webm", small: `${base}-sm.webm` },
      { src: `${base}.mp4`, type: "video/mp4", small: `${base}-sm.mp4` },
    ],
  };
}

/** What one loop's three files may weigh together — every prototype ships every loop. */
export const MOTION_BUDGET_BYTES = 1_200_000;
