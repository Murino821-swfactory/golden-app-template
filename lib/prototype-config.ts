/**
 * prototype-config.ts — the single input that turns this template into one prototype.
 *
 * A prototype is NOT generated code. It is this template, unchanged, plus
 * `prototype.config.json` and `messages/*.json`. Everything the customer picked in the
 * wizard arrives here as data.
 *
 * **A pattern is enabled iff its config slice is present.** There is no separate boolean:
 * `patterns.mapBase` being there means the map renders, and zod then forces that slice to
 * carry everything the map needs. This is the template-side mirror of `requiredSchema` on
 * each pattern in Firestore `patternRegistry/golden-app-template` — the union of the
 * enabled patterns' schemas is exactly what the content agent must return.
 *
 * Invalid config is a LOUD build failure, never a silent default: a prototype that quietly
 * drops the one feature the customer asked for is worse than one that refuses to build.
 * See `docs/decisions/prototype-patterns-not-archetypes.md` (§C) in the sw-factory repo.
 */

import { z } from "zod";
import rawConfig from "../prototype.config.json";
import { COLOR_SCHEME_IDS } from "./color-schemes";

/** Re-exported, not restated: `color-schemes.ts` owns both the ids and their ramps, so a
 * fifth palette is one edit. A second literal here is how P5 happened. */
export const COLOR_SCHEMES = COLOR_SCHEME_IDS;

/** Landing sections that exist in `components/sections/`. A closed enum on purpose: an
 * unknown id must fail the build, not render nothing. */
export const SECTION_IDS = [
  "hero",
  "features",
  "pricing",
  "testimonials",
  "faq",
  "contact",
  "cta",
] as const;

/** Field types the generic `data-grid` and `map-base` patterns can render. Closed enum —
 * a new type is a deliberate decision with a decision record, not a config typo. */
export const FIELD_TYPES = [
  "text",
  "longtext",
  "number",
  "date",
  "boolean",
  "select",
] as const;

const entityFieldSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(FIELD_TYPES),
    /** Only meaningful for `select`; enforced by the superRefine below. */
    options: z.array(z.string().min(1)).min(1).optional(),
    required: z.boolean().default(false),
  })
  .superRefine((field, ctx) => {
    if (field.type === "select" && !field.options) {
      ctx.addIssue({
        code: "custom",
        message: `field "${field.key}": type "select" requires a non-empty "options" array`,
      });
    }
  });

export type EntityField = z.infer<typeof entityFieldSchema>;

/**
 * Per-pattern config slices. Each one mirrors that pattern's `requiredSchema` in
 * Firestore. Adding a pattern means adding a slice here AND the entry in the registry —
 * CI checks that neither exists without the other.
 */
const featureSchema = z.object({
  /** Modern emoji (flags, skin tones, ZWJ sequences) can be 8+ JS string chars. */
  icon: z.string().min(1).max(16).optional(),
  title: z.string().min(1),
  description: z.string().min(1),
});

export type Feature = z.infer<typeof featureSchema>;

export const PATTERN_SCHEMAS = {
  landing: z.object({
    sections: z.array(z.enum(SECTION_IDS)).min(1),
    /** Override the hero headline. Sonnet writes this; the translation fallback is just
     * a placeholder for local dev. */
    headline: z.string().min(1).optional(),
    subheadline: z.string().min(1).optional(),
    /** Feature cards shown in the features section. 1-6 items, each with an optional
     * emoji icon, a title, and a description. When absent, the section falls back to
     * translations (placeholder text). */
    features: z.array(featureSchema).min(1).max(6).optional(),
  }),
  dashboard: z.object({
    title: z.string().min(1),
  }),
  /** Nothing to configure — Google sign-in is the same everywhere by design. */
  authGoogle: z.object({}),
  cta: z.object({
    label: z.string().min(1),
    href: z.string().min(1),
  }),
  contactForm: z.object({
    heading: z.string().min(1),
    submitLabel: z.string().min(1),
  }),
  dataGrid: z.object({
    entity: z.object({
      key: z.string().min(1),
      label: z.string().min(1),
      fields: z.array(entityFieldSchema).min(1),
    }),
  }),
  mapBase: z.object({
    center: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    zoom: z.number().int().min(1).max(20),
  }),
} as const;

export type PatternId = keyof typeof PATTERN_SCHEMAS;

/** Patterns the wizard pre-checks by default. Hard-coded on purpose — the classifier that
 * used to guess this was removed [founder decision 2026-09-12]. */
export const DEFAULT_PATTERNS: readonly PatternId[] = [
  "landing",
  "dashboard",
  "authGoogle",
  "cta",
  "contactForm",
] as const;

const themeSchema = z.object({
  colorScheme: z.enum(COLOR_SCHEMES),
  style: z.enum(["minimal", "bold", "playful"]),
});

export const prototypeConfigSchema = z.object({
  appName: z.string().min(1),
  /** Meta description. Required, not optional: golden rule 3 (SEO+GEO) makes findability a
   * precondition of monetization, and a prototype inheriting the template's own blurb is a
   * silent regression the build would never catch. */
  description: z.string().min(1),
  theme: themeSchema,
  patterns: z.object({
    landing: PATTERN_SCHEMAS.landing.optional(),
    dashboard: PATTERN_SCHEMAS.dashboard.optional(),
    authGoogle: PATTERN_SCHEMAS.authGoogle.optional(),
    cta: PATTERN_SCHEMAS.cta.optional(),
    contactForm: PATTERN_SCHEMAS.contactForm.optional(),
    dataGrid: PATTERN_SCHEMAS.dataGrid.optional(),
    mapBase: PATTERN_SCHEMAS.mapBase.optional(),
  }),
});

export type PrototypeConfig = z.infer<typeof prototypeConfigSchema>;

/**
 * Parse a config object. Throws with every zod issue listed, because a build log that says
 * "invalid config" without saying which field is a second bug on top of the first.
 */
export function parsePrototypeConfig(input: unknown): PrototypeConfig {
  const result = prototypeConfigSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid prototype.config.json:\n${issues}`);
  }
  return result.data;
}

/** The config this build was made from. Parsed at module load — an invalid config fails
 * `npm run build`, which is the whole point. */
export const config: PrototypeConfig = parsePrototypeConfig(rawConfig);

/** True when the customer enabled this pattern. Presence of the slice IS the switch. */
export function isPatternEnabled(id: PatternId): boolean {
  return config.patterns[id] !== undefined;
}
