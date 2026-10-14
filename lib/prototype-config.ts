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
import { COLOR_SCHEME_IDS, LEGACY_SCHEME_IDS } from "@tokenwise/shared-ui/theming";

/** Re-exported, not restated: `color-schemes.ts` owns both the ids and their pairs, so a
 * sixteenth palette is one edit. A second literal here is how P5 happened. */
export const COLOR_SCHEMES = COLOR_SCHEME_IDS;

/**
 * The languages a prototype can be published in — exactly the ids with a bundle in
 * `messages/`. Closed enum: a locale with no bundle would render the template's English
 * chrome under the customer's foreign copy, which reads as a bug rather than as a missing
 * translation.
 *
 * **An id may not appear here until `messages/<id>.json` exists.** `tests/locale.spec.ts`
 * asserts the two sets are equal, in both directions, because this list used to be an
 * aspiration: it named eight languages while `messages/` held one, and the harness kept a
 * copy of it whose comment claimed the bundles existed. A customer who picked Hungarian —
 * which the wizard offered and this list did not — was silently given English.
 *
 * `npm run schema` publishes the list as `menu.locales` in `prototype.schema.json`, and the
 * harness reads it from the clone. There is no second copy to keep in step.
 */
export const LOCALES = ["en", "sk", "cs", "de", "pl", "hu", "fr", "es"] as const;
export type Locale = (typeof LOCALES)[number];

/** Landing sections that exist in `components/sections/`. A closed enum on purpose: an
 * unknown id must fail the build, not render nothing. */
export const SECTION_IDS = [
  "hero",
  "features",
  "howItWorks",
  "useCases",
  "comparison",
  "listings",
  "pricing",
  "testimonials",
  "faq",
  "contact",
  "cta",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

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
 * Feature icons a model may choose — Lucide names, drawn by lib/icons.ts in the palette's
 * colour. Emoji were the previous answer; they cannot repaint with "Change colour" and read
 * as AI-generated (sw-factory spec 2026-09-29-golden-template-v2-design.md §8.1). Closed so
 * `tests/icons.spec.ts` can prove every id resolves to a component.
 */
export const ICON_IDS = [
  "book-open", "calendar", "map-pin", "bell", "chart-line", "list-checks", "users", "wallet",
  "receipt", "shield-check", "clock", "search", "funnel", "file-text", "message-square", "mail",
  "phone", "camera", "heart", "star", "trophy", "target", "truck", "package", "shopping-cart",
  "credit-card", "graduation-cap", "stethoscope", "dumbbell", "leaf", "paw-print", "house",
  "building-2", "briefcase", "route", "timer", "scale", "gavel", "globe", "tag",
] as const;
export type IconId = (typeof ICON_IDS)[number];

/** Whether an offer can still be taken. Labels are chrome (`messages/*.json` → `listings`),
 * because the three states read the same in every prototype. */
export const LISTING_STATUSES = ["available", "reserved", "unavailable"] as const;

/** A key a model names (a category, an attribute): camelCase, so it can never collide with
 * a JavaScript property such as `constructor` once it is used to look up a label. */
const listingKeySchema = z.string().regex(/^[a-z][a-zA-Z0-9]{0,39}$/);

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
  icon: z.enum(ICON_IDS).optional().describe("The icon that names what the feature lets the user do."),
  title: z.string().min(1),
  description: z.string().min(1),
});

const kpiSchema = z.object({
  id: z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
  field: z.string().min(1),
  agg: z.enum(["count", "sum", "avg", "share"]),
  value: z.string().min(1).optional(),
});
export type Kpi = z.infer<typeof kpiSchema>;

const stepSchema = z.object({ title: z.string().min(1).max(40), description: z.string().min(1).max(140) });
const faqItemSchema = z.object({ question: z.string().min(1).max(120), answer: z.string().min(1).max(400) });

/** Why a model-written sample record could not have been stored by the grid. Pure. */
export function sampleRecordIssues(
  fields: readonly EntityFieldShape[],
  sample: Record<string, unknown>
): string[] {
  const issues: string[] = [];
  const known = new Set(fields.map((f) => f.key));
  for (const key of Object.keys(sample)) if (!known.has(key)) issues.push(`unknown field "${key}"`);
  for (const field of fields) {
    const v = Object.hasOwn(sample, field.key) ? sample[field.key] : undefined;
    if (v === undefined || v === "") {
      if (field.required) issues.push(`required field "${field.key}" is missing`);
      continue;
    }
    const bad = (why: string) => issues.push(`field "${field.key}": ${why}`);
    switch (field.type) {
      case "number":
        if (typeof v !== "number" || !Number.isFinite(v)) bad("must be a number");
        break;
      case "boolean":
        if (typeof v !== "boolean") bad("must be true or false");
        break;
      case "date":
        if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) bad("must be YYYY-MM-DD");
        break;
      case "select":
        if (typeof v !== "string" || !(field.options ?? []).includes(v)) bad(`must be one of ${(field.options ?? []).join(", ")}`);
        break;
      case "text":
        if (typeof v !== "string" || v.length > 200) bad("must be text of at most 200 characters");
        break;
      case "longtext":
        if (typeof v !== "string" || v.length > 400) bad("must be text of at most 400 characters");
        break;
    }
  }
  return issues;
}

/** Why a configured KPI could not be computed from the entity. Pure. */
export function kpiIssues(kpis: readonly Kpi[], fields: readonly EntityFieldShape[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const kpi of kpis) {
    if (seen.has(kpi.id)) issues.push(`kpi id "${kpi.id}" is used twice`);
    seen.add(kpi.id);
    if (kpi.agg === "count") {
      if (kpi.field !== "*") issues.push(`kpi "${kpi.id}": count takes field "*"`);
      continue;
    }
    const field = fields.find((f) => f.key === kpi.field);
    if (!field) {
      issues.push(`kpi "${kpi.id}": no field "${kpi.field}"`);
      continue;
    }
    if ((kpi.agg === "sum" || kpi.agg === "avg") && field.type !== "number") {
      issues.push(`kpi "${kpi.id}": ${kpi.agg} needs a number field`);
    }
    if (kpi.agg === "share" && (field.type !== "select" || !kpi.value || !(field.options ?? []).includes(kpi.value))) {
      issues.push(`kpi "${kpi.id}": share needs a select field and one of its options`);
    }
  }
  return issues;
}

export type Feature = z.infer<typeof featureSchema>;

export type ListingsPattern = z.infer<typeof PATTERN_SCHEMAS.listings>;
export type ListingsCopy = z.infer<typeof CONTENT_SCHEMAS.listings>;

/** Why the offers could not be rendered as declared. Pure. */
export function listingStructureIssues(listings: ListingsPattern): string[] {
  const issues: string[] = [];
  const categories = new Set(listings.categories);
  if (categories.size !== listings.categories.length) issues.push("categories must be unique");
  const attributeKeys = (listings.attributes ?? []).map((a) => a.key);
  if (new Set(attributeKeys).size !== attributeKeys.length) issues.push("attribute keys must be unique");
  const ids = new Set<string>();
  for (const item of listings.items) {
    if (ids.has(item.id)) issues.push(`item id "${item.id}" is used twice`);
    ids.add(item.id);
    if (!categories.has(item.category)) issues.push(`item "${item.id}": category "${item.category}" is not one of categories`);
    if (item.price !== undefined && !listings.currency) issues.push(`item "${item.id}" has a price but listings.currency is missing`);
    for (const key of Object.keys(item.attributes ?? {})) {
      if (!attributeKeys.includes(key)) issues.push(`item "${item.id}": attribute "${key}" is not declared in attributes`);
    }
  }
  return issues;
}

/** Why one language's copy cannot label every offer. `Object.hasOwn`, never `in`: a key
 * such as `constructor` must not find a label on the prototype chain. Pure. */
export function listingCopyIssues(listings: ListingsPattern, copy: ListingsCopy | undefined): string[] {
  if (!copy) return [];
  const issues: string[] = [];
  const has = (record: Record<string, unknown> | undefined, key: string) =>
    record !== undefined && Object.hasOwn(record, key) && Boolean(record[key]);
  for (const key of listings.categories) {
    if (!has(copy.categoryLabels, key)) issues.push(`category "${key}" has no label`);
  }
  for (const { key } of listings.attributes ?? []) {
    if (!has(copy.attributeLabels, key)) issues.push(`attribute "${key}" has no label`);
  }
  const ids = new Set(listings.items.map((item) => item.id));
  for (const id of ids) {
    if (!has(copy.items, id)) issues.push(`item "${id}" has no copy`);
  }
  for (const id of Object.keys(copy.items)) {
    if (!ids.has(id)) issues.push(`copy for item "${id}", which is not in patterns.listings.items`);
  }
  return issues;
}

/**
 * STRUCTURE, per pattern. This file is the ONLY source of truth for what a pattern is:
 * `npm run schema` publishes it as `prototype.schema.json` and the harness reads that out
 * of the clone it just made.
 *
 * An earlier version of this comment claimed the list mirrored a `patternRegistry`
 * document in Firestore and that CI checked the two agreed. Neither existed — the document
 * returned 404 and no such check was ever written. The registry is now cancelled rather
 * than deferred: a pattern IS code, so a database row claiming one exists renders nothing.
 * See `docs/decisions/prototype-model-composes.md` in the sw-factory repo.
 *
 * Adding a pattern means a slice here, an entry in `PATTERN_PURPOSE`, and files listed in
 * `PATTERN_IMPLEMENTATIONS` — `tests/` fails if any of the three is missing.
 */
export const PATTERN_SCHEMAS = {
  landing: z.object({
    sections: z.array(z.enum(SECTION_IDS)).min(1),
    presentation: z.enum(["story", "document"]).optional().describe("Story keeps a desktop stage in place while chapters enter on native scroll. Mobile, reduced motion and no JavaScript use a document. Omit for story; choose document for long-form pages."),
  }),
  dashboard: z.object({
    kpis: z
      .array(kpiSchema)
      .min(1)
      .max(3)
      .optional()
      .describe(
        'The one to three numbers this user checks first. Prefer a share of a status over a raw count. agg "count" takes field "*"; "sum"/"avg" a number field; "share" a select field plus one of its options as value.'
      ),
  }),
  /** Nothing to configure — Google sign-in is the same everywhere by design. */
  authGoogle: z.object({}),
  cta: z.object({
    href: z.string().min(1).describe(
      "Use an existing destination: /login with authGoogle, /dashboard with dashboard, " +
      "#contact when contact is a landing section, or #chapter-<section> for a rendered " +
      "landing section (for example #chapter-features). Never invent /app, /signup, " +
      "#start, download routes, or features not present in the template."
    ),
  }),
  contactForm: z.object({
    phone: z
      .enum(["hidden", "optional", "required"])
      .optional()
      .describe("Ask the visitor for a phone number: optional (or required) when the business calls leads back — property, trades, health, local services. Omit to ask only for an e-mail."),
  }),
  useCases: z.object({}).describe("Requires the useCases landing section and localized useCases copy."),
  comparison: z.object({}).describe("Requires the comparison landing section and localized comparison copy."),
  dataGrid: z.object({
    entity: z.object({
      key: z.string().min(1),
      fields: z.array(entityFieldSchema).min(1).max(12),
    }),
    boardBy: z
      .string()
      .min(1)
      .optional()
      .describe("Key of a select field that is a workflow stage (a status). Adds a board view grouped by its options. Omit when no field is a stage."),
  }),
  listings: z.object({
    categories: z
      .array(listingKeySchema)
      .min(1)
      .max(8)
      .describe("camelCase keys of the kinds of offer, e.g. apartment, house, office. Their labels go in content.<locale>.listings.categoryLabels."),
    attributes: z
      .array(z.object({
        key: listingKeySchema,
        unit: z.string().min(1).max(8).optional().describe("A unit that reads the same in every language, e.g. m², km, kg. Omit for counts."),
      }))
      .max(4)
      .optional()
      .describe("Up to four NUMERIC facts every card shows, e.g. area, rooms, capacity. Labels go in content.<locale>.listings.attributeLabels. Text facts belong in an item's highlights."),
    currency: z.string().regex(/^[A-Z]{3}$/).optional().describe("ISO 4217 code of the prices, e.g. EUR. Required when any item has a price."),
    items: z
      .array(z.object({
        id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/).describe("Stable lowercase id, e.g. offer-1. Titles go in content.<locale>.listings.items.<id>."),
        category: listingKeySchema.describe("One of categories."),
        price: z.number().nonnegative().optional().describe("Omit when the price is on request."),
        pricePeriod: z.enum(["once", "month"]).optional().describe("month for rent or a subscription; omit (once) for a sale."),
        status: z.enum(LISTING_STATUSES).optional().describe("Omit for available."),
        attributes: z.record(z.string(), z.number().nonnegative()).optional().describe("Values for the declared attribute keys."),
        location: z.object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
        }).optional().describe("Only when mapBase is enabled: where the offer is, near mapBase.center. Give one whenever the offer has a place; the map pins it. Omit it without a map — nothing shows it."),
      }))
      .min(3)
      .max(12)
      .describe("Three to twelve ILLUSTRATIVE offers the owner later replaces with real ones: plausible for the idea and region, never a real address, building, person, company or phone number."),
  }).describe("Requires the listings landing section and localized listings copy."),
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
 * What each pattern is FOR — the half of the contract the schema never carried.
 *
 * The schema says what a pattern NEEDS (`dataGrid` needs `entity.fields`). That is enough
 * to fill one in and useless for deciding whether to. Since the model now composes the
 * prototype, this is what it chooses on.
 *
 * Written for a model, not for a customer: nobody reads these in the wizard any more, so
 * they should be precise about WHEN to pick the pattern rather than flattering about what
 * it does.
 */
export const PATTERN_PURPOSE: Record<PatternId, string> = {
  landing:
    "The public page every visitor lands on. Always enabled — every other pattern sits " +
    "behind auth or below the fold, so a prototype without it opens on nothing.",
  dashboard:
    "A signed-in home screen summarising the user's own data, and the map of offers when " +
    "mapBase is enabled. ALWAYS enable it together with authGoogle; add dataGrid and kpis " +
    "when the idea describes something people return to and track over time.",
  authGoogle:
    "Google sign-in plus a route guard. Always enable it with dashboard, which is reachable " +
    "only after sign-in; it also serves personal data, saved work or anything 'my'.",
  cta: "A closing call-to-action band on the landing page. Pick it when the idea has one " +
    "obvious next step for a visitor: book, request, subscribe, start a trial.",
  contactForm:
    "A contact form that captures a message and an email address. Pick it for services, " +
    "consultancies and anything sold through a conversation rather than a signup.",
  useCases: "Concrete situations where the product helps. Pick when the idea names distinct audiences or jobs; describe their actions, without invented customers or results.",
  comparison: "A side-by-side comparison of the current workflow and the proposed workflow. Pick when the idea explicitly describes an alternative; never invent competitor claims, savings or prices.",
  dataGrid:
    "A table of records the user adds, edits and filters. Pick it when the idea is about " +
    "keeping track of things — an inventory, a catalogue, a register, a log of entries.",
  listings:
    "A public catalogue of what the business offers — properties, products, services, " +
    "courses, vehicles, venues — as cards with category, price, key numbers and a status, " +
    "filterable by category. Visitors can ask about one through the contact form, and " +
    "open the offers on a map when mapBase is enabled. ALWAYS enable it, with its landing section: every " +
    "prototype presents what it offers. The offers are illustrative until the owner " +
    "publishes real ones, so say so in the notice.",
  mapBase:
    "A map centred on the place the idea serves, with every offer that has a location " +
    "pinned on it. Pick it only when place is part of the idea itself, not merely mentioned " +
    "— offers that stand somewhere or are visited (properties, venues, rentals), routes, " +
    "coverage, territory. Leave it out otherwise: a map with nothing to pin is noise. When " +
    "picked, choose the centre and zoom of the city or region the idea names, or the " +
    "customer's country when it names none.",
};

/**
 * COPY, per pattern. Only patterns that carry words appear here — `authGoogle` and
 * `mapBase` say nothing of their own, so they have no content slice at all.
 */
export const CONTENT_SCHEMAS = {
  useCases: z.object({
    heading: z.string().min(1).max(80),
    items: z.array(z.object({
      title: z.string().min(1).max(60),
      situation: z.string().min(1).max(180),
      action: z.string().min(1).max(180),
    })).min(2).max(4).describe("Situations and actions supported by the idea. No invented customer names, endorsements or measured outcomes."),
  }),
  comparison: z.object({
    heading: z.string().min(1).max(80),
    beforeLabel: z.string().min(1).max(40),
    afterLabel: z.string().min(1).max(40),
    rows: z.array(z.object({
      topic: z.string().min(1).max(60),
      before: z.string().min(1).max(180),
      after: z.string().min(1).max(180),
    })).min(2).max(4).describe("Compare only facts supplied in the idea. No fabricated percentages, prices, competitor capabilities or performance promises."),
  }),
  landing: z.object({
    /** Optional: the template must stay buildable before any content agent has run, and
     * the sections fall back to `messages/*.json` placeholders for local dev. */
    headline: z.string().min(1).optional(),
    subheadline: z.string().min(1).optional(),
    features: z.array(featureSchema).min(1).max(6).optional(),
    featuresHeading: z
      .string().min(1).max(60).optional()
      .describe("Heading above the features, in the customer's words about their product — never about building or templates."),
    howItWorks: z
      .object({
        heading: z.string().min(1).max(60).optional(),
        steps: z.array(stepSchema).min(3).max(4).describe("The first three or four things a user does, in order, each starting with a verb."),
      })
      .optional(),
    faq: z
      .object({
        heading: z.string().min(1).max(60).optional(),
        items: z
          .array(faqItemSchema)
          .min(3)
          .max(6)
          .describe("Questions a visitor would ask before trying the app. Answer only what the idea states; never promise prices, integrations, certifications, availability or dates."),
      })
      .optional(),
  }),
  dashboard: z.object({
    title: z.string().min(1),
    intro: z.string().min(1).max(160).optional(),
    kpiLabels: z.record(z.string(), z.string().min(1).max(40)).optional().describe("A short label for each patterns.dashboard.kpis[].id."),
  }),
  cta: z.object({
    label: z.string().min(1),
    title: z
      .string().min(1).max(60).optional()
      .describe("Heading of the closing band, about the customer's product — never about building or templates."),
    subtitle: z.string().min(1).max(140).optional(),
  }),
  contactForm: z.object({
    heading: z.string().min(1),
    submitLabel: z.string().min(1),
    intro: z.string().min(1).max(160).optional(),
  }),
  listings: z.object({
    heading: z.string().min(1).max(80),
    intro: z.string().min(1).max(200).optional(),
    notice: z.string().min(1).max(160).describe("One sentence telling visitors these offers are illustrative examples, not a live offer."),
    categoryLabels: z.record(z.string(), z.string().min(1).max(40)).describe("A label for each patterns.listings.categories key."),
    attributeLabels: z.record(z.string(), z.string().min(1).max(40)).optional().describe("A label for each patterns.listings.attributes[].key."),
    items: z
      .record(z.string(), z.object({
        title: z.string().min(1).max(80),
        summary: z.string().min(1).max(300),
        highlights: z.array(z.string().min(1).max(60)).max(4).optional(),
      }))
      .describe("Copy for each patterns.listings.items[].id. No invented addresses, people, companies, ratings or guarantees."),
    inquireLabel: z.string().min(1).max(40).optional().describe("Button on each card that opens the contact form about that offer. Required when the contact section is rendered."),
  }),
  dataGrid: z.object({
    entityLabel: z.string().min(1),
    /** One label per field key in `patterns.dataGrid.entity.fields`. Checked below. */
    fieldLabels: z.record(z.string(), z.string().min(1)),
    sampleRecords: z
      .array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])))
      .length(3)
      .optional()
      .describe(
        "Three plausible example records a first-time user sees and may edit. Invented: never real people, real companies, phone numbers or e-mail addresses. Dates as YYYY-MM-DD within the last 60 days. Select values exactly as listed in options, even in other languages."
      ),
  }),
} as const;

export type ContentPatternId = keyof typeof CONTENT_SCHEMAS;

/**
 * Where each landing section gets its words, or `null` if it has nowhere to get them.
 *
 * `SECTION_REGISTRY` renders eight sections, but only six have a content slice a model
 * can fill. The other two fall back to `messages/*.json` — placeholder copy that is fine
 * in local dev and, on a page shown to a real prospect, means invented testimonials and an
 * invented price list. So they are not offered until someone writes their schemas.
 *
 * The map is also what ties a section to its pattern: a section whose copy comes from
 * `contactForm` cannot render without that pattern enabled, because the pattern is where
 * its configuration and its words live. Position and content are two different decisions
 * and both have to be made.
 *
 * `null` is a deliberate entry, not an omission — a new section must state its source, and
 * saying "none yet" is a valid answer that locks it rather than shipping placeholders.
 */
export const SECTION_COPY_SOURCE: Record<SectionId, ContentPatternId | null> = {
  hero: "landing",
  features: "landing",
  contact: "contactForm",
  cta: "cta",
  faq: "landing",
  howItWorks: "landing",
  useCases: "useCases",
  comparison: "comparison",
  listings: "listings",
  pricing: null,
  testimonials: null,
};

/** The sections a model may choose from: exactly those with somewhere to put words. */
export function modelSelectableSections(): SectionId[] {
  return SECTION_IDS.filter((id) => SECTION_COPY_SOURCE[id] !== null);
}

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
  "useCases",
  "comparison",
  "listings",
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
  useCases: CONTENT_SCHEMAS.useCases.optional(),
  comparison: CONTENT_SCHEMAS.comparison.optional(),
  listings: CONTENT_SCHEMAS.listings.optional(),
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
      useCases: PATTERN_SCHEMAS.useCases.optional(),
      comparison: PATTERN_SCHEMAS.comparison.optional(),
      listings: PATTERN_SCHEMAS.listings.optional(),
    }),
    content: z.record(z.string(), localeContentSchema),
  })
  .superRefine((cfg, ctx) => {
    const sections = cfg.patterns.landing?.sections ?? [];
    if (new Set(sections).size !== sections.length) {
      ctx.addIssue({ code: "custom", path: ["patterns", "landing", "sections"], message: "Landing sections must be unique" });
    }
    for (const pattern of ["useCases", "comparison", "listings"] as const) {
      if (Boolean(cfg.patterns[pattern]) !== sections.includes(pattern)) {
        ctx.addIssue({ code: "custom", path: ["patterns", pattern], message: `${pattern} pattern and landing section must be enabled together` });
      }
    }
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

    const listings = cfg.patterns.listings;
    if (listings) {
      for (const message of listingStructureIssues(listings)) {
        ctx.addIssue({ code: "custom", path: ["patterns", "listings"], message });
      }
    }

    const fields = cfg.patterns.dataGrid?.entity.fields ?? [];
    const kpis = cfg.patterns.dashboard?.kpis ?? [];
    if (kpis.length > 0 && !cfg.patterns.dataGrid) {
      ctx.addIssue({ code: "custom", path: ["patterns", "dashboard", "kpis"], message: "kpis need the dataGrid pattern" });
    }
    for (const message of kpiIssues(kpis, fields)) {
      ctx.addIssue({ code: "custom", path: ["patterns", "dashboard", "kpis"], message });
    }
    const boardBy = cfg.patterns.dataGrid?.boardBy;
    if (boardBy && fields.find((f) => f.key === boardBy)?.type !== "select") {
      ctx.addIssue({
        code: "custom",
        path: ["patterns", "dataGrid", "boardBy"],
        message: `boardBy "${boardBy}" is not a select field`,
      });
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
      const labels = block.dataGrid?.fieldLabels ?? {};
      for (const field of fields) {
        if (!Object.hasOwn(labels, field.key) || !labels[field.key]) {
          ctx.addIssue({
            code: "custom",
            path: ["content", locale, "dataGrid", "fieldLabels", field.key],
            message: `field "${field.key}" has no label in "${locale}"`,
          });
        }
      }

      // A section whose copy is a sub-slice of `landing` needs that sub-slice, or it would
      // render the template's placeholder on a customer's page.
      for (const section of ["howItWorks", "faq"] as const) {
        if (cfg.patterns.landing?.sections.includes(section) && !block.landing?.[section]) {
          ctx.addIssue({
            code: "custom",
            path: ["content", locale, "landing", section],
            message: `section "${section}" is enabled but has no copy in "${locale}"`,
          });
        }
      }
      if (listings) {
        for (const message of listingCopyIssues(listings, block.listings)) {
          ctx.addIssue({ code: "custom", path: ["content", locale, "listings"], message: `${message} in "${locale}"` });
        }
      }

      // Sample records must be records the grid could have stored.
      block.dataGrid?.sampleRecords?.forEach((sample, i) => {
        for (const message of sampleRecordIssues(fields, sample)) {
          ctx.addIssue({ code: "custom", path: ["content", locale, "dataGrid", "sampleRecords", i], message });
        }
      });
      for (const kpi of kpis) {
        if (!block.dashboard?.kpiLabels || !Object.hasOwn(block.dashboard.kpiLabels, kpi.id) || !block.dashboard.kpiLabels[kpi.id]) {
          ctx.addIssue({
            code: "custom",
            path: ["content", locale, "dashboard", "kpiLabels", kpi.id],
            message: `kpi "${kpi.id}" has no label in "${locale}"`,
          });
        }
      }
    }
  });

export type PrototypeConfig = z.infer<typeof prototypeConfigSchema>;

/** Copy that would otherwise silently fall back to starter messages on a customer page.
 * Published by emit-schema and enforced by the production gate from the same constants. */
export const PRODUCTION_SECTION_COPY: Record<string, string[]> = {
  hero: ["landing.headline", "landing.subheadline"],
  features: ["landing.featuresHeading", "landing.features"],
  howItWorks: ["landing.howItWorks.heading", "landing.howItWorks.steps"],
  faq: ["landing.faq.heading", "landing.faq.items"],
  listings: ["listings.heading", "listings.intro", "listings.notice"],
};
export const PRODUCTION_PATTERN_COPY: Record<string, string[]> = {
  listings: ["heading", "intro", "notice", "categoryLabels", "items"],
  cta: ["label", "title", "subtitle"],
  contactForm: ["heading", "submitLabel", "intro"],
  dashboard: ["title", "intro"],
  dataGrid: ["entityLabel", "fieldLabels", "sampleRecords"],
};

/**
 * Patterns every new customer prototype carries (founder decision 2026-10-09): the offers
 * and the signed-in dashboard — which is reachable only through sign-in, hence authGoogle.
 * The model is told so in each pattern's purpose; this list is what turns that request into
 * a gate the bounded repair can name. Published as `menu.requiredPatterns`.
 *
 * `mapBase` was on this list until 2026-10-10 (founder): a map belongs only where place is
 * part of the idea, so it is the model's choice like every other optional pattern.
 * Record: sw-factory docs/decisions/2026-10-09-listings-pattern.md (addendum).
 */
export const PRODUCTION_REQUIRED_PATTERNS: readonly PatternId[] = ["listings", "dashboard", "authGoogle"];

/**
 * A concept presentation: landing (and its CTA) and nothing else. This is what the factory
 * publishes when every model answer was rejected (sw-factory `briefFallback`, decision
 * 2026-10-08-prototype-content-delivery) — it deliberately claims no offers, accounts or
 * records, so the required patterns above do not apply to it. Pure.
 */
export function isPresentationOnly(cfg: Pick<PrototypeConfig, "patterns">): boolean {
  return (Object.keys(cfg.patterns) as PatternId[])
    .filter((id) => cfg.patterns[id] !== undefined)
    .every((id) => id === "landing" || id === "cta");
}

export function parseProductionPrototypeConfig(input: unknown): PrototypeConfig {
  const cfg = parsePrototypeConfig(input);
  const issues: string[] = [];
  if (!isPresentationOnly(cfg)) {
    for (const id of PRODUCTION_REQUIRED_PATTERNS) {
      if (cfg.patterns[id] === undefined) issues.push(`patterns.${id}: every prototype must enable it (${PATTERN_PURPOSE[id]})`);
    }
  }
  const sections = cfg.patterns.landing?.sections ?? [];
  if (!sections.includes("hero") || sections[0] !== "hero") issues.push("patterns.landing.sections: must start with hero");
  if (sections.some(section => SECTION_COPY_SOURCE[section] === null)) issues.push("patterns.landing.sections: contains a section with no customer copy contract");
  if (cfg.patterns.dataGrid && (!cfg.patterns.authGoogle || !cfg.patterns.dashboard)) issues.push("patterns.dataGrid: saved records require authGoogle and dashboard");
  const fields = cfg.patterns.dataGrid?.entity.fields ?? [];
  if (new Set(fields.map(field => field.key)).size !== fields.length) issues.push("patterns.dataGrid.entity.fields: keys must be unique");
  for (const field of fields) if (!/^[a-z][a-zA-Z0-9_]*$/.test(field.key)) issues.push(`patterns.dataGrid.entity.fields: invalid key ${field.key}`);
  for (const locale of cfg.locales) {
    const block = cfg.content[locale];
    const requirePath = (path: string) => {
      const value = path.split(".").reduce<unknown>((node, key) => node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined, block);
      if (value === undefined || value === null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && !value.length)) issues.push(`content.${locale}.${path}: customer copy is required`);
    };
    for (const section of sections) for (const path of PRODUCTION_SECTION_COPY[section] ?? []) requirePath(path);
    for (const [pattern, paths] of Object.entries(PRODUCTION_PATTERN_COPY)) {
      if (cfg.patterns[pattern as PatternId]) for (const path of paths) requirePath(`${pattern}.${path}`);
    }
    const checkStrings = (value: unknown, path: string) => {
      if (typeof value === "string" && !value.trim()) issues.push(`${path}: blank customer text`);
      else if (Array.isArray(value)) value.forEach((item, index) => checkStrings(item, `${path}.${index}`));
      else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) checkStrings(item, `${path}.${key}`);
    };
    if (cfg.patterns.listings && sections.includes("contact")) requirePath("listings.inquireLabel");
    checkStrings(block, `content.${locale}`);
    if (block.description.length > 160) issues.push(`content.${locale}.description: at most 160 characters`);
  }
  if (issues.length) throw new Error(`Invalid production prototype copy:\n${issues.map(issue => `  - ${issue}`).join("\n")}`);
  return cfg;
}

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
 * Translate a palette id retired on 2026-09-24 into its successor, before zod sees it.
 *
 * `Object.hasOwn`, not `in` or a plain index: `"constructor"` is a key of every object, and
 * a lookup that walks the prototype would turn it into a function instead of a zod error.
 * Unknown ids pass through untouched so the enum still rejects them by name.
 */
function normalizeLegacyScheme(input: Record<string, unknown>): Record<string, unknown> {
  const theme = input.theme as Record<string, unknown> | undefined;
  const id = theme?.colorScheme;
  if (typeof id !== "string" || !Object.hasOwn(LEGACY_SCHEME_IDS, id)) return input;
  return { ...input, theme: { ...theme, colorScheme: LEGACY_SCHEME_IDS[id] } };
}

/**
 * Emoji feature icons — every config written before 2026-09-29 — are dropped, not
 * rejected: the card renders without an icon, and a build never fails over decoration
 * (spec §8.3). Also covers the window in which an old harness prompt still asks for emoji.
 */
function normalizeFeatureIcons(input: Record<string, unknown>): Record<string, unknown> {
  const content = input.content;
  if (!content || typeof content !== "object") return input;
  const next: Record<string, unknown> = {};
  for (const [locale, block] of Object.entries(content as Record<string, Record<string, unknown>>)) {
    const landing = block?.landing as { features?: Array<Record<string, unknown>> } | undefined;
    if (!landing || !Array.isArray(landing.features)) {
      next[locale] = block;
      continue;
    }
    const features = landing.features.map((feature) => {
      if (typeof feature?.icon === "string" && (ICON_IDS as readonly string[]).includes(feature.icon)) return feature;
      const { icon: _dropped, ...rest } = feature ?? {}; // eslint-disable-line @typescript-eslint/no-unused-vars
      return rest;
    });
    next[locale] = { ...block, landing: { ...landing, features } };
  }
  return { ...input, content: next };
}

/**
 * Parse a config object. Throws with every zod issue listed, because a build log that says
 * "invalid config" without saying which field is a second bug on top of the first.
 */
export function parsePrototypeConfig(input: unknown): PrototypeConfig {
  const candidate = input as Record<string, unknown>;
  const lifted =
    candidate && typeof candidate === "object" && candidate.content === undefined
      ? migrateLegacyConfig(candidate)
      : candidate;
  const normalized =
    lifted && typeof lifted === "object" ? normalizeLegacyScheme(lifted) : lifted;

  const withIcons =
    normalized && typeof normalized === "object" ? normalizeFeatureIcons(normalized as Record<string, unknown>) : normalized;
  const result = prototypeConfigSchema.safeParse(withIcons);
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
