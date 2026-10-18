import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { cellArea, cellToParent, latLngToCell } from "h3-js";
import {
  CellAccumulator,
  addWeighted,
  cellRing,
  cellsToFeatureCollection,
  colorFor,
  dominant,
  hexLayers,
  legendBins,
  polygonShares,
  stepColorExpression,
  weightedMean,
  type LngLat,
} from "../src";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NITRA = latLngToCell(48.3069, 18.0864, 7);
const STOPS = [
  { value: 0, color: "#000" },
  { value: 40, color: "#444" },
  { value: 70, color: "#888" },
];

test("a cell ring is closed and longitude first", () => {
  const ring = cellRing(NITRA);
  assert.equal(ring.length, 7);
  assert.deepEqual(ring[0], ring[6]);
  for (const [lng, lat] of ring) {
    assert.ok(lng > 17.9 && lng < 18.3, `lng ${lng}`);
    assert.ok(lat > 48.2 && lat < 48.4, `lat ${lat}`);
  }
});

test("features get consecutive numeric ids from startId, so feature-state works", () => {
  const fc = cellsToFeatureCollection([{ h: NITRA }, { h: latLngToCell(48.7, 19.1, 7) }], (r) => r.h, 100);
  assert.deepEqual(fc.features.map((f) => f.id), [100, 101]);
  assert.equal(fc.features[0].geometry.type, "Polygon");
  assert.equal(fc.features[0].properties.h, NITRA);
});

test("colorFor puts a value in the highest stop it reaches, and missing data in its own colour", () => {
  assert.equal(colorFor(-5, STOPS, "none"), "#000");
  assert.equal(colorFor(39.9, STOPS, "none"), "#000");
  assert.equal(colorFor(40, STOPS, "none"), "#444");
  assert.equal(colorFor(99, STOPS, "none"), "#888");
  assert.equal(colorFor(null, STOPS, "none"), "none");
  assert.equal(colorFor(Number.NaN, STOPS, "none"), "none");
});

test("the MapLibre expression guards null before stepping", () => {
  assert.deepEqual(stepColorExpression("bh", STOPS, "none"), [
    "case",
    ["==", ["typeof", ["get", "bh"]], "number"],
    ["step", ["to-number", ["get", "bh"]], "#000", 40, "#444", 70, "#888"],
    "none",
  ]);
});

test("stops that do not ascend are refused", () => {
  assert.throws(() => colorFor(1, [{ value: 5, color: "a" }, { value: 5, color: "b" }], "x"));
  assert.throws(() => legendBins([]));
});

test("legend bins are open at the top", () => {
  assert.deepEqual(legendBins(STOPS), [
    { color: "#000", from: 0, to: 40 },
    { color: "#444", from: 40, to: 70 },
    { color: "#888", from: 70, to: undefined },
  ]);
});

test("hex layers carry the zoom range on every layer and key hover/selection on feature-state", () => {
  const layers = hexLayers("hex7", { fillColor: "#fff", minzoom: 8 });
  assert.deepEqual(layers.map((l) => l.id), ["hex7-fill", "hex7-outline", "hex7-selected"]);
  for (const layer of layers) {
    assert.equal(layer.minzoom, 8);
    assert.equal("maxzoom" in layer, false);
  }
  assert.match(JSON.stringify(layers), /feature-state","hover/);
  assert.match(JSON.stringify(layers), /feature-state","selected/);
});

test("polygon shares never lose a hectare — big polygons spread, tiny ones land whole", () => {
  const square = (lng: number, lat: number, d: number): LngLat[][] => [
    [[lng, lat], [lng + d, lat], [lng + d, lat + d], [lng, lat + d], [lng, lat]],
  ];
  const big = polygonShares(square(18.0, 48.3, 0.02), 300, 10);
  assert.ok(big.length > 50, `${big.length} cells`);
  assert.ok(Math.abs(big.reduce((s, c) => s + c.hectares, 0) - 300) < 1e-6);

  const tiny = polygonShares(square(18.0, 48.3, 0.0002), 0.03, 10);
  assert.equal(tiny.length, 1);
  assert.equal(tiny[0].hectares, 0.03);

  assert.deepEqual(polygonShares([], 5, 10), []);
  assert.deepEqual(polygonShares(square(18, 48, 0.01), 0, 10), []);
});

test("the accumulator rolls fine cells up to its resolution and refuses coarser ones", () => {
  // H3 is not perfectly nested: a point's res-7 cell need not be its res-10 cell's parent,
  // so the expected target is derived with cellToParent, as the accumulator does.
  const fine = latLngToCell(48.3069, 18.0864, 10);
  const target = cellToParent(fine, 7);
  const acc = new CellAccumulator(7, () => ({ n: 0 }));
  acc.at(fine).n++;
  acc.at(cellToParent(fine, 9)).n++;
  acc.at(target).n++;
  assert.equal(acc.size, 1);
  assert.equal(acc.at(target).n, 3);
  assert.throws(() => acc.at(latLngToCell(48.3, 18.08, 6)));
});

test("weighted mean and dominant", () => {
  const mean = { sum: 0, weight: 0 };
  assert.equal(weightedMean(mean), null);
  addWeighted(mean, 80, 3);
  addWeighted(mean, 40, 1);
  assert.equal(weightedMean(mean), 70);
  assert.equal(dominant(new Map([["a", 1], ["b", 3], ["c", 3]])), "b");
  assert.equal(dominant(new Map()), null);
});

test("res-10 cells are about 1.5 ha — the fine grid the builder assumes", () => {
  const ha = cellArea(latLngToCell(48.3, 18.08, 10), "m2") / 10_000;
  assert.ok(ha > 1.2 && ha < 1.8, `${ha} ha`);
});

test("the package stays framework-free: no React, no MapLibre, no @/ imports in src", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
  for (const file of walk(join(ROOT, "src"))) {
    const source = readFileSync(file, "utf-8");
    assert.doesNotMatch(source, /from "(react|maplibre-gl|@\/)/, file);
  }
});
