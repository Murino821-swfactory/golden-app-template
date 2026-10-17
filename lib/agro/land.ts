/**
 * Agromapa's land data: the compact JSON that `packages/hex-map/datasets/agro-land/build.ts`
 * writes into `public/data/agro-land.json`, turned into map features and read-outs.
 *
 * Pure (no React, no MapLibre), so `tests/agro-land.spec.ts` checks it without a browser.
 * The numbers are what the open data says — BPEJ (NPPC-VÚPOP, CC0) and LPIS 2026 (PPA,
 * CC BY 4.0). There is no price or rent column on purpose: neither source has one.
 */
import { cellsToFeatureCollection, type ColorStop, type HexFeatureCollection } from "@tokenwise/hex-map";

export type MetricId = "bh" | "arableShare" | "avgBlockHa" | "agriShare";

export const METRIC_IDS: readonly MetricId[] = ["bh", "arableShare", "avgBlockHa", "agriShare"];

/** One hexagon, expanded from a row of the JSON. */
export interface LandCell {
  cell: string;
  /** Mean BPEJ production-potential points, 0–100; null where BPEJ maps nothing. */
  bh: number | null;
  /** Dominant BPEJ quality group, 1 (best) – 9. */
  group: number | null;
  /** LPIS block area ÷ cell area, 0–1. */
  agriShare: number;
  /** Arable land ÷ LPIS area, 0–1; null without LPIS land. */
  arableShare: number | null;
  /** LPIS area ÷ blocks counted in the cell, ha. */
  avgBlockHa: number | null;
  /** Dominant LPIS culture, as the source names it (Slovak). */
  culture: string | null;
  /** Cadastral locality with the most LPIS area. */
  locality: string | null;
}

export interface LandSource {
  name: string;
  publisher: string;
  licence: string;
  url: string;
}

export interface LandData {
  generated: string;
  sources: LandSource[];
  /** Coarse cells for the national view, fine cells for the regional one. */
  coarse: LandCell[];
  fine: LandCell[];
}

type Row = [string, number | null, number | null, number, number | null, number | null, number | null, number | null];

interface RawLandData {
  meta: { generated: string; columns: string[]; sources: LandSource[] };
  cultures: string[];
  localities: string[];
  res6: Row[];
  res7: Row[];
}

const COLUMNS = ["cell", "bh", "group", "agriShare", "arableShare", "avgBlockHa", "culture", "locality"];

const pick = (list: readonly string[], index: number | null): string | null =>
  index === null || index < 0 || index >= list.length ? null : list[index];

/** Parse the JSON; a file whose columns are not the ones this code reads is refused loudly. */
export function parseLandData(raw: unknown): LandData {
  const data = raw as RawLandData;
  if (!data?.meta || JSON.stringify(data.meta.columns) !== JSON.stringify(COLUMNS)) {
    throw new Error("agro-land.json: unexpected columns — rebuild it with packages/hex-map/datasets/agro-land");
  }
  const expand = (rows: Row[]): LandCell[] =>
    rows.map(([cell, bh, group, agriShare, arableShare, avgBlockHa, culture, locality]) => ({
      cell,
      bh,
      group,
      agriShare,
      arableShare,
      avgBlockHa,
      culture: pick(data.cultures, culture),
      locality: pick(data.localities, locality),
    }));
  return {
    generated: data.meta.generated,
    sources: data.meta.sources.map(({ name, publisher, licence, url }) => ({ name, publisher, licence, url })),
    coarse: expand(data.res6),
    fine: expand(data.res7),
  };
}

/**
 * Cells with no farmland at all (forest, towns, mountains) are left off the map: a hexagon
 * coloured "0 % arable" over the Tatras says nothing a reader can use.
 */
export function mappableCells(cells: readonly LandCell[]): LandCell[] {
  return cells.filter((c) => c.agriShare > 0.01 || c.bh !== null);
}

export function toFeatures(cells: readonly LandCell[], startId = 0): HexFeatureCollection<LandCell> {
  return cellsToFeatureCollection(mappableCells(cells), (c) => c.cell, startId);
}

/** The colour scale per metric. Brighter = more on a dark map. */
const GREEN = ["#26352a", "#2f5135", "#3d6f40", "#53924a", "#7db659", "#bfe07a"];
const AMBER = ["#3a2a14", "#5c3f17", "#82581d", "#ac7425", "#d69434", "#f4c06a"];

export const METRIC_STOPS: Record<MetricId, readonly ColorStop[]> = {
  bh: [0, 20, 35, 50, 65, 80].map((value, i) => ({ value, color: GREEN[i] })),
  arableShare: [0, 0.2, 0.4, 0.6, 0.8, 0.95].map((value, i) => ({ value, color: GREEN[i] })),
  agriShare: [0, 0.1, 0.25, 0.4, 0.55, 0.7].map((value, i) => ({ value, color: GREEN[i] })),
  avgBlockHa: [0, 2, 5, 10, 20, 40].map((value, i) => ({ value, color: AMBER[i] })),
};

export const MISSING_COLOR = "#1a1a1a";

/** Format a metric's value for a reader in `locale`. */
export function formatMetric(metric: MetricId, value: number | null, locale: string): string {
  if (value === null) return "–";
  const nf = (digits: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits });
  switch (metric) {
    case "bh":
      return nf(0).format(value);
    case "avgBlockHa":
      return `${nf(value < 10 ? 1 : 0).format(value)} ha`;
    default:
      return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(value);
  }
}

/** The legend's label for a bin, e.g. "35–50" or "80+". */
export function binLabel(metric: MetricId, from: number, to: number | undefined, locale: string): string {
  const f = (v: number) => formatMetric(metric, v, locale).replace(/ ha$/, "");
  const unit = metric === "avgBlockHa" ? " ha" : "";
  return to === undefined ? `${f(from)}+${unit}` : `${f(from)}–${f(to)}${unit}`;
}

/** Country-wide summary over the fine cells, area-weighted by farmland where it matters. */
export function summarize(cells: readonly LandCell[]): { cells: number; meanBh: number | null } {
  let sum = 0;
  let weight = 0;
  for (const c of cells) {
    if (c.bh !== null && c.agriShare > 0) {
      sum += c.bh * c.agriShare;
      weight += c.agriShare;
    }
  }
  return { cells: mappableCells(cells).length, meanBh: weight > 0 ? sum / weight : null };
}
