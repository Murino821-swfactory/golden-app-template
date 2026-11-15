import { test, expect } from "@playwright/test";
import {
  HIDDEN_KEYS_LIMIT,
  defaultSlot,
  dependentsOfSpot,
  effectiveStatus,
  findConflict,
  isGridRecord,
  lookupPlate,
  normalizePlate,
  parseReservation,
  parseVehicle,
  preserveHidden,
  reservationValues,
  seedLocation,
  spotLocation,
  spotPins,
  statusCounts,
  unplacedSpots,
  upcomingReservations,
  vehicleValues,
  withLiveStatus,
  withLocation,
  type Reservation,
  type Vehicle,
} from "../lib/parking";
import type { EntityRecord } from "../lib/records";

/**
 * T-430 — the parking register's three features, as rules without a browser or Firestore:
 * spots on the map, reservations that cannot collide, and the vehicle (licence plate)
 * register. Everything lives in the visitor's own `records` sandbox, so each rule also has
 * to keep a record inside what factory-web's `validRecord` accepts (a `values` map of at
 * most 12 keys).
 */

const rec = (id: string, values: Record<string, unknown>, at = "2026-11-10T08:00:00Z"): EntityRecord => ({
  id,
  userId: "u1",
  createdAt: new Date(at),
  values,
});

const spotA = rec("a", { address: "Maple Court 4", type: "covered", status: "available", lat: 48.1492, lng: 17.1082 });
const spotB = rec("b", { address: "Oak Lane 12", type: "outdoor", status: "occupied" });
const spotC = rec("c", { address: "Pine Street 7", type: "garage", status: "reserved", lat: 48.1502, lng: 17.1068 });

const res = (id: string, spotId: string, date: string, from: string, to: string, extra: Partial<Reservation> = {}): Reservation => ({
  id,
  spotId,
  date,
  from,
  to,
  ...extra,
});

// Local-time constructor on purpose: reservations are wall-clock times where the spot is,
// and the suite must hold on the VM (UTC) as well as on a Bratislava PC.
const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min);

test.describe("which records the generic grid owns", () => {
  test("a record without a kind is a spot; reservations and vehicles are not", () => {
    expect(isGridRecord({ address: "x" })).toBe(true);
    expect(isGridRecord({ kind: "reservation", spotId: "a" })).toBe(false);
    expect(isGridRecord({ kind: "vehicle", plate: "BA123AB" })).toBe(false);
  });

  test("saving the spot form keeps what the form does not show — the pin survives an edit", () => {
    const kept = preserveHidden(["address", "status"], { address: "Old", status: "available", lat: 48.1, lng: 17.1 }, { address: "New", status: "occupied" });
    expect(kept).toEqual({ address: "New", status: "occupied", lat: 48.1, lng: 17.1 });
  });

  test("a field the form cleared stays cleared, and the record never outgrows the rules", () => {
    const kept = preserveHidden(["address", "notes"], { address: "A", notes: "old note", lat: 1, lng: 2 }, { address: "A" });
    expect(kept).toEqual({ address: "A", lat: 1, lng: 2 });
    const wide = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`f${i}`, i]));
    const merged = preserveHidden(Object.keys(wide), { ...wide, lat: 1, lng: 2 }, wide);
    expect(Object.keys(merged)).toHaveLength(HIDDEN_KEYS_LIMIT);
    expect(merged).toEqual(wide);
  });
});

test.describe("spots on the map", () => {
  test("a location is two finite numbers inside the globe, anything else is unplaced", () => {
    expect(spotLocation(spotA.values)).toEqual({ lat: 48.1492, lng: 17.1082 });
    expect(spotLocation(spotB.values)).toBeNull();
    expect(spotLocation({ lat: "48.1", lng: 17 })).toBeNull();
    expect(spotLocation({ lat: 91, lng: 17 })).toBeNull();
    expect(spotLocation({ lat: 48, lng: Number.NaN })).toBeNull();
  });

  test("placing a spot writes rounded coordinates and touches nothing else", () => {
    expect(withLocation({ address: "Oak Lane 12" }, { lat: 48.14791234567, lng: 17.10954321987 })).toEqual({
      address: "Oak Lane 12",
      lat: 48.147912,
      lng: 17.109543,
    });
  });

  test("pins carry the address and the status the spot has right now", () => {
    const now = at(2026, 11, 14, 10, 30);
    const reservations = [res("r1", "a", "2026-11-14", "10:00", "12:00")];
    expect(spotPins([spotA, spotB, spotC], reservations, now, "address")).toEqual([
      { id: "a", lat: 48.1492, lng: 17.1082, label: "Maple Court 4", status: "reserved" },
      { id: "c", lat: 48.1502, lng: 17.1068, label: "Pine Street 7", status: "reserved" },
    ]);
    expect(unplacedSpots([spotA, spotB, spotC]).map((s) => s.id)).toEqual(["b"]);
  });

  test("first-visit samples land on the configured example places, then around the centre", () => {
    const anchors = [{ lat: 48.1492, lng: 17.1082 }, { lat: 48.1479, lng: 17.1095 }];
    const centre = { lat: 48.1486, lng: 17.1077 };
    expect(seedLocation(0, anchors, centre)).toEqual(anchors[0]);
    expect(seedLocation(1, anchors, centre)).toEqual(anchors[1]);
    const third = seedLocation(2, anchors, centre);
    expect(third).not.toEqual(centre);
    expect(Math.abs(third.lat - centre.lat)).toBeLessThan(0.01);
    expect(Math.abs(third.lng - centre.lng)).toBeLessThan(0.01);
    expect(seedLocation(2, anchors, centre)).toEqual(third);
  });

  test("the KPI cards count the live status; a spot already showing it is passed through untouched", () => {
    const now = at(2026, 11, 14, 10, 30);
    const reservations = [res("r1", "a", "2026-11-14", "10:00", "12:00")];
    const live = withLiveStatus([spotA, spotB, spotC], reservations, now);
    expect(live.map((s) => s.values.status)).toEqual(["reserved", "occupied", "reserved"]);
    expect(live[0]!.values).toMatchObject({ address: "Maple Court 4", lat: 48.1492 });
    expect(live[1]).toBe(spotB);
    expect(spotA.values.status).toBe("available");
  });

  test("status counts follow the status on the map, not only the stored one", () => {
    const now = at(2026, 11, 14, 10, 30);
    const reservations = [res("r1", "a", "2026-11-14", "10:00", "12:00")];
    expect(statusCounts([spotA, spotB, spotC], reservations, now)).toEqual({ available: 0, occupied: 1, reserved: 2 });
  });
});

test.describe("reservations", () => {
  const now = at(2026, 11, 14, 9, 0);
  const spots = [spotA, spotB, spotC];

  test("a valid form becomes the stored values, at most the keys it needs", () => {
    const out = reservationValues({ spotId: "a", date: "2026-11-14", from: "10:00", to: "12:00", plate: " ba-123 ab ", note: " Visitor " }, spots, [], now);
    expect(out.errors).toEqual([]);
    expect(out.values).toEqual({ kind: "reservation", spotId: "a", date: "2026-11-14", from: "10:00", to: "12:00", plate: "BA123AB", note: "Visitor" });
  });

  test("the form's mistakes are named, one code per field", () => {
    const codes = (input: Parameters<typeof reservationValues>[0]) => reservationValues(input, spots, [], now).errors;
    expect(codes({ spotId: "", date: "2026-11-14", from: "10:00", to: "12:00" })).toEqual([{ key: "spotId", code: "required" }]);
    expect(codes({ spotId: "zzz", date: "2026-11-14", from: "10:00", to: "12:00" })).toEqual([{ key: "spotId", code: "required" }]);
    expect(codes({ spotId: "a", date: "14.11.2026", from: "10:00", to: "12:00" })).toEqual([{ key: "date", code: "format" }]);
    expect(codes({ spotId: "a", date: "2026-11-14", from: "25:00", to: "12:00" })).toEqual([{ key: "from", code: "format" }]);
    expect(codes({ spotId: "a", date: "2026-11-14", from: "12:00", to: "12:00" })).toEqual([{ key: "to", code: "order" }]);
    expect(codes({ spotId: "a", date: "2026-11-14", from: "12:00", to: "10:00" })).toEqual([{ key: "to", code: "order" }]);
    expect(codes({ spotId: "a", date: "2026-11-14", from: "07:00", to: "08:30" })).toEqual([{ key: "date", code: "past" }]);
    expect(codes({ spotId: "a", date: "2026-11-13", from: "10:00", to: "12:00" })).toEqual([{ key: "date", code: "past" }]);
    expect(codes({ spotId: "a", date: "2026-11-14", from: "10:00", to: "12:00", note: "x".repeat(201) })).toEqual([{ key: "note", code: "tooLong" }]);
  });

  test("a reservation still running may be made; one that already ended may not", () => {
    expect(reservationValues({ spotId: "a", date: "2026-11-14", from: "08:00", to: "09:30" }, spots, [], now).errors).toEqual([]);
    expect(reservationValues({ spotId: "a", date: "2026-11-14", from: "08:00", to: "09:00" }, spots, [], now).errors).toEqual([{ key: "date", code: "past" }]);
  });

  test("two reservations of one spot cannot overlap; touching ends and other spots are fine", () => {
    const existing = [res("r1", "a", "2026-11-14", "10:00", "12:00")];
    const candidate = (spotId: string, date: string, from: string, to: string) => ({ spotId, date, from, to });
    expect(findConflict(candidate("a", "2026-11-14", "11:00", "13:00"), existing)?.id).toBe("r1");
    expect(findConflict(candidate("a", "2026-11-14", "09:00", "10:01"), existing)?.id).toBe("r1");
    expect(findConflict(candidate("a", "2026-11-14", "10:30", "11:00"), existing)?.id).toBe("r1");
    expect(findConflict(candidate("a", "2026-11-14", "12:00", "13:00"), existing)).toBeNull();
    expect(findConflict(candidate("a", "2026-11-14", "08:00", "10:00"), existing)).toBeNull();
    expect(findConflict(candidate("a", "2026-11-15", "10:00", "12:00"), existing)).toBeNull();
    expect(findConflict(candidate("c", "2026-11-14", "10:00", "12:00"), existing)).toBeNull();
    // Editing a reservation must not collide with itself.
    expect(findConflict(candidate("a", "2026-11-14", "10:00", "12:00"), existing, "r1")).toBeNull();
  });

  test("a collision is a form error that names the reservation in the way", () => {
    const existing = [res("r1", "a", "2026-11-14", "10:00", "12:00")];
    const out = reservationValues({ spotId: "a", date: "2026-11-14", from: "11:00", to: "13:00" }, spots, existing, now);
    expect(out.errors).toEqual([{ key: "from", code: "conflict", with: existing[0] }]);
  });

  test("stored records parse back; a broken or foreign record is not a reservation", () => {
    expect(parseReservation(rec("r1", { kind: "reservation", spotId: "a", date: "2026-11-14", from: "10:00", to: "12:00", plate: "BA123AB" }))).toEqual(
      res("r1", "a", "2026-11-14", "10:00", "12:00", { plate: "BA123AB" })
    );
    expect(parseReservation(rec("r2", { kind: "reservation", spotId: "a", date: "soon", from: "10:00", to: "12:00" }))).toBeNull();
    expect(parseReservation(rec("r3", { kind: "vehicle", plate: "BA123AB" }))).toBeNull();
    expect(parseReservation(spotA)).toBeNull();
  });

  test("upcoming = not ended yet, soonest first; the past drops off", () => {
    const list = [
      res("late", "a", "2026-11-15", "08:00", "09:00"),
      res("ended", "a", "2026-11-14", "07:00", "08:00"),
      res("running", "c", "2026-11-14", "08:30", "09:30"),
      res("today", "a", "2026-11-14", "10:00", "12:00"),
      res("yesterday", "a", "2026-11-13", "10:00", "12:00"),
    ];
    expect(upcomingReservations(list, now).map((r) => r.id)).toEqual(["running", "today", "late"]);
  });

  test("the form opens on the next full hour; late in the evening on tomorrow morning", () => {
    expect(defaultSlot(at(2026, 11, 14, 9, 20))).toEqual({ date: "2026-11-14", from: "10:00", to: "11:00" });
    expect(defaultSlot(at(2026, 11, 14, 21, 59))).toEqual({ date: "2026-11-14", from: "22:00", to: "23:00" });
    expect(defaultSlot(at(2026, 11, 30, 22, 10))).toEqual({ date: "2026-12-01", from: "08:00", to: "09:00" });
  });

  test("a spot's status on the map: occupied wins, a running reservation reserves, else the stored one", () => {
    const running = [res("r1", "a", "2026-11-14", "08:30", "09:30"), res("r2", "b", "2026-11-14", "08:30", "09:30")];
    expect(effectiveStatus(spotA, running, now)).toBe("reserved");
    expect(effectiveStatus(spotB, running, now)).toBe("occupied");
    expect(effectiveStatus(spotC, [], now)).toBe("reserved");
    expect(effectiveStatus(spotA, [res("r3", "a", "2026-11-14", "10:00", "12:00")], now)).toBe("available");
    expect(effectiveStatus(rec("x", { address: "No status" }), [], now)).toBe("available");
    // The end minute is free again.
    expect(effectiveStatus(spotA, [res("r4", "a", "2026-11-14", "08:00", "09:00")], now)).toBe("available");
  });
});

test.describe("vehicles and licence plates", () => {
  const spots = [spotA, spotB];
  const vehicles: Vehicle[] = [
    { id: "v1", plate: "BA123AB", model: "Škoda Octavia", driver: "M. Novák", spotId: "a" },
    { id: "v2", plate: "TT456CD", model: "Kia Ceed", driver: "P. Horváth" },
  ];

  test("a plate is compared the way it is read, not the way it is typed", () => {
    expect(normalizePlate(" ba-123 ab ")).toBe("BA123AB");
    expect(normalizePlate("tt.456·cd")).toBe("TT456CD");
    expect(normalizePlate("")).toBe("");
  });

  test("a valid form becomes the stored values", () => {
    const out = vehicleValues({ plate: "ke 789-ef", model: " Dacia Duster ", driver: " J. Kováč ", spotId: "b" }, spots, vehicles);
    expect(out.errors).toEqual([]);
    expect(out.values).toEqual({ kind: "vehicle", plate: "KE789EF", model: "Dacia Duster", driver: "J. Kováč", spotId: "b" });
    expect(vehicleValues({ plate: "KE789EF" }, spots, vehicles).values).toEqual({ kind: "vehicle", plate: "KE789EF" });
  });

  test("the plate is required, sane and unique in the register; a removed spot is not assigned", () => {
    const codes = (input: Parameters<typeof vehicleValues>[0], ignoreId?: string) => vehicleValues(input, spots, vehicles, ignoreId).errors;
    expect(codes({ plate: "  " })).toEqual([{ key: "plate", code: "required" }]);
    expect(codes({ plate: "A" })).toEqual([{ key: "plate", code: "format" }]);
    expect(codes({ plate: "ABCDEFGHIJKLM" })).toEqual([{ key: "plate", code: "format" }]);
    expect(codes({ plate: "ba 123 ab" })).toEqual([{ key: "plate", code: "duplicate" }]);
    expect(codes({ plate: "ba 123 ab" }, "v1")).toEqual([]);
    expect(codes({ plate: "KE789EF", model: "x".repeat(201) })).toEqual([{ key: "model", code: "tooLong" }]);
    expect(vehicleValues({ plate: "KE789EF", spotId: "gone" }, spots, vehicles).values).toEqual({ kind: "vehicle", plate: "KE789EF" });
  });

  test("stored records parse back", () => {
    expect(parseVehicle(rec("v1", { kind: "vehicle", plate: "BA123AB", model: "Škoda Octavia", driver: "M. Novák", spotId: "a" }))).toEqual(vehicles[0]);
    expect(parseVehicle(rec("v9", { kind: "vehicle" }))).toBeNull();
    expect(parseVehicle(spotA)).toBeNull();
  });

  test("whose car is this — a lookup by any part of the plate, however it is typed", () => {
    expect(lookupPlate(vehicles, "ba 123").map((v) => v.id)).toEqual(["v1"]);
    expect(lookupPlate(vehicles, "456-cd").map((v) => v.id)).toEqual(["v2"]);
    expect(lookupPlate(vehicles, "zz").map((v) => v.id)).toEqual([]);
    expect(lookupPlate(vehicles, "  ")).toEqual([]);
    // One character matches half the register and tells nothing.
    expect(lookupPlate(vehicles, "a")).toEqual([]);
  });
});

test.describe("removing a spot", () => {
  test("its reservations go with it and its vehicles lose the assignment, nothing else moves", () => {
    const extras = [
      rec("r1", { kind: "reservation", spotId: "a", date: "2026-11-14", from: "10:00", to: "12:00" }),
      rec("r2", { kind: "reservation", spotId: "c", date: "2026-11-14", from: "10:00", to: "12:00" }),
      rec("v1", { kind: "vehicle", plate: "BA123AB", spotId: "a", driver: "M. Novák" }),
      rec("v2", { kind: "vehicle", plate: "TT456CD", spotId: "c" }),
    ];
    expect(dependentsOfSpot("a", extras)).toEqual({
      deleteIds: ["r1"],
      unassign: [{ id: "v1", values: { kind: "vehicle", plate: "BA123AB", driver: "M. Novák" } }],
    });
    expect(dependentsOfSpot("zzz", extras)).toEqual({ deleteIds: [], unassign: [] });
  });
});
