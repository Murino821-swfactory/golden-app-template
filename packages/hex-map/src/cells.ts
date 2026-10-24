import { cellToBoundary } from "h3-js";

/** A GeoJSON position, longitude first. */
export type LngLat = [number, number];

/** One hexagon as a GeoJSON feature. `id` is numeric because MapLibre's feature-state needs it. */
export interface HexFeature<P> {
  type: "Feature";
  id: number;
  properties: P;
  geometry: { type: "Polygon"; coordinates: LngLat[][] };
}

export interface HexFeatureCollection<P> {
  type: "FeatureCollection";
  features: HexFeature<P>[];
}

/** The closed outer ring of an H3 cell, longitude first, as GeoJSON wants it. */
export function cellRing(cell: string): LngLat[] {
  const ring = cellToBoundary(cell, true) as LngLat[];
  const [first] = ring;
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
  return ring;
}

/**
 * Rows keyed by an H3 cell → a FeatureCollection ready for a MapLibre `geojson` source.
 * Ids run from `startId`, so two collections on one map (two zoom levels) never share one.
 */
export function cellsToFeatureCollection<P extends object>(
  rows: readonly P[],
  cellOf: (row: P) => string,
  startId = 0,
): HexFeatureCollection<P> {
  return {
    type: "FeatureCollection",
    features: rows.map((row, index) => ({
      type: "Feature",
      id: startId + index,
      properties: row,
      geometry: { type: "Polygon", coordinates: [cellRing(cellOf(row))] },
    })),
  };
}
