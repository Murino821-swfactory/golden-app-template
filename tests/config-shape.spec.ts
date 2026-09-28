import { test, expect } from "@playwright/test";
import {
  parsePrototypeConfig,
  contentFor,
  config,
  type PrototypeConfig,
} from "../lib/prototype-config";
import { LEGACY_SCHEME_IDS } from "@tokenwise/shared-ui/theming";

/**
 * The config splits along ONE line: does this value change when the language changes?
 *
 * `patterns` is what a prototype IS — which patterns, which sections, an entity's field
 * keys and types, a map's centre. Written once however many languages the customer picked.
 * `content[locale]` is what it SAYS. Before the split the two were mixed inside `patterns`
 * (`entity.fields[].type` beside `entity.fields[].label`), which has exactly one meaning
 * for a second language: the model would have had to invent the entity twice, and nothing
 * would have forced the two to agree on field keys.
 */

/** The smallest config in the new shape — used as the base every case below edits. */
function baseConfig(): Record<string, unknown> {
  return {
    appName: "Trailhead",
    locales: ["en", "sk"],
    defaultLocale: "sk",
    theme: { colorScheme: "chartreuse-pastel-deep-teal-green" },
    patterns: {
      landing: { sections: ["hero", "cta"] },
      cta: { href: "/login" },
    },
    content: {
      en: {
        description: "Log the trails you walked.",
        landing: { headline: "Every trail you walk counts" },
        cta: { label: "Start logging" },
      },
      sk: {
        description: "Zapisuj si trasy, ktoré si prešiel.",
        landing: { headline: "Každá prejdená trasa sa počíta" },
        cta: { label: "Začať zapisovať" },
      },
    },
  };
}

test.describe("structure and content are separate", () => {
  test("copy is read per locale, structure is shared", () => {
    const parsed = parsePrototypeConfig(baseConfig());

    expect(contentFor(parsed, "sk").cta?.label).toBe("Začať zapisovať");
    expect(contentFor(parsed, "en").cta?.label).toBe("Start logging");
    // One structure, whatever the language.
    expect(parsed.patterns.cta?.href).toBe("/login");
    expect(parsed.patterns.landing?.sections).toEqual(["hero", "cta"]);
  });

  test("an unknown locale falls back to the default rather than rendering nothing", () => {
    const parsed = parsePrototypeConfig(baseConfig());
    expect(contentFor(parsed, "de").cta?.label).toBe("Začať zapisovať");
  });

  test("a declared locale with no content block is rejected", () => {
    const broken = baseConfig() as { content: Record<string, unknown> };
    delete broken.content.sk;
    expect(() => parsePrototypeConfig(broken)).toThrow(/sk/);
  });

  test("a content block for a locale nobody declared is rejected", () => {
    const broken = baseConfig() as { content: Record<string, unknown> };
    broken.content.de = { description: "…" };
    expect(() => parsePrototypeConfig(broken)).toThrow(/de/);
  });

  test("a default locale outside the declared list is rejected", () => {
    const broken = { ...baseConfig(), defaultLocale: "de" };
    expect(() => parsePrototypeConfig(broken)).toThrow(/defaultLocale/);
  });

  test("an enabled pattern whose copy is missing in one language is rejected", () => {
    const broken = baseConfig() as { content: Record<string, Record<string, unknown>> };
    delete broken.content.en.cta;
    expect(() => parsePrototypeConfig(broken)).toThrow(/cta/);
  });

  test("every entity field needs a label in every language", () => {
    const grid = {
      entity: {
        key: "trip",
        fields: [
          { key: "name", type: "text", required: true },
          { key: "distance", type: "number" },
        ],
      },
    };
    const withGrid = (labels: Record<string, Record<string, string>>) => {
      const base = baseConfig() as {
        patterns: Record<string, unknown>;
        content: Record<string, Record<string, unknown>>;
      };
      base.patterns.dataGrid = grid;
      for (const locale of ["en", "sk"]) {
        base.content[locale]!.dataGrid = {
          entityLabel: "Trip",
          fieldLabels: labels[locale],
        };
      }
      return base;
    };

    const complete = { name: "Name", distance: "Distance" };
    expect(() =>
      parsePrototypeConfig(withGrid({ en: complete, sk: { name: "Názov", distance: "Vzdialenosť" } }))
    ).not.toThrow();

    expect(() =>
      parsePrototypeConfig(withGrid({ en: { name: "Name" }, sk: complete }))
    ).toThrow(/distance/);
  });
});

test.describe("the config the template ships", () => {
  test("is in the new shape and covers every locale it declares", () => {
    expect(config.locales.length).toBeGreaterThan(0);
    expect(config.locales).toContain(config.defaultLocale);
    for (const locale of config.locales) {
      expect(contentFor(config, locale).description.length).toBeGreaterThan(0);
    }
  });
});

/**
 * The harness clones this repo's default branch with no version pin
 * (`createPrototypeWorkspace` → `getDefaultBranch`), so between this merging and the
 * harness being deployed, a harness that still writes the old shape is composing configs
 * against this parser. Rejecting them would fail every prototype built in that window.
 */
test.describe("configs written before the split still build", () => {
  const legacy = {
    appName: "Trailhead",
    description: "Log the trails you walked.",
    theme: { colorScheme: "green", style: "minimal" },
    patterns: {
      landing: {
        sections: ["hero", "cta"],
        headline: "Every trail you walk counts",
        features: [{ icon: "🥾", title: "One tap", description: "Log a walk in one tap." }],
      },
      cta: { label: "Start logging", href: "/login" },
      dashboard: { title: "Your trails" },
      dataGrid: {
        entity: {
          key: "trip",
          label: "Trip",
          fields: [{ key: "name", label: "Name", type: "text", required: true }],
        },
      },
    },
  };

  test("legacy copy is lifted into the default locale", () => {
    const parsed: PrototypeConfig = parsePrototypeConfig(legacy);

    expect(parsed.locales).toEqual(["en"]);
    expect(parsed.defaultLocale).toBe("en");

    const en = contentFor(parsed, "en");
    expect(en.description).toBe("Log the trails you walked.");
    expect(en.landing?.headline).toBe("Every trail you walk counts");
    expect(en.cta?.label).toBe("Start logging");
    expect(en.dashboard?.title).toBe("Your trails");
    expect(en.dataGrid?.entityLabel).toBe("Trip");
    expect(en.dataGrid?.fieldLabels.name).toBe("Name");
  });

  test("legacy structure keeps its keys and loses its copy", () => {
    const parsed = parsePrototypeConfig(legacy);
    expect(parsed.patterns.dataGrid?.entity.fields[0]!.key).toBe("name");
    expect(parsed.patterns.dataGrid?.entity.fields[0]).not.toHaveProperty("label");
    expect(parsed.patterns.cta).toEqual({ href: "/login" });
  });

  test("the retired style knob is dropped, not rejected", () => {
    const parsed = parsePrototypeConfig(legacy);
    expect(parsed.theme).toEqual({ colorScheme: "chartreuse-pastel-deep-teal-green" });
  });
});

/**
 * The four ids retired on 2026-09-24. Every `demo/*` branch built before then carries one,
 * and `prototypes:refresh` never edits a customer's config, so the parser translates.
 */
test.describe("palette ids retired on 2026-09-24 still build", () => {
  for (const [retired, current] of Object.entries(LEGACY_SCHEME_IDS)) {
    test(`"${retired}" is read as "${current}"`, () => {
      const parsed = parsePrototypeConfig({ ...baseConfig(), theme: { colorScheme: retired } });
      expect(parsed.theme.colorScheme).toBe(current);
    });
  }

  test("an id that never existed is still rejected", () => {
    expect(() =>
      parsePrototypeConfig({ ...baseConfig(), theme: { colorScheme: "purple" } })
    ).toThrow(/theme\.colorScheme/);
  });

  test("an inherited object key is not mistaken for a retired id", () => {
    expect(() =>
      parsePrototypeConfig({ ...baseConfig(), theme: { colorScheme: "constructor" } })
    ).toThrow(/theme\.colorScheme/);
  });
});
