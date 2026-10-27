import { test, expect } from "@playwright/test";
import { landingActionHref } from "../lib/landing-action";
import { config, parsePrototypeConfig, SECTION_IDS } from "../lib/prototype-config";

function withHref(href: string) {
  return { ...config, patterns: { ...config.patterns, cta: { href } } };
}

test("config validation refuses routes that the template does not export", () => {
  for (const href of ["/analyze", "/download", "/signup", "/app", "/dashboard/missing", "relative-page"]) {
    expect(() => parsePrototypeConfig(withHref(href)), href).toThrow(/patterns\.cta\.href/);
  }
});

test("the template's four exported routes pass config validation", () => {
  for (const href of ["/", "/login", "/dashboard", "/messages"]) {
    const parsed = parsePrototypeConfig(withHref(href));
    expect(landingActionHref(parsed.patterns)).toBe(href);
  }
});

test("config validation refuses absent anchors and unsupported URLs", () => {
  const section = SECTION_IDS.find((id) => !config.patterns.landing?.sections.includes(id));
  const absent = section ? [`#${section}`, `#chapter-${section}`] : [];
  for (const href of ["#start", "#chapter-start", "#", ...absent, "javascript:alert(1)", "data:text/html,hi", "//example.com/join"]) {
    expect(() => parsePrototypeConfig(withHref(href)), href).toThrow(/patterns\.cta\.href/);
  }
});

test("every rendered section's stable id and chapter alias pass config validation", () => {
  for (const section of config.patterns.landing?.sections ?? []) {
    for (const href of [`#${section}`, `#chapter-${section}`]) {
      const parsed = parsePrototypeConfig(withHref(href));
      expect(landingActionHref(parsed.patterns)).toBe(section === "contact" && href === "#contact" ? href : `#chapter-${section}`);
    }
  }
});

test("absolute web destinations remain supported", () => {
  for (const href of ["https://example.com/join", "http://example.com/join"]) {
    expect(landingActionHref(parsePrototypeConfig(withHref(href)).patterns)).toBe(href);
  }
});

test("missing actions keep the deterministic contact, login, dashboard or no-link fallback", () => {
  expect(landingActionHref({ landing: { sections: ["hero", "contact"] } })).toBe("#contact");
  expect(landingActionHref({ landing: { sections: ["hero"] }, authGoogle: {} })).toBe("/login");
  expect(landingActionHref({ landing: { sections: ["hero"] }, dashboard: {} })).toBe("/dashboard");
  expect(landingActionHref({ landing: { sections: ["hero"] } })).toBeNull();
});
