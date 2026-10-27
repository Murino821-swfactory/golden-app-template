/** A threshold colour scale: a value at or above `value` (and below the next stop) gets `color`. */
export interface ColorStop {
  value: number;
  color: string;
}

function assertAscending(stops: readonly ColorStop[]): void {
  if (stops.length === 0) throw new Error("a colour scale needs at least one stop");
  for (let i = 1; i < stops.length; i++) {
    if (stops[i].value <= stops[i - 1].value) {
      throw new Error(`colour stops must ascend: ${stops[i - 1].value} then ${stops[i].value}`);
    }
  }
}

/** The colour a value gets — the same answer the MapLibre expression gives, for legends and tests. */
export function colorFor(value: number | null | undefined, stops: readonly ColorStop[], missing: string): string {
  assertAscending(stops);
  if (value === null || value === undefined || Number.isNaN(value)) return missing;
  let color = stops[0].color;
  for (const stop of stops) {
    if (value >= stop.value) color = stop.color;
  }
  return color;
}

/**
 * A MapLibre `fill-color` expression for `property`: `step` over the stops, and `missing` where
 * the property is null — a cell without data must look empty, never like the lowest bin.
 */
export function stepColorExpression(property: string, stops: readonly ColorStop[], missing: string): unknown[] {
  assertAscending(stops);
  const step: unknown[] = ["step", ["to-number", ["get", property]], stops[0].color];
  for (const stop of stops.slice(1)) step.push(stop.value, stop.color);
  return ["case", ["==", ["typeof", ["get", property]], "number"], step, missing];
}

export interface LegendBin {
  color: string;
  from: number;
  /** Undefined for the open top bin. */
  to?: number;
}

/** The bins a legend draws, one per stop. */
export function legendBins(stops: readonly ColorStop[]): LegendBin[] {
  assertAscending(stops);
  return stops.map((stop, i) => ({ color: stop.color, from: stop.value, to: stops[i + 1]?.value }));
}
