/**
 * geo.ts — approximate coordinates for the Slovak towns and Bratislava districts the demo
 * uses, so a listing can be pinned on the map. Pure, so the lookup is testable without a
 * browser (`tests/realestate-logic.spec.ts`).
 *
 * There is no geocoding service here: a static export has no server and a demo must open
 * offline. The table carries the places in the seed; an own listing in one of those towns
 * or districts lands on the map too, anything else is left off (`null`) rather than dropped
 * on a guessed spot. A property gets a small, deterministic offset from its id so several
 * listings in the same district spread out instead of stacking on one pin.
 */
import type { Property } from "./model";

export interface Coords {
  lat: number;
  lng: number;
}

export interface PropertyPoint extends Coords {
  id: string;
  label: string;
}

const strip = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase();

/** Towns — the stable, non-translated part of an address, so matched first by city. */
const CITY_COORDS: Record<string, Coords> = {
  bratislava: { lat: 48.1486, lng: 17.1077 },
  senec: { lat: 48.219, lng: 17.401 },
  trnava: { lat: 48.3774, lng: 17.587 },
  modra: { lat: 48.335, lng: 17.308 },
  kosice: { lat: 48.7164, lng: 21.2611 },
  nitra: { lat: 48.3069, lng: 18.0864 },
  pezinok: { lat: 48.2886, lng: 17.2667 },
};

/**
 * Districts — refine the city centre where the seed names one. Both the English and the
 * Slovak form of a translated district are listed, because the stored string follows the
 * language the desk was seeded in.
 */
const DISTRICT_COORDS: Record<string, Coords> = {
  // Bratislava
  "stare mesto": { lat: 48.145, lng: 17.11 },
  "old town": { lat: 48.145, lng: 17.11 },
  ruzinov: { lat: 48.156, lng: 17.168 },
  petrzalka: { lat: 48.118, lng: 17.105 },
  dubravka: { lat: 48.176, lng: 17.028 },
  raca: { lat: 48.2, lng: 17.156 },
  "karlova ves": { lat: 48.154, lng: 17.06 },
  "nove mesto": { lat: 48.17, lng: 17.134 },
  // Senec
  "slnecne jazera": { lat: 48.23, lng: 17.415 },
  "sunny lakes": { lat: 48.23, lng: 17.415 },
  // Trnava
  modranka: { lat: 48.35, lng: 17.605 },
  // Modra
  kralova: { lat: 48.32, lng: 17.33 },
  // Košice
  // (Old Town already covered above)
  // Nitra
  chrenova: { lat: 48.312, lng: 18.105 },
};

/** A stable number in [-1, 1) derived from the id, so the offset never moves between loads. */
function hashUnit(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i += 1) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return (h % 1000) / 500 - 1;
}

/** The place a listing sits on the map, or `null` when the town is unknown. */
export function propertyCoords(p: Pick<Property, "id" | "city" | "district">): Coords | null {
  const base = DISTRICT_COORDS[strip(p.district)] ?? CITY_COORDS[strip(p.city)] ?? null;
  if (!base) return null;
  // ~±0.004° ≈ 300–450 m — enough to separate pins, small enough to stay in the district.
  return { lat: base.lat + hashUnit(p.id, 7) * 0.004, lng: base.lng + hashUnit(p.id, 13) * 0.006 };
}

/** The listings that have a known place, as map pins. */
export function propertyPoints(properties: readonly Property[]): PropertyPoint[] {
  return properties.flatMap((p) => {
    const coords = propertyCoords(p);
    return coords ? [{ id: p.id, ...coords, label: p.title }] : [];
  });
}
