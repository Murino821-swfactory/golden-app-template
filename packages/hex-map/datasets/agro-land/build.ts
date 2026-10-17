/**
 * Agromapa dataset: Slovak farmland quality and use, aggregated to H3 hexagons.
 *
 *   npm run build:agro-land -w @tokenwise/hex-map -- \
 *     --bpej <BPEJ_*.shp> --lpis <DPB*.shp> --out <agro-land.json>
 *
 * Sources (README.md has the licences and download links):
 *   BPEJ — NPPC-VÚPOP, CC0: soil-ecological units with `BH` (production potential points,
 *          0–100) and `Skupina` (quality group 1–9, 1 = best).
 *   LPIS — PPA, CC BY 4.0: land-parcel blocks (diely pôdnych blokov) with culture, area and
 *          locality. A block is a unit of farmed land, not an owner or a holding.
 *
 * Each polygon's area is spread over the res-10 cells (~1.5 ha) whose centres it contains
 * (`polygonShares`), then rolled up to every output resolution. A block is also counted once,
 * in the cell of its first share, for the average block size — the fragmentation-of-use proxy.
 *
 * Nothing here is a price or a rent: those are not in either source and the output never
 * pretends otherwise.
 */
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { cellArea } from "h3-js";
import proj4 from "proj4";
import * as shapefile from "shapefile";
import {
  CellAccumulator,
  addWeighted,
  dominant,
  polygonShares,
  weightedMean,
  type LngLat,
  type LngLatPolygon,
  type WeightedMean,
} from "../../src";

/** EPSG:5514, S-JTSK / Krovak East North, with the 7-parameter shift to WGS84. */
const KROVAK =
  "+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 " +
  "+x_0=0 +y_0=0 +ellps=bessel +towgs84=485.021,169.465,483.839,7.786342,4.397554,4.102655,0 " +
  "+units=m +no_defs";
const toWgs84 = proj4(KROVAK, "WGS84");

const FINE_RES = 10;
const OUTPUT_RES = [6, 7] as const;

interface CellStats {
  bh: WeightedMean;
  groups: Map<number, number>;
  lpisHa: number;
  cultures: Map<string, number>;
  localities: Map<string, number>;
  blocks: number;
}

const newStats = (): CellStats => ({
  bh: { sum: 0, weight: 0 },
  groups: new Map(),
  lpisHa: 0,
  cultures: new Map(),
  localities: new Map(),
  blocks: 0,
});

function bump<K>(map: Map<K, number>, key: K, by: number): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

type Geometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

function project(geometry: Geometry): LngLatPolygon[] {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((rings) => rings.map((ring) => ring.map((xy) => toWgs84.forward(xy as LngLat) as LngLat)));
}

/** A multipolygon's source area is split over its parts by their planar area in metres
 * (Krovak is conformal, so the ratio is exact enough at farm scale). */
function planarArea(ring: readonly number[][]): number {
  let twice = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    twice += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(twice / 2);
}

function partAreas(geometry: Geometry): number[] {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((rings) => rings.reduce((area, ring, i) => area + (i === 0 ? 1 : -1) * planarArea(ring), 0));
}

async function eachFeature(
  shp: string,
  visit: (geometry: Geometry, props: Record<string, unknown>) => void,
): Promise<number> {
  const source = await shapefile.open(shp, undefined, { encoding: "utf-8" });
  let count = 0;
  for (;;) {
    const next = await source.read();
    if (next.done) break;
    const { geometry, properties } = next.value as unknown as {
      geometry: Geometry | null;
      properties: Record<string, unknown>;
    };
    if (geometry && (geometry.type === "Polygon" || geometry.type === "MultiPolygon")) {
      visit(geometry, properties);
      count++;
      if (count % 20000 === 0) console.error(`  ${shp.split("/").pop()}: ${count}`);
    }
  }
  return count;
}

/** Spread one source feature over the accumulators; returns the fine share cells. */
function spread(
  geometry: Geometry,
  totalHa: number,
  onShare: (fineCell: string, hectares: number) => void,
): void {
  const areas = partAreas(geometry);
  const whole = areas.reduce((a, b) => a + b, 0);
  project(geometry).forEach((polygon, i) => {
    const partHa = whole > 0 ? (totalHa * areas[i]) / whole : totalHa / areas.length;
    for (const share of polygonShares(polygon, partHa, FINE_RES)) onShare(share.cell, share.hectares);
  });
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

const round = (value: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { bpej: { type: "string" }, lpis: { type: "string" }, out: { type: "string" } },
  });
  if (!values.bpej || !values.lpis || !values.out) {
    throw new Error("usage: --bpej <BPEJ_*.shp> --lpis <DPB*.shp> --out <agro-land.json>");
  }

  const acc = OUTPUT_RES.map((res) => new CellAccumulator<CellStats>(res, newStats));

  console.error("BPEJ…");
  const bpejCount = await eachFeature(values.bpej, (geometry, props) => {
    const bh = num(props.BH);
    const group = num(props.Skupina);
    const ha = (num(props.Shape_Area) ?? 0) / 10_000;
    if (!(ha > 0)) return;
    spread(geometry, ha, (cell, hectares) => {
      for (const a of acc) {
        const stats = a.at(cell);
        if (bh !== null && bh > 0) addWeighted(stats.bh, bh, hectares);
        if (group !== null && group >= 1 && group <= 9) bump(stats.groups, group, hectares);
      }
    });
  });

  console.error("LPIS…");
  const lpisCount = await eachFeature(values.lpis, (geometry, props) => {
    const ha = num(props.VYMERA_DPB) ?? (num(props.Shape_Area) ?? 0) / 10_000;
    if (!(ha > 0)) return;
    const culture = String(props.KULTURA_NA ?? "").trim() || "?";
    const locality = String(props.LOKALITA_D ?? "").trim();
    let counted = false;
    spread(geometry, ha, (cell, hectares) => {
      for (const a of acc) {
        const stats = a.at(cell);
        stats.lpisHa += hectares;
        bump(stats.cultures, culture, hectares);
        if (locality) bump(stats.localities, locality, hectares);
        if (!counted) stats.blocks++;
      }
      counted = true;
    });
  });

  const cultures: string[] = [];
  const localities: string[] = [];
  const indexOf = (list: string[], value: string | null): number | null => {
    if (value === null) return null;
    let i = list.indexOf(value);
    if (i === -1) i = list.push(value) - 1;
    return i;
  };

  const layers: Record<string, unknown[][]> = {};
  for (const a of acc) {
    const rows: unknown[][] = [];
    for (const [cell, s] of a.entries()) {
      const cellHa = cellArea(cell, "m2") / 10_000;
      const bh = weightedMean(s.bh);
      const arable = s.cultures.get("orná pôda") ?? 0;
      rows.push([
        cell,
        bh === null ? null : round(bh, 1),
        dominant(s.groups),
        round(Math.min(1, s.lpisHa / cellHa), 3),
        s.lpisHa > 0 ? round(arable / s.lpisHa, 3) : null,
        s.blocks > 0 ? round(s.lpisHa / s.blocks, 2) : null,
        indexOf(cultures, dominant(s.cultures)),
        indexOf(localities, dominant(s.localities)),
      ]);
    }
    rows.sort((x, y) => String(x[0]).localeCompare(String(y[0])));
    layers[`res${a.resolution}`] = rows;
  }

  const out = {
    meta: {
      generated: new Date().toISOString().slice(0, 10),
      columns: ["cell", "bh", "group", "agriShare", "arableShare", "avgBlockHa", "culture", "locality"],
      notes:
        "bh = area-weighted mean BPEJ production potential points (0-100); group = dominant BPEJ " +
        "quality group (1 best - 9 worst); agriShare = LPIS block area / cell area; arableShare = " +
        "arable land / LPIS area; avgBlockHa = LPIS area / blocks whose first share falls in the cell; " +
        "culture, locality = indices into the lists below, by largest area.",
      sources: [
        {
          name: "Bonitované pôdnoekologické jednotky (BPEJ)",
          publisher: "Národné poľnohospodárske a potravinárske centrum (NPPC-VÚPOP)",
          licence: "CC0 1.0",
          file: values.bpej.split("/").pop(),
          features: bpejCount,
          url: "https://data.slovensko.sk/datasety/46120bf5-30e4-4031-b471-6d5d1f4dfaba",
        },
        {
          name: "LPIS diely pôdnych blokov",
          publisher: "Pôdohospodárska platobná agentúra (PPA)",
          licence: "CC BY 4.0",
          file: values.lpis.split("/").pop(),
          features: lpisCount,
          url: "https://data.slovensko.sk/datasety/4c408849-80e9-41a2-8c93-08a65b7ce4fb",
        },
      ],
    },
    cultures,
    localities,
    ...layers,
  };
  writeFileSync(values.out, JSON.stringify(out));
  for (const [key, rows] of Object.entries(layers)) console.error(`${key}: ${rows.length} cells`);
  console.error(`→ ${values.out}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
