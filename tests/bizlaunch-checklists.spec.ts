import { test, expect } from "@playwright/test";
import {
  CHECKLISTS,
  COUNTRIES,
  ENTITY_NAMES,
  checklistProgress,
  parseStoredIds,
} from "../lib/data/countries";
import { COUNTRY_CODES, ENTITY_KINDS } from "../lib/data/tax";
import { config } from "../lib/prototype-config";

/**
 * BizLaunch CEE registration checklists (OTH-90). Pure — no browser.
 *
 * The portal allowlist lives HERE, not in the data file, on purpose: a link is only
 * trustworthy if something other than the file that holds it says where it may point.
 * Every host below answered HTTP 200 on 2026-09-24.
 */
const OFFICIAL_HOSTS: Record<(typeof COUNTRY_CODES)[number], string[]> = {
  SK: ["www.slovensko.sk", "www.orsr.sk", "www.financnasprava.sk", "www.socpoist.sk"],
  CZ: [
    "or.justice.cz",
    "esm.justice.cz",
    "rzp.gov.cz",
    "financnisprava.gov.cz",
    "adisspr.mfcr.cz",
    "www.cssz.gov.cz",
    "datovka.gov.cz",
  ],
  PL: ["www.biznes.gov.pl", "prs.ms.gov.pl", "www.podatki.gov.pl", "crbr.podatki.gov.pl", "www.zus.pl"],
  HU: ["www.e-cegjegyzek.hu", "nav.gov.hu", "ugyfelkapu.gov.hu"],
  UA: ["diia.gov.ua", "cabinet.tax.gov.ua"],
};

test.describe("checklist data", () => {
  test("every country has a checklist for both entity types, each with at least four steps", () => {
    for (const country of COUNTRY_CODES) {
      for (const entity of ENTITY_KINDS) {
        expect(CHECKLISTS[country][entity].length, `${country}/${entity}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  test("every country and entity type is named in both languages", () => {
    for (const country of COUNTRY_CODES) {
      expect(COUNTRIES[country].name.en.trim()).not.toBe("");
      expect(COUNTRIES[country].name.sk.trim()).not.toBe("");
      for (const entity of ENTITY_KINDS) {
        expect(ENTITY_NAMES[country][entity].trim(), `${country}/${entity}`).not.toBe("");
      }
    }
  });

  test("every step is written in English and Slovak", () => {
    for (const country of COUNTRY_CODES) {
      for (const entity of ENTITY_KINDS) {
        for (const step of CHECKLISTS[country][entity]) {
          const label = `${country}/${entity}/${step.id}`;
          for (const text of [step.title, step.detail, ...(step.deadline ? [step.deadline] : [])]) {
            expect(text.en.trim(), label).not.toBe("");
            expect(text.sk.trim(), label).not.toBe("");
          }
        }
      }
    }
  });

  test("step ids are unique within a checklist, because progress is stored by id", () => {
    for (const country of COUNTRY_CODES) {
      for (const entity of ENTITY_KINDS) {
        const ids = CHECKLISTS[country][entity].map((step) => step.id);
        expect(new Set(ids).size, `${country}/${entity}`).toBe(ids.length);
      }
    }
  });

  test("every portal link is https and points at that country's official portals", () => {
    let links = 0;
    for (const country of COUNTRY_CODES) {
      for (const entity of ENTITY_KINDS) {
        for (const step of CHECKLISTS[country][entity]) {
          if (!step.portal) continue;
          links++;
          const url = new URL(step.portal.url);
          const label = `${country}/${entity}/${step.id}: ${step.portal.url}`;
          expect(url.protocol, label).toBe("https:");
          expect(OFFICIAL_HOSTS[country], label).toContain(url.host);
        }
      }
    }
    expect(links).toBeGreaterThan(0);
  });

  test("every checklist links at least one official portal", () => {
    for (const country of COUNTRY_CODES) {
      for (const entity of ENTITY_KINDS) {
        const withPortal = CHECKLISTS[country][entity].filter((step) => step.portal);
        expect(withPortal.length, `${country}/${entity}`).toBeGreaterThan(0);
      }
    }
  });
});

test.describe("checklistProgress", () => {
  const steps = CHECKLISTS.SK.company;

  test("is 0 with nothing ticked and 100 with everything ticked", () => {
    expect(checklistProgress(steps, [])).toBe(0);
    expect(checklistProgress(steps, steps.map((s) => s.id))).toBe(100);
  });

  test("is the rounded share of ticked steps", () => {
    const ticked = steps.slice(0, 1).map((s) => s.id);
    expect(checklistProgress(steps, ticked)).toBe(Math.round(100 / steps.length));
  });

  test("ignores ids that are not in this checklist", () => {
    expect(checklistProgress(steps, ["not-a-step", "another"])).toBe(0);
  });
});

test.describe("parseStoredIds", () => {
  test("reads back what was stored", () => {
    expect(parseStoredIds(JSON.stringify(["a", "b"]))).toEqual(["a", "b"]);
  });

  test("treats missing, corrupt or foreign values as nothing ticked", () => {
    expect(parseStoredIds(null)).toEqual([]);
    expect(parseStoredIds("{not json")).toEqual([]);
    expect(parseStoredIds(JSON.stringify({ a: 1 }))).toEqual([]);
    expect(parseStoredIds(JSON.stringify(["a", 2, null]))).toEqual(["a"]);
  });
});

test("the dashboard no longer carries the generic task grid", () => {
  // OTH-90 acceptance criterion 1: no empty "Add registration tasks" form. The grid renders
  // iff `patterns.dataGrid` exists, so its absence from the shipped config is the guarantee.
  expect(config.patterns.dataGrid).toBeUndefined();
});
