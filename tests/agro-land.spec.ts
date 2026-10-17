import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { cultureLabel, landMapCopy } from "../lib/agro/copy";
import {
  METRIC_IDS,
  METRIC_STOPS,
  binLabel,
  formatMetric,
  mappableCells,
  parseLandData,
  summarize,
  toFeatures,
} from "../lib/agro/land";

/** Agromapa's land map (2026-10-17): open BPEJ + LPIS data per H3 hexagon. */

// WebGL in headless Chromium, as tests/map-load.spec.ts does.
test.use({ launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } });

const raw = () => JSON.parse(readFileSync("public/data/agro-land.json", "utf8"));

test.describe("agro-land data", () => {
  test("the shipped file parses, names its open-data sources and their licences", () => {
    const data = parseLandData(raw());
    expect(data.coarse.length).toBeGreaterThan(1000);
    expect(data.fine.length).toBeGreaterThan(8000);
    expect(data.sources.map((s) => s.licence)).toEqual(["CC0 1.0", "CC BY 4.0"]);
    expect(data.sources.every((s) => s.url.startsWith("https://data.slovensko.sk/"))).toBe(true);
  });

  test("a file with other columns is refused, not misread", () => {
    const changed = raw();
    changed.meta.columns = [...changed.meta.columns].reverse();
    expect(() => parseLandData(changed)).toThrow(/unexpected columns/);
  });

  test("the numbers match the land: Lužianky's plain beats Štrba under the Tatras", () => {
    const { fine } = parseLandData(raw());
    const mean = (locality: string) => {
      const cells = fine.filter((c) => c.locality === locality && c.bh !== null);
      expect(cells.length).toBeGreaterThan(5);
      return cells.reduce((s, c) => s + (c.bh ?? 0), 0) / cells.length;
    };
    expect(mean("Lužianky")).toBeGreaterThan(60);
    expect(mean("Štrba")).toBeLessThan(40);
    const summary = summarize(fine);
    expect(summary.meanBh).toBeGreaterThan(30);
    expect(summary.meanBh).toBeLessThan(70);
  });

  test("every value stays in its range", () => {
    const { coarse, fine } = parseLandData(raw());
    for (const c of [...coarse, ...fine]) {
      if (c.bh !== null) {
        expect(c.bh).toBeGreaterThanOrEqual(0);
        expect(c.bh).toBeLessThanOrEqual(100);
      }
      if (c.group !== null) {
        expect(c.group).toBeGreaterThanOrEqual(1);
        expect(c.group).toBeLessThanOrEqual(9);
      }
      expect(c.agriShare).toBeGreaterThanOrEqual(0);
      expect(c.agriShare).toBeLessThanOrEqual(1);
      if (c.arableShare !== null) expect(c.arableShare).toBeLessThanOrEqual(1);
      if (c.avgBlockHa !== null) expect(c.avgBlockHa).toBeGreaterThan(0);
    }
  });

  test("features drop empty land and get unique numeric ids across both zoom bands", () => {
    const { coarse, fine } = parseLandData(raw());
    const a = toFeatures(coarse, 0);
    const b = toFeatures(fine, a.features.length);
    expect(a.features.length).toBe(mappableCells(coarse).length);
    const ids = new Set([...a.features, ...b.features].map((f) => f.id));
    expect(ids.size).toBe(a.features.length + b.features.length);
  });

  test("formats read naturally in both languages", () => {
    expect(formatMetric("bh", 68.5, "en")).toBe("69");
    expect(formatMetric("arableShare", 0.42, "en")).toBe("42%");
    expect(formatMetric("arableShare", 0.42, "sk")).toMatch(/^42\s%$/);
    expect(formatMetric("avgBlockHa", 7.56, "sk")).toBe("7,6 ha");
    expect(formatMetric("avgBlockHa", null, "sk")).toBe("–");
    expect(binLabel("bh", 35, 50, "en")).toBe("35–50");
    expect(binLabel("bh", 80, undefined, "en")).toBe("80+");
    expect(binLabel("avgBlockHa", 40, undefined, "en")).toBe("40+ ha");
  });

  test("every metric has a scale and words in both languages; no copy promises a price or rent", () => {
    for (const locale of ["en", "sk"]) {
      const copy = landMapCopy(locale);
      for (const id of METRIC_IDS) {
        expect(METRIC_STOPS[id].length).toBeGreaterThan(2);
        expect(copy.metrics[id].label.length).toBeGreaterThan(0);
      }
    }
    expect(cultureLabel(landMapCopy("en"), "orná pôda")).toBe("arable land");
    expect(cultureLabel(landMapCopy("sk"), "orná pôda")).toBe("orná pôda");
    const cfg = JSON.parse(readFileSync("prototype.config.json", "utf8"));
    const landing = JSON.stringify([cfg.content.en.landing, cfg.content.en.useCases, cfg.content.en.description]);
    expect(landing).not.toMatch(/benchmark|typical rent|market rent|co-owners per hectare/i);
  });
});

// The same offline style tests/map-load.spec.ts uses: MapLibre reaches `load` only when its
// worker runs, and the hexagon sources are GeoJSON parsed in that worker.
const offlineStyle = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#102030" } }],
};

test.describe("land map section", () => {
  test("renders on the landing without loading the map or its data until asked", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (req) => requests.push(req.url()));
    await page.goto("./");
    const section = page.locator("[data-land-map]");
    await expect(section).toBeVisible();
    await expect(section.getByRole("button", { name: "Soil quality" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-land-legend]")).toContainText("80+");
    expect(requests.some((u) => u.includes("agro-land.json") || u.includes("cartocdn"))).toBe(false);
  });

  test("opening the map fetches the data; a layer switch changes the legend", async ({ page }) => {
    await page.goto("./");
    const section = page.locator("[data-land-map]");
    const data = page.waitForResponse((res) => res.url().endsWith("/data/agro-land.json") && res.ok());
    await section.getByRole("button", { name: "Open the map" }).click();
    await data;
    await section.getByRole("button", { name: "Block size" }).click();
    await expect(page.locator("[data-land-legend]")).toContainText("40+ ha");
  });

  test("the map itself loads, hexagons and all, once its style arrives", async ({ page }) => {
    await page.route(/basemaps\.cartocdn\.com/, (route) =>
      route.request().url().endsWith("style.json")
        ? route.fulfill({ contentType: "application/json", body: JSON.stringify(offlineStyle) })
        : route.abort()
    );
    const errors: string[] = [];
    page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
    await page.goto("./");
    const section = page.locator("[data-land-map]");
    await section.getByRole("button", { name: "Open the map" }).click();
    await expect(section.locator(".maplibregl-canvas")).toBeAttached();
    await expect(section.locator("[data-land-detail], :text('Tap a hexagon')").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Slovak page speaks Slovak", async ({ page }) => {
    await page.goto("./sk");
    const section = page.locator("[data-land-map]");
    await expect(section.getByRole("heading", { name: "Pôda Slovenska po hexagónoch" })).toBeVisible();
    await expect(section.getByRole("button", { name: "Otvoriť mapu" })).toBeVisible();
  });
});
