export { cellRing, cellsToFeatureCollection } from "./cells";
export type { HexFeature, HexFeatureCollection, LngLat } from "./cells";
export { colorFor, legendBins, stepColorExpression } from "./scale";
export type { ColorStop, LegendBin } from "./scale";
export { hexLayerIds, hexLayers } from "./layers";
export type { HexLayerOptions, HexLayerSpec } from "./layers";
export {
  CellAccumulator,
  addWeighted,
  dominant,
  polygonShares,
  weightedMean,
} from "./aggregate";
export type { CellShare, LngLatPolygon, WeightedMean } from "./aggregate";
