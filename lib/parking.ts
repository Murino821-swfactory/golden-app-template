/**
 * parking.ts — the parking register's own rules, as pure functions (T-430).
 *
 * Three features sit on top of the generic grid: spots on the map, reservations that cannot
 * collide, and the vehicle (licence plate) register. All of it is stored in the visitor's own
 * sandbox — the ONE collection factory-web's rules let a visitor write
 * (`demos/{slug}/users/{uid}/records`, a `values` map of at most 12 keys):
 *
 *   spot         the grid's record, plus the hidden keys `lat` / `lng`
 *   reservation  `{ kind: "reservation", spotId, date, from, to, plate?, note? }`
 *   vehicle      `{ kind: "vehicle", plate, model?, driver?, spotId? }`
 *
 * Nothing here imports Firebase, the config or React — `tests/parking-logic.spec.ts` runs it
 * without a browser. Dates and times are wall-clock values where the spot is: a reservation
 * is "today 10:00–12:00", never an instant, so every rule reads the LOCAL fields of `now`.
 */
import { TEXT_MAX, type EntityRecord } from "./records";

/** factory-web `validRecord`: `values.size() <= 12`. */
export const HIDDEN_KEYS_LIMIT = 12;

export type SpotStatus = "available" | "occupied" | "reserved";
export const SPOT_STATUSES: readonly SpotStatus[] = ["available", "occupied", "reserved"];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Reservation {
  id: string;
  spotId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM, 24 h */
  from: string;
  to: string;
  plate?: string;
  note?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model?: string;
  driver?: string;
  spotId?: string;
}

export type FormErrorCode = "required" | "format" | "order" | "past" | "tooLong" | "conflict" | "duplicate";
export interface FormError {
  key: string;
  code: FormErrorCode;
  /** `conflict` only: the reservation in the way. */
  with?: Reservation;
}

/* ------------------------------------------------------------------ kinds */

/** The generic grid, its KPI cards and its board own the records without a `kind`. */
export function isGridRecord(values: Record<string, unknown>): boolean {
  return typeof values.kind !== "string";
}

/**
 * What the grid's form saves, plus what it does not show. The form writes the configured
 * fields only, and an update replaces `values` whole — without this a spot would lose its
 * pin every time its address or status is edited. A configured field the form cleared stays
 * cleared; hidden keys are dropped rather than let the record outgrow the rules.
 */
export function preserveHidden(
  fieldKeys: readonly string[],
  previous: Record<string, unknown>,
  next: Record<string, unknown>
): Record<string, unknown> {
  const known = new Set(fieldKeys);
  const out: Record<string, unknown> = { ...next };
  for (const [key, value] of Object.entries(previous)) {
    if (known.has(key) || Object.hasOwn(out, key)) continue;
    if (Object.keys(out).length >= HIDDEN_KEYS_LIMIT) break;
    out[key] = value;
  }
  return out;
}

/* -------------------------------------------------------------------- map */

const inRange = (v: unknown, limit: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limit;

export function spotLocation(values: Record<string, unknown>): LatLng | null {
  return inRange(values.lat, 90) && inRange(values.lng, 180) ? { lat: values.lat, lng: values.lng } : null;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Six decimals is about 10 cm — finer than a parking bay, and it keeps the document small. */
export function withLocation(values: Record<string, unknown>, at: LatLng): Record<string, unknown> {
  return { ...values, lat: round6(at.lat), lng: round6(at.lng) };
}

export function unplacedSpots(spots: readonly EntityRecord[]): EntityRecord[] {
  return spots.filter((spot) => spotLocation(spot.values) === null);
}

/**
 * Where a first-visit sample spot starts: on the configured example places while they last,
 * then on a small spiral round the map's centre — never two samples on one point, and the
 * same place for the same sample on every visit.
 */
export function seedLocation(index: number, anchors: readonly LatLng[], centre: LatLng): LatLng {
  const anchor = anchors[index];
  if (anchor) return { lat: anchor.lat, lng: anchor.lng };
  const turn = (index + 1) * 2.399963; // the golden angle, in radians
  const reach = 0.0012 + 0.0004 * index;
  return { lat: round6(centre.lat + reach * Math.cos(turn)), lng: round6(centre.lng + reach * 1.5 * Math.sin(turn)) };
}

/* ------------------------------------------------------------ reservations */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isDate(text: string): boolean {
  const m = DATE_RE.exec(text);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(y, mo - 1, d);
  return probe.getFullYear() === y && probe.getMonth() === mo - 1 && probe.getDate() === d;
}

const minutes = (time: string): number => {
  const m = TIME_RE.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.NaN;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function localDate(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const localMinutes = (now: Date) => now.getHours() * 60 + now.getMinutes();

type Slot = Pick<Reservation, "spotId" | "date" | "from" | "to">;

export const hasEnded = (slot: Pick<Slot, "date" | "to">, now: Date): boolean => {
  const today = localDate(now);
  return slot.date < today || (slot.date === today && minutes(slot.to) <= localMinutes(now));
};

export const isRunning = (slot: Pick<Slot, "date" | "from" | "to">, now: Date): boolean =>
  slot.date === localDate(now) && minutes(slot.from) <= localMinutes(now) && localMinutes(now) < minutes(slot.to);

/** The reservation that already holds part of this slot. An end that touches a start is free. */
export function findConflict(candidate: Slot, existing: readonly Reservation[], ignoreId?: string): Reservation | null {
  const from = minutes(candidate.from);
  const to = minutes(candidate.to);
  return (
    existing.find(
      (r) =>
        r.id !== ignoreId &&
        r.spotId === candidate.spotId &&
        r.date === candidate.date &&
        from < minutes(r.to) &&
        minutes(r.from) < to
    ) ?? null
  );
}

export interface ReservationInput {
  spotId: string;
  date: string;
  from: string;
  to: string;
  plate?: string;
  note?: string;
}

/** Form input → the values Firestore stores, or the reasons it cannot be stored. */
export function reservationValues(
  input: ReservationInput,
  spots: readonly EntityRecord[],
  existing: readonly Reservation[],
  now: Date,
  ignoreId?: string
): { values: Record<string, unknown>; errors: FormError[] } {
  const errors: FormError[] = [];
  const spotId = input.spotId.trim();
  const date = input.date.trim();
  const from = input.from.trim();
  const to = input.to.trim();
  const plate = normalizePlate(input.plate ?? "");
  const note = (input.note ?? "").trim();

  if (!spotId || !spots.some((spot) => spot.id === spotId)) errors.push({ key: "spotId", code: "required" });
  const dateOk = isDate(date);
  if (!dateOk) errors.push({ key: "date", code: "format" });
  const fromOk = TIME_RE.test(from);
  const toOk = TIME_RE.test(to);
  if (!fromOk) errors.push({ key: "from", code: "format" });
  if (!toOk) errors.push({ key: "to", code: "format" });
  const ordered = fromOk && toOk && minutes(from) < minutes(to);
  if (fromOk && toOk && !ordered) errors.push({ key: "to", code: "order" });
  if (dateOk && ordered && hasEnded({ date, to }, now)) errors.push({ key: "date", code: "past" });
  if (plate && !isPlate(plate)) errors.push({ key: "plate", code: "format" });
  if (note.length > TEXT_MAX) errors.push({ key: "note", code: "tooLong" });

  if (errors.length === 0) {
    const blocker = findConflict({ spotId, date, from, to }, existing, ignoreId);
    if (blocker) errors.push({ key: "from", code: "conflict", with: blocker });
  }

  const values: Record<string, unknown> = { kind: "reservation", spotId, date, from, to };
  if (plate) values.plate = plate;
  if (note) values.note = note;
  return { values, errors };
}

const text = (v: unknown): string | undefined => (typeof v === "string" && v.trim() !== "" ? v : undefined);

export function parseReservation(record: EntityRecord): Reservation | null {
  const v = record.values;
  if (v.kind !== "reservation") return null;
  const spotId = text(v.spotId);
  const date = text(v.date);
  const from = text(v.from);
  const to = text(v.to);
  if (!spotId || !date || !from || !to) return null;
  if (!isDate(date) || !TIME_RE.test(from) || !TIME_RE.test(to) || minutes(from) >= minutes(to)) return null;
  const plate = text(v.plate);
  const note = text(v.note);
  return { id: record.id, spotId, date, from, to, ...(plate ? { plate } : {}), ...(note ? { note } : {}) };
}

/** Not ended yet, soonest first. */
export function upcomingReservations(reservations: readonly Reservation[], now: Date): Reservation[] {
  return reservations
    .filter((r) => !hasEnded(r, now))
    .sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from) || a.id.localeCompare(b.id));
}

/** A sensible first slot: the next full hour for one hour; late in the evening, tomorrow morning. */
export function defaultSlot(now: Date): { date: string; from: string; to: string } {
  const hour = now.getHours() + 1;
  if (hour >= 23) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { date: localDate(tomorrow), from: "08:00", to: "09:00" };
  }
  return { date: localDate(now), from: `${pad(hour)}:00`, to: `${pad(hour + 1)}:00` };
}

/* ------------------------------------------------------------------ status */

/**
 * The status a spot shows on the map right now. "Occupied" is a fact someone entered and
 * wins; a reservation running at this minute reserves the spot without anyone editing it;
 * otherwise the stored status stands, and a spot without one is free.
 */
export function effectiveStatus(spot: EntityRecord, reservations: readonly Reservation[], now: Date): SpotStatus {
  const stored = spot.values.status;
  if (stored === "occupied") return "occupied";
  if (reservations.some((r) => r.spotId === spot.id && isRunning(r, now))) return "reserved";
  return stored === "reserved" ? "reserved" : "available";
}

/** The grid's spots with the status the map shows, so the KPI cards and the legend agree. */
export function withLiveStatus(spots: readonly EntityRecord[], reservations: readonly Reservation[], now: Date): EntityRecord[] {
  return spots.map((spot) => {
    const live = effectiveStatus(spot, reservations, now);
    return spot.values.status === live ? spot : { ...spot, values: { ...spot.values, status: live } };
  });
}

export interface SpotPin extends LatLng {
  id: string;
  label: string;
  status: SpotStatus;
}

export function spotLabel(spot: EntityRecord, labelKey: string): string {
  const value = spot.values[labelKey];
  return value === undefined || value === null ? "" : String(value);
}

/** The spots that have a place, as the map draws them. */
export function spotPins(
  spots: readonly EntityRecord[],
  reservations: readonly Reservation[],
  now: Date,
  labelKey: string
): SpotPin[] {
  return spots.flatMap((spot) => {
    const at = spotLocation(spot.values);
    if (!at) return [];
    return [{ id: spot.id, ...at, label: spotLabel(spot, labelKey), status: effectiveStatus(spot, reservations, now) }];
  });
}

export function statusCounts(
  spots: readonly EntityRecord[],
  reservations: readonly Reservation[],
  now: Date
): Record<SpotStatus, number> {
  const counts: Record<SpotStatus, number> = { available: 0, occupied: 0, reserved: 0 };
  for (const spot of spots) counts[effectiveStatus(spot, reservations, now)] += 1;
  return counts;
}

/* ---------------------------------------------------------------- vehicles */

/** A plate as it is read aloud: capitals and digits, whatever was typed between them. */
export function normalizePlate(raw: string): string {
  return raw.toLocaleUpperCase().replace(/[^\p{L}\p{N}]/gu, "");
}

const PLATE_MIN = 2;
const PLATE_MAX = 12;
const isPlate = (plate: string) => plate.length >= PLATE_MIN && plate.length <= PLATE_MAX;

export interface VehicleInput {
  plate: string;
  model?: string;
  driver?: string;
  spotId?: string;
}

export function vehicleValues(
  input: VehicleInput,
  spots: readonly EntityRecord[],
  vehicles: readonly Vehicle[],
  ignoreId?: string
): { values: Record<string, unknown>; errors: FormError[] } {
  const errors: FormError[] = [];
  const plate = normalizePlate(input.plate);
  const model = (input.model ?? "").trim();
  const driver = (input.driver ?? "").trim();
  const spotId = (input.spotId ?? "").trim();

  if (!plate) errors.push({ key: "plate", code: "required" });
  else if (!isPlate(plate)) errors.push({ key: "plate", code: "format" });
  else if (vehicles.some((v) => v.id !== ignoreId && v.plate === plate)) errors.push({ key: "plate", code: "duplicate" });
  if (model.length > TEXT_MAX) errors.push({ key: "model", code: "tooLong" });
  if (driver.length > TEXT_MAX) errors.push({ key: "driver", code: "tooLong" });

  const values: Record<string, unknown> = { kind: "vehicle", plate };
  if (model) values.model = model;
  if (driver) values.driver = driver;
  if (spotId && spots.some((spot) => spot.id === spotId)) values.spotId = spotId;
  return { values, errors };
}

export function parseVehicle(record: EntityRecord): Vehicle | null {
  const v = record.values;
  if (v.kind !== "vehicle") return null;
  const plate = normalizePlate(text(v.plate) ?? "");
  if (!plate) return null;
  const model = text(v.model);
  const driver = text(v.driver);
  const spotId = text(v.spotId);
  return { id: record.id, plate, ...(model ? { model } : {}), ...(driver ? { driver } : {}), ...(spotId ? { spotId } : {}) };
}

/** "Whose car is this?" — any part of the plate, at least two characters of it. */
export function lookupPlate(vehicles: readonly Vehicle[], query: string): Vehicle[] {
  const q = normalizePlate(query);
  if (q.length < PLATE_MIN) return [];
  return vehicles.filter((v) => v.plate.includes(q));
}

/* --------------------------------------------------------- removing a spot */

/** What must follow a spot out: its reservations are deleted, its vehicles keep the car and
 * lose the assignment. Each is its own write — the rules count every delete separately. */
export function dependentsOfSpot(
  spotId: string,
  extras: readonly EntityRecord[]
): { deleteIds: string[]; unassign: Array<{ id: string; values: Record<string, unknown> }> } {
  const deleteIds: string[] = [];
  const unassign: Array<{ id: string; values: Record<string, unknown> }> = [];
  for (const record of extras) {
    if (record.values.spotId !== spotId) continue;
    if (record.values.kind === "reservation") deleteIds.push(record.id);
    else if (record.values.kind === "vehicle") {
      const { spotId: _gone, ...rest } = record.values;
      void _gone;
      unassign.push({ id: record.id, values: rest });
    }
  }
  return { deleteIds, unassign };
}
