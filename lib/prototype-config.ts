/**
 * prototype-config.ts — the single input that turns this template into one prototype.
 *
 * A prototype is NOT generated code. It is this template, unchanged, plus
 * `prototype.config.json`. Everything the customer picked in the wizard arrives here as
 * data.
 *
 * **The config splits along one line: does this value change when the language changes?**
 *
 *   `patterns`          — what the prototype IS. Which patterns, which sections, an
 *                         entity's field keys and types, a map's centre. Written once,
 *                         however many languages the customer picked.
 *   `content[locale]`   — what it SAYS. Headlines, labels, the meta description.
 *
 * Before the split both lived in `patterns` (`entity.fields[].type` sat beside
 * `entity.fields[].label`), which had exactly one meaning for a second language: the
 * content agent would have had to invent the entity once per language, with nothing
 * forcing the copies to agree on field keys.
 *
 * **A pattern is enabled iff its STRUCTURE slice is present.** There is no separate
 * boolean: `patterns.mapBase` being there means the map renders, and zod then forces the
 * matching content slice to exist in every declared locale.
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

/**
 * The languages a prototype can be published in. Closed enum: a locale with no message
 * bundle would render the template's English chrome under the customer's foreign copy,
 * which reads as a bug rather than as a missing translation.
 */
export const LOCALES = ["en", "sk", "cs", "de", "pl", "es", "fr", "it"] as const;
export type Locale = (typeof LOCALES)[number];

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

/**
 * A field's SHAPE. Its human label is copy and lives in `content[locale].dataGrid`.
 *
 * `options` stays here despite being visible text: a select's options are also the values
 * written into Firestore, so translating them would change what is stored rather than how
 * it is displayed. They are written in the customer's primary language and are the one
 * user-visible string the language switcher does not touch — a known limitation, recorded
 * rather than hidden.
 */
const entityFieldSchema = z
  .object({
    key: z.string().min(1),
    type: z.enum(FIELD_TYPES),
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

export type EntityFieldShape = z.infer<typeof entityFieldSchema>;

/** A field as the UI consumes it: shape plus the label for the language on screen. */
export interface EntityField extends EntityFieldShape {
  label: string;
}

const featureSchema = z.object({
  /** Modern emoji (flags, skin tones, ZWJ sequences) can be 8+ JS string chars. */
  icon: z.string().min(1).max(16).optional(),
  title: z.string().min(1),
  description: z.string().min(1),
});

export type Feature = z.infer<typeof featureSchema>;

/**
 * STRUCTURE, per pattern. Mirrors that pattern's `requiredSchema` in Firestore. Adding a
 * pattern means adding a slice here AND the entry in the registry — CI checks that neither
 * exists without the other.
 */
export const PATTERN_SCHEMAS = {
  landing: z.object({
    sections: z.array(z.enum(SECTION_IDS)).min(1),
  }),
  dashboard: z.object({}),
  /** Nothing to configure — Google sign-in is the same everywhere by design. */
  authGoogle: z.object({}),
  cta: z.object({
    href: z.string().min(1),
  }),
  contactForm: z.object({}),
  dataGrid: z.object({
    entity: z.object({
      key: z.string().min(1),
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

/**
 * COPY, per pattern. Only patterns that carry words appear here — `authGoogle` and
 * `mapBase` say nothing of their own, so they have no content slice at all.
 */
export const CONTENT_SCHEMAS = {
  landing: z.object({
    /** Optional: the template must stay buildable before any content agent has run, and
     * the sections fall back to `messages/*.json` placeholders for local dev. */
    headline: z.string().min(1).optional(),
    subheadline: z.string().min(1).optional(),
    features: z.array(featureSchema).min(1).max(6).optional(),
  }),
  dashboard: z.object({ title: z.string().min(1) }),
  cta: z.object({ label: z.string().min(1) }),
  contactForm: z.object({
    heading: z.string().min(1),
    submitLabel: z.string().min(1),
  }),
  dataGrid: z.object({
    entityLabel: z.string().min(1),
    /** One label per field key in `patterns.dataGrid.entity.fields`. Checked below. */
    fieldLabels: z.record(z.string(), z.string().min(1)),
  }),
} as const;

export type ContentPatternId = keyof typeof CONTENT_SCHEMAS;

/**
 * Patterns whose copy is mandatory once the pattern is on. `landing` is absent on purpose
 * — its copy is optional (see above); a dashboard with no title or a CTA with no label is
 * a blank control, which is not a degraded experience but a broken one.
 */
const CONTENT_REQUIRED_FOR: readonly ContentPatternId[] = [
  "dashboard",
  "cta",
  "contactForm",
  "dataGrid",
];

/** Meta description, per language. Required, not optional: golden rule 3 (SEO+GEO) makes
 * findability a precondition of monetization, and a prototype inheriting the template's own
 * blurb is a silent regression the build would never catch. Exported so `npm run schema`
 * publishes it beside the pattern slices — the harness asks for a locale block as
 * `description` plus one slice per copy-bearing pattern, and a shape it is not told about
 * is a shape it will not ask a model for. */
export const LOCALE_DESCRIPTION_SCHEMA = z.string().min(1);

const localeContentSchema = z.object({
  description: LOCALE_DESCRIPTION_SCHEMA,
  landing: CONTENT_SCHEMAS.landing.optional(),
  dashboard: CONTENT_SCHEMAS.dashboard.optional(),
  cta: CONTENT_SCHEMAS.cta.optional(),
  contactForm: CONTENT_SCHEMAS.contactForm.optional(),
  dataGrid: CONTENT_SCHEMAS.dataGrid.optional(),
});

export type LocaleContent = z.infer<typeof localeContentSchema>;

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
});

export const prototypeConfigSchema = z
  .object({
    appName: z.string().min(1),
    locales: z.array(z.enum(LOCALES)).min(1),
    defaultLocale: z.enum(LOCALES),
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
    content: z.record(z.string(), localeContentSchema),
  })
  .superRefine((cfg, ctx) => {
    if (!cfg.locales.includes(cfg.defaultLocale)) {
      ctx.addIssue({
        code: "custom",
        path: ["defaultLocale"],
        message: `defaultLocale "${cfg.defaultLocale}" is not in locales [${cfg.locales.join(", ")}]`,
      });
    }

    // Declared languages and content blocks must be the same set, in both directions: a
    // missing block is a language the switcher offers and cannot render, and an extra one
    // is copy someone paid a model to write that no URL will ever show.
    for (const locale of cfg.locales) {
      if (!cfg.content[locale]) {
        ctx.addIssue({
          code: "custom",
          path: ["content", locale],
          message: `locale "${locale}" is declared but has no content block`,
        });
      }
    }
    for (const locale of Object.keys(cfg.content)) {
      if (!(cfg.locales as readonly string[]).includes(locale)) {
        ctx.addIssue({
          code: "custom",
          path: ["content", locale],
          message: `content block for "${locale}", which is not a declared locale`,
        });
      }
    }

    for (const locale of cfg.locales) {
      const block = cfg.content[locale];
      if (!block) continue;

      for (const pattern of CONTENT_REQUIRED_FOR) {
        if (cfg.patterns[pattern] !== undefined && block[pattern] === undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["content", locale, pattern],
            message: `pattern "${pattern}" is enabled but has no copy in "${locale}"`,
          });
        }
      }

      // Every field the grid renders needs a label in the language on screen; without this
      // the column header falls back to a machine key like `created_at`.
      const fields = cfg.patterns.dataGrid?.entity.fields ?? [];
      const labels = block.dataGrid?.fieldLabels ?? {};
      for (const field of fields) {
        if (!labels[field.key]) {
          ctx.addIssue({
            code: "custom",
            path: ["content", locale, "dataGrid", "fieldLabels", field.key],
            message: `field "${field.key}" has no label in "${locale}"`,
          });
        }
      }
    }
  });

export type PrototypeConfig = z.infer<typeof prototypeConfigSchema>;

/**
 * Lift a pre-split config into the new shape.
 *
 * The harness clones this repo's default branch with NO version pin
 * (`createPrototypeWorkspace` → `getDefaultBranch`), so between this landing and the
 * harness being deployed there is a window in which a harness that still writes the old
 * shape is composing configs against this parser. Rejecting them would fail every
 * prototype built in that window, and would also strand the `demo/<slug>` branch of every
 * prototype already shipped.
 *
 * Delete this once the harness is deployed and no `demo/*` branch predates the split.
 */
function migrateLegacyConfig(input: Record<string, unknown>): Record<string, unknown> {
  const patterns = (input.patterns ?? {}) as Record<string, Record<string, unknown>>;
  const structure: Record<string, unknown> = {};
  const copy: Record<string, unknown> = {
    description: input.description,
  };

  if (patterns.landing) {
    const { sections, headline, subheadline, features } = patterns.landing;
    structure.landing = { sections };
    copy.landing = { headline, subheadline, features };
  }
  if (patterns.dashboard) {
    structure.dashboard = {};
    copy.dashboard = { title: patterns.dashboard.title };
  }
  if (patterns.authGoogle) structure.authGoogle = {};
  if (patterns.cta) {
    structure.cta = { href: patterns.cta.href };
    copy.cta = { label: patterns.cta.label };
  }
  if (patterns.contactForm) {
    structure.contactForm = {};
    copy.contactForm = {
      heading: patterns.contactForm.heading,
      submitLabel: patterns.contactForm.submitLabel,
    };
  }
  if (patterns.dataGrid) {
    const entity = patterns.dataGrid.entity as {
      key: string;
      label: string;
      fields: Array<Record<string, unknown>>;
    };
    structure.dataGrid = {
      entity: {
        key: entity.key,
        fields: entity.fields.map(({ key, type, options, required }) => ({
          key,
          type,
          ...(options !== undefined ? { options } : {}),
          ...(required !== undefined ? { required } : {}),
        })),
      },
    };
    copy.dataGrid = {
      entityLabel: entity.label,
      fieldLabels: Object.fromEntries(
        entity.fields.map((f) => [f.key as string, f.label as string])
      ),
    };
  }
  if (patterns.mapBase) structure.mapBase = patterns.mapBase;

  const theme = (input.theme ?? {}) as Record<string, unknown>;

  return {
    appName: input.appName,
    locales: ["en"],
    defaultLocale: "en",
    // `style` (minimal | bold | playful) is dropped rather than carried: it was validated
    // here and consumed by nothing, so a customer who picked "bold" always got "minimal".
    theme: { colorScheme: theme.colorScheme },
    patterns: structure,
    content: { en: copy },
  };
}

/**
 * Parse a config object. Throws with every zod issue listed, because a build log that says
 * "invalid config" without saying which field is a second bug on top of the first.
 */
export function parsePrototypeConfig(input: unknown): PrototypeConfig {
  const candidate = input as Record<string, unknown>;
  const normalized =
    candidate && typeof candidate === "object" && candidate.content === undefined
      ? migrateLegacyConfig(candidate)
      : candidate;

  const result = prototypeConfigSchema.safeParse(normalized);
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

/**
 * The copy for one language, falling back to the default locale.
 *
 * The fallback is not laxity: the language switcher only ever offers declared locales, so
 * reaching it means a URL was typed or a link went stale, and showing the default language
 * beats showing an empty page.
 */
export function contentFor(
  cfg: PrototypeConfig,
  locale: string = cfg.defaultLocale
): LocaleContent {
  return cfg.content[locale] ?? cfg.content[cfg.defaultLocale]!;
}

/** True when the customer enabled this pattern. Presence of the structure slice IS the switch. */
export function isPatternEnabled(id: PatternId): boolean {
  return config.patterns[id] !== undefined;
}

/**
 * The grid's fields as the UI needs them: shape from `patterns`, label from `content`.
 * Pure, so the merge rule is testable without a browser.
 */
export function entityFieldsFor(cfg: PrototypeConfig, locale?: string): EntityField[] {
  const fields = cfg.patterns.dataGrid?.entity.fields ?? [];
  const labels = contentFor(cfg, locale).dataGrid?.fieldLabels ?? {};
  return fields.map((field) => ({ ...field, label: labels[field.key] ?? field.key }));
}
