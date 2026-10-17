# @tokenwise/hex-map

H3 hexagon maps for MapLibre, lifted out of propcheck (`lib/hexGrid.ts`,
`components/map/PriceMap.tsx`) so a second map product does not copy them.

| Module | What it gives |
|---|---|
| `cells` | `cellRing`, `cellsToFeatureCollection` — rows keyed by an H3 cell → a GeoJSON source with numeric ids (MapLibre feature-state needs them) |
| `scale` | `stepColorExpression`, `colorFor`, `legendBins` — one threshold scale, read by the map and by its legend; null data gets its own colour, never the lowest bin |
| `layers` | `hexLayers` — fill + outline + selection layer specs for one zoom band; hover/selection via feature-state |
| `aggregate` | `polygonShares`, `CellAccumulator`, `addWeighted`, `weightedMean`, `dominant` — spread polygon areas over fine H3 cells and roll them up, area-weighted |

## What it is not

- No React, no MapLibre import, no `@/` paths, no network (`test/hex-map.test.ts` enforces
  the first three). The host owns the map instance and passes the specs to `addLayer`.
- No build: it ships TypeScript source, like `@tokenwise/shared-ui`. A Next.js consumer adds
  `transpilePackages: ["@tokenwise/hex-map"]`.
- Not on npm (`private: true`) — the `@tokenwise` scope on npm belongs to someone else.
  Consumers outside this repo (propcheck) vendor it until that is solved.

## Datasets

`datasets/<name>/build.ts` turns open data into the compact JSON a prototype ships in
`public/`. Builders run on a workstation, never in CI or the browser; their inputs are not
committed. Today: [`agro-land`](datasets/agro-land/README.md) — Agromapa.

## Tests

`npm test -w @tokenwise/hex-map` (also part of `npm run test:packages`).
