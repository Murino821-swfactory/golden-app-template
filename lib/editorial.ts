/**
 * editorial.ts — the pure rules of the editorial presentation (2026-10-26, sw-factory
 * decision "premium prototype design"): which bento card is wide, which phrase of a
 * headline carries the weight, what the hero's object is and where the app's name is said.
 * No DOM, so `tests/editorial.spec.ts` pins them without a browser. The styles live beside
 * the components in `components/editorial/editorial.css`.
 */

import { formatPrice, listingCards } from "./listings";
import { entityFieldsFor, type LocaleContent, type PrototypeConfig } from "./prototype-config";
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

export type ConceptTile =
  | { kind: "image"; src: string; alt: string; title: string }
  | { kind: "text"; eyebrow: string; title: string; value?: string };

export interface TextTile {
  eyebrow: string;
  title: string;
  value?: string;
}

export interface ConceptSources {
  /** Real screenshots of the prototype's pages, when the pipeline published them. */
  screens?: ReadonlyArray<{ src: string; alt: string }>;
  offers?: ReadonlyArray<TextTile>;
  records?: ReadonlyArray<TextTile>;
  kpis?: ReadonlyArray<TextTile>;
  features?: ReadonlyArray<TextTile>;
  questions?: ReadonlyArray<TextTile>;
}

/** Fewer tiles than this and the strip is not drawn — a loop of two cards reads as a bug. */
export const STRIP_MIN = 4;
export const STRIP_MAX = 10;

/**
 * What the two-row concept strip shows: the prototype's own screens when there are enough
 * of them, else the product's words in the order a visitor would want them — offers,
 * records, the dashboard's numbers, the features, the questions. At most ten tiles.
 */
export function conceptTiles(sources: ConceptSources): ConceptTile[] {
  const screens = sources.screens ?? [];
  if (screens.length >= STRIP_MIN) {
    return screens.slice(0, STRIP_MAX).map((s) => ({ kind: "image", src: s.src, alt: s.alt, title: s.alt }));
  }
  const text = [
    ...(sources.offers ?? []),
    ...(sources.records ?? []),
    ...(sources.kpis ?? []),
    ...(sources.features ?? []),
    ...(sources.questions ?? []),
  ];
  return text.slice(0, STRIP_MAX).map((t) => ({ kind: "text", ...t }));
}

/** The two rows of the strip: the first half and the second, the second never longer. */
export function stripRows<T>(tiles: readonly T[]): [T[], T[]] {
  const half = Math.ceil(tiles.length / 2);
  return [tiles.slice(0, half), tiles.slice(half)];
}


/**
 * The strip's sources read off the shipped config and the copy of one language. Pure, so
 * the test can pin the order on the config the repo ships. Booleans make poor tile titles
 * and are skipped; a record's title is its first other field, its value the second.
 */
export function conceptTilesFor(
  cfg: PrototypeConfig,
  copy: LocaleContent,
  locale: string,
  screens: ReadonlyArray<{ src: string; alt: string }>
): ConceptTile[] {
  const listings = cfg.patterns.listings;
  const offers: TextTile[] = listings
    ? listingCards(listings, copy.listings).map((card) => ({
        eyebrow: card.categoryLabel,
        title: card.title,
        ...(card.price !== undefined && listings.currency ? { value: formatPrice(card.price, listings.currency, locale) } : {}),
      }))
    : [];
  const fields = entityFieldsFor(cfg, locale).filter((f) => f.type !== "boolean");
  const records: TextTile[] = (copy.dataGrid?.sampleRecords ?? []).flatMap((sample) => {
    const [first, second] = fields;
    if (!first || sample[first.key] === undefined) return [];
    const value = second && sample[second.key] !== undefined ? `${second.label}: ${String(sample[second.key])}` : undefined;
    return [{ eyebrow: copy.dataGrid?.entityLabel ?? "", title: String(sample[first.key]), ...(value ? { value } : {}) }];
  });
  const kpis: TextTile[] = Object.values(copy.dashboard?.kpiLabels ?? {}).map((label) => ({
    eyebrow: copy.dashboard?.title ?? "",
    title: label,
  }));
  const features: TextTile[] = (copy.landing?.features ?? []).map((f) => ({ eyebrow: copy.landing?.featuresHeading ?? "", title: f.title }));
  const questions: TextTile[] = (copy.landing?.faq?.items ?? []).map((q) => ({ eyebrow: copy.landing?.faq?.heading ?? "", title: q.question }));
  return conceptTiles({ screens, offers, records, kpis, features, questions });
}
