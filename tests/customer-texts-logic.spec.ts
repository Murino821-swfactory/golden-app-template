import { test, expect } from "@playwright/test";
import { config } from "../lib/prototype-config";
import { previewApiUrl, previewTokenFrom, withCustomerTexts } from "../lib/customer-texts";
import sample from "../fixtures/customer-texts/sample-real-estate-portfolio.json";

/**
 * A customer's texts on the golden demo (founder, 2026-11-27): the model writes only the words,
 * the golden demo keeps its own structure, and the words are put on the page in the browser —
 * like "My brand" — instead of a build. The rule that decides what may be shown is pure.
 */

const HEADLINE = "Annahomes finds your next flat";

function english() {
  return structuredClone(config.content.en);
}

function customerTexts(extra: Record<string, unknown> = {}) {
  const en = english();
  en.landing!.headline = HEADLINE;
  return { appName: "Anna Reality", content: { en }, ...extra };
}

test.describe("withCustomerTexts", () => {
  test("puts the customer's words into the build's own structure", () => {
    const result = withCustomerTexts(config, customerTexts());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.appName).toBe("Anna Reality");
    expect(result.config.content.en?.landing?.headline).toBe(HEADLINE);
    expect(result.config.locales).toEqual(["en"]);
    expect(result.config.defaultLocale).toBe(config.defaultLocale);
    expect(result.config.patterns).toEqual(config.patterns);
    expect(result.config.theme).toEqual(config.theme);
  });

  test("keeps the build's name when the customer's words bring none", () => {
    const withoutName: Record<string, unknown> = customerTexts();
    delete withoutName.appName;
    const result = withCustomerTexts(config, withoutName);
    expect(result.ok && result.config.appName).toBe(config.appName);
  });

  test("puts the default language first, then the customer's second one", () => {
    const result = withCustomerTexts(config, { content: { sk: english(), en: english() } });
    expect(result.ok && result.config.locales).toEqual(["en", "sk"]);
  });

  test("takes nothing but the name and the words", () => {
    const result = withCustomerTexts(
      config,
      customerTexts({ patterns: {}, theme: { colorScheme: "blue" }, hero: "brand", locales: ["sk"], defaultLocale: "sk" })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.patterns).toEqual(config.patterns);
    expect(result.config.theme).toEqual(config.theme);
    expect(result.config.hero).toEqual(config.hero);
    expect(result.config.defaultLocale).toBe(config.defaultLocale);
  });

  test("is only for the golden demo, never for a customer's page", () => {
    const customerPage = {
      ...config,
      patterns: { ...config.patterns, landing: { ...config.patterns.landing!, tryIt: undefined } },
    };
    expect(withCustomerTexts(customerPage, customerTexts()).ok).toBe(false);
  });

  test("needs the build's default language", () => {
    expect(withCustomerTexts(config, { content: { sk: english() } }).ok).toBe(false);
  });

  test("refuses a language the build does not serve", () => {
    expect(withCustomerTexts(config, { content: { en: english(), it: english() } }).ok).toBe(false);
  });

  test("refuses a missing or blank text", () => {
    const blank = english();
    blank.landing!.headline = "   ";
    expect(withCustomerTexts(config, { content: { en: blank } }).ok).toBe(false);

    const missing = english();
    delete (missing.landing as Record<string, unknown>).subheadline;
    expect(withCustomerTexts(config, { content: { en: missing } }).ok).toBe(false);
  });

  test("refuses a list of another length than the demo's", () => {
    const fewer = english();
    fewer.landing!.features!.pop();
    expect(withCustomerTexts(config, { content: { en: fewer } }).ok).toBe(false);
  });

  test("refuses a text over the schema's limit", () => {
    const long = english();
    long.landing!.eyebrow = "x".repeat(41);
    expect(withCustomerTexts(config, { content: { en: long } }).ok).toBe(false);
  });

  test("refuses a text where the demo has another kind of value", () => {
    const wrong = english() as unknown as { landing: { features: unknown[] } };
    wrong.landing.features[0] = "a feature";
    expect(withCustomerTexts(config, { content: { en: wrong } }).ok).toBe(false);
  });

  test("refuses what is not a customer's words", () => {
    for (const raw of [null, "text", [], {}, { content: [] }, { content: { en: "text" } }]) {
      expect(withCustomerTexts(config, raw).ok, JSON.stringify(raw)).toBe(false);
    }
  });

  test("refuses a blank or overlong name", () => {
    expect(withCustomerTexts(config, customerTexts({ appName: "  " })).ok).toBe(false);
    expect(withCustomerTexts(config, customerTexts({ appName: "x".repeat(101) })).ok).toBe(false);
    expect(withCustomerTexts(config, customerTexts({ appName: 7 })).ok).toBe(false);
  });

  test("the local sample is words the demo may show (PREVIEW_SAMPLE_TEXTS=1 npm run preview)", () => {
    const result = withCustomerTexts(config, sample);
    expect(result.ok ? "" : result.error).toBe("");
  });

  test("says why it refused", () => {
    const blank = english();
    blank.landing!.headline = "";
    const result = withCustomerTexts(config, { content: { en: blank } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("content.en.landing.headline");
  });
});

test.describe("the preview link", () => {
  const TOKEN = "AbCdEf0123456789_-xyZ";

  test("carries its token in the query", () => {
    expect(previewTokenFrom(`?preview=${TOKEN}`)).toBe(TOKEN);
    expect(previewTokenFrom(`?utm_source=facebook&preview=${TOKEN}`)).toBe(TOKEN);
  });

  test("ignores a missing, short, long or odd token", () => {
    expect(previewTokenFrom("")).toBeNull();
    expect(previewTokenFrom("?preview=")).toBeNull();
    expect(previewTokenFrom("?preview=short")).toBeNull();
    expect(previewTokenFrom(`?preview=${"a".repeat(65)}`)).toBeNull();
    expect(previewTokenFrom("?preview=../../etc/passwd_aaaaaaaaaaaa")).toBeNull();
    expect(previewTokenFrom("?preview=abcdefghij%2Fklmnopqrstu")).toBeNull();
  });

  test("asks the site's own API by default", () => {
    expect(previewApiUrl(TOKEN)).toBe(`/api/prototype-preview/${TOKEN}`);
  });
});
