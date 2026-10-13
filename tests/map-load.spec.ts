import { test, expect } from "@playwright/test";
import { config } from "../lib/prototype-config";
import { uiCopy } from "./ui-copy";

// MapLibre 6 derives its worker URL from import.meta.url, which the Next bundle does not
// keep: the worker loaded the page's HTML, no source ever loaded and every live map stayed
// an empty skeleton. A GeoJSON source is parsed in the worker, so this offline style
// reaches `load` only when the worker runs.
test.use({ launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } });

const style = {
  version: 8,
  sources: { pins: { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [17.1, 48.1] } } } },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#102030" } },
    { id: "pins", type: "circle", source: "pins" },
  ],
};

test("the listings map finishes loading once its style arrives", async ({ page }) => {
  test.skip(!config.patterns.mapBase || !config.patterns.listings?.items.some((i) => i.location), "no offer on a map");
  await page.route(/basemaps\.cartocdn\.com/, (route) =>
    route.request().url().endsWith("style.json")
      ? route.fulfill({ contentType: "application/json", body: JSON.stringify(style) })
      : route.abort()
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const section = page.locator('[data-section="listings"]');
  await section.getByRole("button", { name: uiCopy.listings!.showMap! }).click();
  const region = section.locator('[data-pattern="map-base"]');
  const loadError = region.getByText(uiCopy.map!.loadError!, { exact: true });
  await expect(region.locator(".maplibregl-canvas").or(loadError).first()).toBeAttached();
  test.skip((await region.locator(".maplibregl-canvas").count()) === 0, "no WebGL in this browser");
  await expect(region.locator('[data-slot="skeleton"]')).toHaveCount(0, { timeout: 20_000 });
  await expect(loadError).toHaveCount(0);
});
