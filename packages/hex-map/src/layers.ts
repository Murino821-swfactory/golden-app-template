/**
 * MapLibre layer specs for a hexagon source: a fill coloured by an expression, a hairline
 * outline, and a selection outline. Hover and selection are feature-state (`hover`,
 * `selected`), so the features need numeric ids — `cellsToFeatureCollection` gives them.
 *
 * The specs are plain objects: this package carries no MapLibre dependency, the host passes
 * them to `map.addLayer`.
 */
export interface HexLayerOptions {
  fillColor: unknown;
  /** Show from this zoom (inclusive). */
  minzoom?: number;
  /** Hide from this zoom (exclusive). */
  maxzoom?: number;
  outlineColor?: string;
  selectedColor?: string;
  fillOpacity?: number;
}

export interface HexLayerSpec {
  id: string;
  type: "fill" | "line";
  source: string;
  minzoom?: number;
  maxzoom?: number;
  paint: Record<string, unknown>;
}

const HOVER = ["boolean", ["feature-state", "hover"], false];
const SELECTED = ["boolean", ["feature-state", "selected"], false];

export function hexLayerIds(sourceId: string): { fill: string; outline: string; selected: string } {
  return { fill: `${sourceId}-fill`, outline: `${sourceId}-outline`, selected: `${sourceId}-selected` };
}

export function hexLayers(sourceId: string, options: HexLayerOptions): HexLayerSpec[] {
  const ids = hexLayerIds(sourceId);
  const zoom: Pick<HexLayerSpec, "minzoom" | "maxzoom"> = {};
  if (options.minzoom !== undefined) zoom.minzoom = options.minzoom;
  if (options.maxzoom !== undefined) zoom.maxzoom = options.maxzoom;
  const opacity = options.fillOpacity ?? 0.72;
  return [
    {
      id: ids.fill,
      type: "fill",
      source: sourceId,
      ...zoom,
      paint: {
        "fill-color": options.fillColor,
        "fill-opacity": ["case", HOVER, Math.min(1, opacity + 0.2), opacity],
      },
    },
    {
      id: ids.outline,
      type: "line",
      source: sourceId,
      ...zoom,
      paint: {
        "line-color": options.outlineColor ?? "#ffffff",
        "line-width": ["case", HOVER, 1.6, 0.3],
        "line-opacity": ["case", HOVER, 0.9, 0.35],
      },
    },
    {
      id: ids.selected,
      type: "line",
      source: sourceId,
      ...zoom,
      paint: {
        "line-color": options.selectedColor ?? "#ffffff",
        "line-width": ["case", SELECTED, 3, 0],
      },
    },
  ];
}
