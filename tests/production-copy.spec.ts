import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseProductionPrototypeConfig } from "../lib/prototype-config";

const fresh = () => {
  const cfg = JSON.parse(readFileSync("fixtures/composed.config.json", "utf8"));
  cfg.content.en.dashboard.intro = "Manage your private records in one place.";
  cfg.content.en.contactForm.intro = "Send the owner your question about this idea.";
  cfg.content.en.dataGrid.sampleRecords = [
    { name: "Landing", kind: "Page", addedOn: "2026-10-08", selectable: true },
    { name: "Record editor", kind: "Control", addedOn: "2026-10-08", selectable: true },
    { name: "Records", kind: "Data", addedOn: "2026-10-08", selectable: true },
  ];
  return cfg;
};
test("customer copy contract accepts a complete customer config", () => {
  expect(parseProductionPrototypeConfig(fresh()).content.en.landing?.headline).toBeTruthy();
});
for (const path of ["landing.headline", "landing.subheadline", "landing.features", "landing.featuresHeading", "landing.howItWorks", "landing.faq", "cta.title", "cta.subtitle", "contactForm.intro", "dataGrid.sampleRecords"]) {
  test(`production rejects missing ${path} instead of rendering starter text`, () => {
    const cfg = fresh();
    const parts = path.split(".");
    let node = cfg.content.en;
    for (const key of parts.slice(0, -1)) node = node[key];
    delete node[parts.at(-1)!];
    expect(() => parseProductionPrototypeConfig(cfg)).toThrow();
  });
}
test("copy completeness is enforced in every locale", () => {
  const cfg = fresh(); cfg.locales = ["en", "sk"]; cfg.content.sk = structuredClone(cfg.content.en);
  cfg.content.sk.landing.headline = "  ";
  expect(() => parseProductionPrototypeConfig(cfg)).toThrow(/content.sk.landing.headline/);
});
test("a presentation fallback contains customer copy and no unsupported controls", () => {
  const cfg = fresh(); cfg.patterns = { landing: { sections: ["hero", "features"] } };
  cfg.content.en = { description: "Reading diary for pupils", landing: { headline: "Reading diary", subheadline: "Keep notes about books you read", featuresHeading: "Your idea", features: [{ title: "Book notes", description: "Keep notes about books you read" }] } };
  expect(parseProductionPrototypeConfig(cfg).patterns.dataGrid).toBeUndefined();
});
