/**
 * parking-config.ts — where the parking rules meet this prototype's config (T-430).
 *
 * The parking features switch on from the config alone: a grid whose entity is a `spot` with
 * a `status` select, and a map. Any other composition of the template (its fixtures, its
 * integration harnesses) renders exactly as before.
 */
import { config, type PrototypeConfig } from "@/lib/prototype-config";
import { seedLocation, withLocation, type LatLng } from "./parking";

export function isParkingConfig(cfg: PrototypeConfig): boolean {
  const entity = cfg.patterns.dataGrid?.entity;
  return (
    entity?.key === "spot" &&
    entity.fields.some((field) => field.key === "status" && field.type === "select") &&
    cfg.patterns.mapBase !== undefined
  );
}

export const PARKING_ENABLED = isParkingConfig(config);

const fields = config.patterns.dataGrid?.entity.fields ?? [];

/** The field a spot is called by on the map and in the forms: its first required text. */
export const SPOT_LABEL_KEY =
  (fields.find((f) => f.type === "text" && f.required) ?? fields.find((f) => f.type === "text") ?? fields[0])?.key ?? "address";

export const SPOT_TYPE_KEY = fields.find((f) => f.key === "type")?.key ?? null;

export const MAP_CENTRE: LatLng = config.patterns.mapBase?.center ?? { lat: 0, lng: 0 };
export const MAP_ZOOM = config.patterns.mapBase?.zoom ?? 14;

const anchors: LatLng[] = (config.patterns.listings?.items ?? []).flatMap((item) => (item.location ? [item.location] : []));

/** First-visit samples start with a pin, so the map never opens empty. */
export function seedSamples(samples: readonly Record<string, unknown>[]): Record<string, unknown>[] {
  if (!PARKING_ENABLED) return [...samples];
  return samples.map((sample, index) => withLocation(sample, seedLocation(index, anchors, MAP_CENTRE)));
}
