import { cellToParent, getResolution, latLngToCell, polygonToCells } from "h3-js";
import type { LngLat } from "./cells";

/** A polygon as GeoJSON rings (outer first, then holes), longitude first. */
export type LngLatPolygon = LngLat[][];

/** One fine cell of a polygon and the hectares of the polygon it stands for. */
export interface CellShare {
  cell: string;
  hectares: number;
}

function ringCentroid(ring: readonly LngLat[]): LngLat {
  let lng = 0;
  let lat = 0;
  for (const [x, y] of ring) {
    lng += x;
    lat += y;
  }
  return [lng / ring.length, lat / ring.length];
}

/**
 * Spread a polygon's area over the fine H3 cells whose centres fall inside it. A polygon
 * smaller than one fine cell may contain no centre at all; it then lands whole in the cell
 * of its outer ring's centroid, so no hectare is ever dropped and the shares always sum to
 * `hectares`.
 */
export function polygonShares(polygon: LngLatPolygon, hectares: number, resolution: number): CellShare[] {
  if (polygon.length === 0 || polygon[0].length === 0 || !(hectares > 0)) return [];
  const cells = polygonToCells(polygon, resolution, true);
  if (cells.length === 0) {
    const [lng, lat] = ringCentroid(polygon[0]);
    return [{ cell: latLngToCell(lat, lng, resolution), hectares }];
  }
  const each = hectares / cells.length;
  return cells.map((cell) => ({ cell, hectares: each }));
}

/**
 * Per-cell running statistics at one target resolution. `add` takes a cell at the target
 * resolution or any finer one and rolls it up with `cellToParent`.
 */
export class CellAccumulator<S> {
  readonly resolution: number;
  private readonly cells = new Map<string, S>();
  private readonly init: () => S;

  constructor(resolution: number, init: () => S) {
    this.resolution = resolution;
    this.init = init;
  }

  /** The stats of the target cell that contains `cell`, created on first touch. */
  at(cell: string): S {
    const res = getResolution(cell);
    if (res < this.resolution) {
      throw new Error(`cell ${cell} (res ${res}) is coarser than the target res ${this.resolution}`);
    }
    const target = res === this.resolution ? cell : cellToParent(cell, this.resolution);
    let stats = this.cells.get(target);
    if (stats === undefined) {
      stats = this.init();
      this.cells.set(target, stats);
    }
    return stats;
  }

  entries(): IterableIterator<[string, S]> {
    return this.cells.entries();
  }

  get size(): number {
    return this.cells.size;
  }
}

/** Area-weighted mean: the running sums `sum` (value × ha) and `weight` (ha). */
export interface WeightedMean {
  sum: number;
  weight: number;
}

export function addWeighted(mean: WeightedMean, value: number, hectares: number): void {
  mean.sum += value * hectares;
  mean.weight += hectares;
}

export function weightedMean(mean: WeightedMean): number | null {
  return mean.weight > 0 ? mean.sum / mean.weight : null;
}

/** The key with the largest weight; ties go to the key seen first. */
export function dominant<K>(weights: ReadonlyMap<K, number>): K | null {
  let best: K | null = null;
  let bestWeight = 0;
  for (const [key, weight] of weights) {
    if (weight > bestWeight) {
      best = key;
      bestWeight = weight;
    }
  }
  return best;
}
