import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ICON_IDS,
  SECTION_COPY_SOURCE,
  modelSelectableSections,
  parsePrototypeConfig,
} from "../lib/prototype-config";

/* eslint-disable @typescript-eslint/no-explicit-any */
const root = resolve(__dirname, "..");

function gridConfig(): any {
  const en = {
    description: "Log trips.",
    landing: {
      headline: "Every trip counts",
      features: [{ icon: "route", title: "Plan routes", description: "Plan a route in a minute." }],
    },
    dashboard: { title: "Trips" },
    cta: { label: "Start" },
    dataGrid: {
      entityLabel: "Trip",
      fieldLabels: { name: "Name", mode: "Mode", km: "Km", date: "Date", done: "Done", notes: "Notes" },
    },
  };
  return {
    appName: "Trailhead",
    locales: ["en", "sk"],
    defaultLocale: "en",
    theme: { colorScheme: "chartreuse-pastel-deep-teal-green" },
    patterns: {
      landing: { sections: ["hero", "features", "cta"] },
      dashboard: {},
      authGoogle: {},
      cta: { href: "/login" },
      dataGrid: {
        entity: {
          key: "trip",
          fields: [
            { key: "name", type: "text", required: true },
            { key: "mode", type: "select", options: ["Bus", "Rail"] },
            { key: "km", type: "number" },
            { key: "date", type: "date" },
            { key: "done", type: "boolean" },
            { key: "notes", type: "longtext" },
          ],
        },
      },
    },
    content: { en, sk: JSON.parse(JSON.stringify(en)) },
  };
}

const samples = () => [
  { name: "Morning commute", mode: "Bus", km: 12, date: "2026-09-20", done: true },
  { name: "Weekend trip", mode: "Rail", km: 180, date: "2026-09-13", notes: "Window seat." },
  { name: "Airport run", mode: "Bus", km: 25, date: "2026-09-02", done: false },
];

function problems(cfg: any): string {
  try {
    parsePrototypeConfig(cfg);
    return "";
  } catch (e) {
    return (e as Error).message;
  }
}

function bothLocales(cfg: any, set: (block: any) => void): any {
  set(cfg.content.en);
  set(cfg.content.sk);
  return cfg;
}

test.describe("icons", () => {
  test("ICON_IDS is the spec's forty, in order", () => {
    expect(ICON_IDS).toHaveLength(40);
    expect(ICON_IDS[0]).toBe("book-open");
    expect(ICON_IDS[39]).toBe("tag");
  });
  test("an icon id is kept; an emoji is dropped, never a build failure", () => {
    const cfg = gridConfig();
    cfg.content.sk.landing.features[0].icon = "📖";
    const parsed = parsePrototypeConfig(cfg);
    expect(parsed.content.en!.landing!.features![0]!.icon).toBe("route");
    expect(parsed.content.sk!.landing!.features![0]!.icon).toBeUndefined();
  });
});

test.describe("sections", () => {
  test("howItWorks and faq are selectable; pricing and testimonials stay locked", () => {
    expect(SECTION_COPY_SOURCE.faq).toBe("landing");
    expect(SECTION_COPY_SOURCE.howItWorks).toBe("landing");
    expect(modelSelectableSections()).toEqual(expect.arrayContaining(["howItWorks", "faq"]));
    expect(modelSelectableSections()).not.toContain("pricing");
    expect(modelSelectableSections()).not.toContain("testimonials");
  });
  test("an enabled howItWorks needs its steps in every language", () => {
    const cfg = gridConfig();
    cfg.patterns.landing.sections = ["hero", "howItWorks", "cta"];
    expect(problems(cfg)).toContain('section "howItWorks" is enabled but has no copy in "en"');
    const steps = [1, 2, 3].map((i) => ({ title: `Step ${i}`, description: `Do thing ${i}.` }));
    bothLocales(cfg, (b) => (b.landing.howItWorks = { steps }));
    expect(problems(cfg)).toBe("");
    bothLocales(cfg, (b) => (b.landing.howItWorks = { steps: steps.slice(0, 2) }));
    expect(problems(cfg)).not.toBe("");
  });
  test("an enabled faq needs three to six items in every language", () => {
    const cfg = gridConfig();
    cfg.patterns.landing.sections = ["hero", "faq", "cta"];
    expect(problems(cfg)).toContain('section "faq" is enabled but has no copy in "sk"');
    const items = [1, 2, 3].map((i) => ({ question: `Q${i}?`, answer: `A${i}.` }));
    bothLocales(cfg, (b) => (b.landing.faq = { items }));
    expect(problems(cfg)).toBe("");
  });
});

test.describe("sampleRecords", () => {
  test("three records the grid could have stored pass in both languages", () => {
    expect(problems(bothLocales(gridConfig(), (b) => (b.dataGrid.sampleRecords = samples())))).toBe("");
  });
  test("a translated select value in the second language fails loudly (options are stored values)", () => {
    const cfg = bothLocales(gridConfig(), (b) => (b.dataGrid.sampleRecords = samples()));
    cfg.content.sk.dataGrid.sampleRecords[0].mode = "Autobus";
    expect(problems(cfg)).toContain('field "mode": must be one of Bus, Rail');
  });
  test("unknown keys, missing required, wrong types, long text and a wrong count all fail", () => {
    const cases: Array<(s: any[]) => void> = [
      (s) => (s[0].colour = "red"),
      (s) => delete s[1].name,
      (s) => (s[0].km = "12"),
      (s) => (s[0].date = "20.9.2026"),
      (s) => (s[0].done = "yes"),
      (s) => (s[1].notes = "x".repeat(401)),
      (s) => s.pop(),
    ];
    for (const mutate of cases) {
      const s = samples();
      mutate(s);
      expect(problems(bothLocales(gridConfig(), (b) => (b.dataGrid.sampleRecords = JSON.parse(JSON.stringify(s)))))).not.toBe("");
    }
  });
});

test.describe("kpis and boardBy", () => {
  const kpis = [
    { id: "total", field: "*", agg: "count" },
    { id: "busShare", field: "mode", agg: "share", value: "Bus" },
    { id: "avgKm", field: "km", agg: "avg" },
  ];
  const labels = { total: "Trips", busShare: "By bus", avgKm: "Average km" };
  test("valid KPIs with a label in every language pass", () => {
    const cfg = bothLocales(gridConfig(), (b) => (b.dashboard.kpiLabels = labels));
    cfg.patterns.dashboard = { kpis };
    expect(problems(cfg)).toBe("");
  });
  test("each broken KPI is refused", () => {
    const broken = [
      [{ id: "s", field: "name", agg: "sum" }],
      [{ id: "s", field: "mode", agg: "share", value: "Tram" }],
      [{ id: "s", field: "mode", agg: "count" }],
      [{ id: "s", field: "missing", agg: "avg" }],
      [{ id: "s", field: "*", agg: "count" }, { id: "s", field: "*", agg: "count" }],
    ];
    for (const k of broken) {
      const cfg = bothLocales(gridConfig(), (b) => (b.dashboard.kpiLabels = { s: "S" }));
      cfg.patterns.dashboard = { kpis: k };
      expect(problems(cfg), JSON.stringify(k)).not.toBe("");
    }
  });
  test("a KPI without a label in the second language fails", () => {
    const cfg = gridConfig();
    cfg.patterns.dashboard = { kpis: [kpis[0]] };
    cfg.content.en.dashboard.kpiLabels = { total: "Trips" };
    expect(problems(cfg)).toContain('kpi "total" has no label in "sk"');
  });
  test("KPIs need the grid", () => {
    const cfg = gridConfig();
    delete cfg.patterns.dataGrid;
    for (const l of ["en", "sk"]) delete cfg.content[l].dataGrid;
    cfg.patterns.dashboard = { kpis: [kpis[0]] };
    bothLocales(cfg, (b) => (b.dashboard.kpiLabels = { total: "Trips" }));
    expect(problems(cfg)).toContain("kpis need the dataGrid pattern");
  });
  test("boardBy must name a select field", () => {
    const cfg = gridConfig();
    cfg.patterns.dataGrid.boardBy = "mode";
    expect(problems(cfg)).toBe("");
    cfg.patterns.dataGrid.boardBy = "name";
    expect(problems(cfg)).toContain('boardBy "name" is not a select field');
  });
  test("an entity has at most 12 fields (factory-web rules cap a record at 12 values)", () => {
    const cfg = gridConfig();
    const fields = Array.from({ length: 13 }, (_, i) => ({ key: `f${i}`, type: "text" }));
    cfg.patterns.dataGrid.entity.fields = fields;
    const labels = Object.fromEntries(fields.map((f) => [f.key, f.key]));
    bothLocales(cfg, (b) => (b.dataGrid.fieldLabels = labels));
    expect(problems(cfg)).not.toBe("");
  });
});

test("every checked-in fixture and the shipped config still parse", () => {
  const files = [
    "prototype.config.json",
    ...readdirSync(resolve(root, "fixtures")).map((f) => `fixtures/${f}`),
  ];
  for (const file of files) {
    expect(problems(JSON.parse(readFileSync(resolve(root, file), "utf8"))), file).toBe("");
  }
});
