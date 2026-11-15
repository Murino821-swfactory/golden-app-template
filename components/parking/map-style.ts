/**
 * The base map the parking map draws on — the same dark CARTO style as `map-base`. Its own
 * module so the emulator fixture (integration/parking) can swap in an empty style and keep
 * every request on loopback.
 */
export const PARKING_MAP_STYLE: string | { version: 8; sources: Record<string, never>; layers: [] } =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
