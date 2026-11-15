import { test, expect, type Page } from "@playwright/test";
import en from "../../messages/en.json";
import sk from "../../messages/sk.json";

/**
 * T-430 — the parking register as a signed-in visitor uses it: the real dashboard of this
 * prototype, its real config, the Firestore emulator and factory-web's real rules. What the
 * rules refuse fails here, before it can fail on a customer's phone.
 */
const documents = "http://127.0.0.1:8790/v1/projects/rules-test/databases/(default)/documents";
const root = "demos/parking-fixture/users/parking-visitor";
const NOW = "2026-11-16T09:30:00+01:00"; // a Monday morning in Bratislava
const copy = en.parking;

type Fields = Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean }>;
const plain = (fields: Fields = {}) =>
  Object.fromEntries(
    Object.entries(fields).map(([key, v]) => [key, v.stringValue ?? (v.integerValue !== undefined ? Number(v.integerValue) : v.doubleValue ?? v.booleanValue)])
  );

async function write(path: string, fields: object) {
  const response = await fetch(`${documents}/${path}`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
  expect(response.ok, await response.text()).toBe(true);
}
async function counter(): Promise<number> {
  const response = await fetch(`${documents}/${root}`, { headers: { Authorization: "Bearer owner" } });
  expect(response.ok).toBe(true);
  return Number((await response.json()).fields.count.integerValue);
}
async function records(): Promise<Array<{ id: string; values: Record<string, unknown> }>> {
  const response = await fetch(`${documents}/${root}/records?pageSize=300`, { headers: { Authorization: "Bearer owner" } });
  expect(response.ok).toBe(true);
  const body = (await response.json()) as { documents?: Array<{ name: string; fields: { values: { mapValue: { fields?: Fields } } } }> };
  return (body.documents ?? []).map((doc) => ({ id: doc.name.split("/").pop()!, values: plain(doc.fields.values.mapValue.fields) }));
}
const ofKind = async (kind: string | undefined) => (await records()).filter((r) => r.values.kind === kind);

const SPOTS = [
  { address: "Maple Court 4, Block B", type: "covered", status: "available", owner: "M. Novák" },
  { address: "Oak Lane 12, Courtyard", type: "outdoor", status: "occupied", owner: "P. Horváth" },
  { address: "Pine Street 7, Garage Block", type: "garage", status: "available", owner: "J. Kováč" },
];
const PLACES = [
  { lat: 48.1492, lng: 17.1082 },
  { lat: 48.1479, lng: 17.1095 },
  { lat: 48.1502, lng: 17.1068 },
];

async function reset() {
  const response = await fetch("http://127.0.0.1:8790/emulator/v1/projects/rules-test/databases/(default)/documents", { method: "DELETE" });
  expect(response.ok).toBe(true);
  await write("prototypes-index/parking-fixture", { prototypeId: { stringValue: "parking-fixture-prototype" } });
}
/** A returning visitor: three spots, placed on the map or not. */
async function seed(placed: boolean) {
  await write(root, { count: { integerValue: String(SPOTS.length) }, last: { stringValue: "spot-0" } });
  for (const [i, spot] of SPOTS.entries()) {
    const fields: Record<string, object> = Object.fromEntries(Object.entries(spot).map(([k, v]) => [k, { stringValue: v }]));
    if (placed) Object.assign(fields, { lat: { doubleValue: PLACES[i]!.lat }, lng: { doubleValue: PLACES[i]!.lng } });
    await write(`${root}/records/spot-${i}`, {
      values: { mapValue: { fields } },
      createdAt: { timestampValue: new Date(Date.UTC(2026, 10, 10, 10, 0, SPOTS.length - i)).toISOString() },
      updatedAt: { timestampValue: "2026-11-10T10:00:00Z" },
    });
  }
}

const map = (page: Page) => page.locator('[data-pattern="parking-map"]');
const reservations = (page: Page) => page.locator('[data-pattern="parking-reservations"]');
const vehicles = (page: Page) => page.locator('[data-pattern="parking-vehicles"]');
const pin = (page: Page, id: string) => map(page).locator(`[data-spot-pin="${id}"]`);
const legend = (page: Page, status: string) => map(page).locator(`[data-legend="${status}"]`);

async function open(page: Page, route = "/dashboard") {
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto(route);
  await expect(page.locator('[data-pattern="data-grid"] [data-record-id]').first()).toBeAttached();
  await expect(map(page).locator("canvas")).toBeVisible();
}

async function reserve(page: Page, slot: { date: string; from: string; to: string; plate?: string; note?: string }) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("#reservation-date").fill(slot.date);
  await dialog.locator("#reservation-from").fill(slot.from);
  await dialog.locator("#reservation-to").fill(slot.to);
  if (slot.plate !== undefined) await dialog.locator("#reservation-plate").fill(slot.plate);
  if (slot.note !== undefined) await dialog.locator("#reservation-note").fill(slot.note);
  await dialog.getByRole("button", { name: copy.saveReservation, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => { throw error; });
  await reset();
});

test("a first visit opens with the sample spots already on the map", async ({ page }) => {
  await open(page);
  await expect(map(page).locator("[data-spot-pin]")).toHaveCount(3);
  await expect(map(page).locator("[data-place-spot]")).toHaveCount(0);
  await expect(legend(page, "available")).toContainText("1");
  await expect(legend(page, "occupied")).toContainText("1");
  await expect(legend(page, "reserved")).toContainText("1");
  const spots = await ofKind(undefined);
  expect(spots).toHaveLength(3);
  for (const spot of spots) {
    expect(typeof spot.values.lat, JSON.stringify(spot.values)).toBe("number");
    expect(typeof spot.values.lng).toBe("number");
    expect(Object.keys(spot.values).length).toBeLessThanOrEqual(12);
  }
  expect(new Set(spots.map((s) => `${s.values.lat},${s.values.lng}`)).size).toBe(3);
});

test("a spot without a place is put on the map with a tap, or on its centre", async ({ page }) => {
  await seed(false);
  await open(page);
  await expect(map(page).locator("[data-spot-pin]")).toHaveCount(0);
  await expect(map(page).locator("[data-place-spot]")).toHaveCount(3);

  await map(page).locator('[data-place-spot="spot-0"]').click();
  await expect(map(page).locator('[data-placing="spot-0"]')).toContainText(copy.placing.replace("{spot}", SPOTS[0]!.address));
  await map(page).locator("canvas").click({ position: { x: 120, y: 140 } });
  await expect(pin(page, "spot-0")).toBeVisible();
  await expect(pin(page, "spot-0")).toHaveAttribute("aria-pressed", "true");
  await expect(map(page).locator("[data-placing]")).toHaveCount(0);
  await expect(map(page).locator("[data-place-spot]")).toHaveCount(2);
  await expect(map(page).locator('[data-selected-spot="spot-0"]')).toContainText(SPOTS[0]!.address);

  // The keyboard's way: no tap on a canvas needed.
  await map(page).locator('[data-place-spot="spot-1"]').click();
  await map(page).getByRole("button", { name: copy.placeCentre, exact: true }).click();
  await expect(pin(page, "spot-1")).toBeVisible();
  await expect(pin(page, "spot-1")).toHaveAttribute("data-status", "occupied");

  // Changing one's mind places nothing.
  await map(page).locator('[data-place-spot="spot-2"]').click();
  await map(page).getByRole("button", { name: copy.placeCancel, exact: true }).click();
  await expect(map(page).locator("[data-spot-pin]")).toHaveCount(2);

  const stored = Object.fromEntries((await ofKind(undefined)).map((r) => [r.id, r.values]));
  expect(typeof stored["spot-0"]!.lat).toBe("number");
  expect(stored["spot-0"]).toMatchObject(SPOTS[0]!);
  expect(typeof stored["spot-1"]!.lng).toBe("number");
  expect(stored["spot-2"]!.lat).toBeUndefined();
  expect(await counter()).toBe(3);
});

test("a spot is reserved from its pin; an overlapping window is refused; a reservation can be cancelled", async ({ page }) => {
  await seed(true);
  await open(page);
  await pin(page, "spot-0").click();
  await map(page).locator('[data-selected-spot="spot-0"]').getByRole("button", { name: copy.reserve, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("#reservation-spotId")).toHaveValue("spot-0");
  await expect(dialog.locator("#reservation-date")).toHaveValue("2026-11-16");
  await expect(dialog.locator("#reservation-from")).toHaveValue("10:00");
  await reserve(page, { date: "2026-11-17", from: "10:00", to: "12:00", plate: "ba 123 ab", note: "Visitor" });
  await expect(dialog).toHaveCount(0);
  await expect(reservations(page).locator("[data-reservation]")).toHaveCount(1);
  await expect(reservations(page).locator("[data-reservation]").first()).toContainText(SPOTS[0]!.address);
  await expect(reservations(page).locator("[data-reservation]").first()).toContainText("10:00–12:00");
  await expect(reservations(page).locator("[data-reservation]").first()).toContainText("BA123AB · Visitor");
  expect((await ofKind("reservation")).map((r) => r.values)).toEqual([
    { kind: "reservation", spotId: "spot-0", date: "2026-11-17", from: "10:00", to: "12:00", plate: "BA123AB", note: "Visitor" },
  ]);
  expect(await counter()).toBe(4);

  // The same spot, an overlapping window: refused, and nothing is written.
  await reservations(page).getByRole("button", { name: copy.newReservation }).click();
  await dialog.locator("#reservation-spotId").selectOption("spot-0");
  await reserve(page, { date: "2026-11-17", from: "11:00", to: "13:00" });
  await expect(dialog).toContainText(copy.errors.conflict.replace("{from}", "10:00").replace("{to}", "12:00"));
  expect(await ofKind("reservation")).toHaveLength(1);
  // Straight after it is free.
  await reserve(page, { date: "2026-11-17", from: "12:00", to: "13:00" });
  await expect(dialog).toHaveCount(0);
  await expect(reservations(page).locator("[data-reservation]")).toHaveCount(2);
  // A window that already ended is refused too.
  await reservations(page).getByRole("button", { name: copy.newReservation }).click();
  await dialog.locator("#reservation-spotId").selectOption("spot-2");
  await reserve(page, { date: "2026-11-16", from: "07:00", to: "08:00" });
  await expect(dialog).toContainText(copy.errors.past);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  const first = reservations(page).locator("[data-reservation]").first();
  await first.getByRole("button", { name: copy.cancelReservation, exact: true }).click();
  await first.getByRole("button", { name: copy.confirmCancelAction, exact: true }).click();
  await expect(reservations(page).locator("[data-reservation]")).toHaveCount(1);
  expect((await ofKind("reservation")).map((r) => r.values.from)).toEqual(["12:00"]);
  expect(await counter()).toBe(4);
});

test("a reservation that is running shows the spot as reserved on the map", async ({ page }) => {
  await seed(true);
  await open(page);
  const kpis = page.locator('[data-pattern="dashboard-stats"] > *');
  await expect(pin(page, "spot-2")).toHaveAttribute("data-status", "available");
  await expect(legend(page, "available")).toContainText("2");
  await expect(kpis.nth(2)).toContainText("0%");
  await pin(page, "spot-2").click();
  await map(page).locator('[data-selected-spot="spot-2"]').getByRole("button", { name: copy.reserve, exact: true }).click();
  await reserve(page, { date: "2026-11-16", from: "09:00", to: "10:00" });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(pin(page, "spot-2")).toHaveAttribute("data-status", "reserved");
  await expect(legend(page, "available")).toContainText("1");
  await expect(legend(page, "reserved")).toContainText("1");
  // The KPI cards agree with the legend: one of three spots is reserved right now.
  await expect(kpis.nth(1)).toContainText("33%");
  await expect(kpis.nth(2)).toContainText("33%");
  await expect(reservations(page).locator("[data-reservation]").first()).toContainText(copy.runningNow);
  await expect(map(page).locator('[data-selected-spot="spot-2"] [data-status="reserved"]')).toBeVisible();
  // The spot's own record is untouched: the status on the map is derived.
  expect((await ofKind(undefined)).find((r) => r.id === "spot-2")!.values.status).toBe("available");
});

test("vehicles: a plate is registered once, found from any part of it, and leads to its spot", async ({ page }) => {
  await seed(true);
  await open(page);
  const dialog = page.getByRole("dialog");
  const add = async (plate: string, model: string, driver: string, spot?: string) => {
    await vehicles(page).getByRole("button", { name: copy.addVehicle }).click();
    await dialog.locator("#vehicle-plate").fill(plate);
    await dialog.locator("#vehicle-model").fill(model);
    await dialog.locator("#vehicle-driver").fill(driver);
    if (spot) await dialog.locator("#vehicle-spotId").selectOption(spot);
    await dialog.getByRole("button", { name: en.dataGrid.save, exact: true }).click();
  };
  await add("ba 123-ab", "Škoda Octavia, grey", "M. Novák", "spot-0");
  await expect(dialog).toHaveCount(0);
  await add("TT456CD", "Kia Ceed", "P. Horváth");
  await expect(dialog).toHaveCount(0);
  await expect(vehicles(page).locator("[data-vehicle]")).toHaveCount(2);
  expect((await ofKind("vehicle")).map((r) => r.values).sort((a, b) => String(a.plate).localeCompare(String(b.plate)))).toEqual([
    { kind: "vehicle", plate: "BA123AB", model: "Škoda Octavia, grey", driver: "M. Novák", spotId: "spot-0" },
    { kind: "vehicle", plate: "TT456CD", model: "Kia Ceed", driver: "P. Horváth" },
  ]);

  // The same plate typed another way is the same plate.
  await add("BA-123 AB", "", "");
  await expect(dialog).toContainText(copy.errors.plateDuplicate);
  await page.keyboard.press("Escape");
  expect(await ofKind("vehicle")).toHaveLength(2);

  await vehicles(page).locator("#plate-lookup").fill("123 a");
  await expect(vehicles(page).locator("[data-lookup-result]")).toHaveText(copy.lookupFound.replace("{count}", "1"));
  await expect(vehicles(page).locator("[data-vehicle]")).toHaveCount(1);
  await expect(vehicles(page).locator("[data-vehicle]")).toContainText("M. Novák");
  await expect(vehicles(page).locator("[data-vehicle]")).toContainText(SPOTS[0]!.address);
  await vehicles(page).getByRole("button", { name: copy.showOnMap, exact: true }).click();
  await expect(map(page).locator('[data-selected-spot="spot-0"]')).toBeVisible();
  await expect(pin(page, "spot-0")).toHaveAttribute("aria-pressed", "true");
  await vehicles(page).locator("#plate-lookup").fill("zz 9");
  await expect(vehicles(page).locator("[data-lookup-result]")).toHaveText(copy.lookupNone);
  await vehicles(page).locator("#plate-lookup").fill("");

  // Edit, then delete.
  await vehicles(page).locator("[data-vehicle]").filter({ hasText: "TT456CD" }).getByRole("button", { name: copy.edit, exact: true }).click();
  await dialog.locator("#vehicle-driver").fill("P. Horváthová");
  await dialog.getByRole("button", { name: en.dataGrid.save, exact: true }).click();
  await expect(vehicles(page).locator("[data-vehicle]").filter({ hasText: "TT456CD" })).toContainText("P. Horváthová");
  await vehicles(page).locator("[data-vehicle]").filter({ hasText: "TT456CD" }).getByRole("button", { name: copy.edit, exact: true }).click();
  await dialog.getByRole("button", { name: en.dataGrid.delete, exact: true }).click();
  await dialog.getByRole("button", { name: en.dataGrid.confirmDeleteAction, exact: true }).click();
  await expect(vehicles(page).locator("[data-vehicle]")).toHaveCount(1);
  expect(await counter()).toBe(4);
});

test("editing a spot in the grid keeps its pin; removing it takes its reservations and frees its vehicles", async ({ page }, testInfo) => {
  await seed(true);
  await open(page);
  const grid = page.locator('[data-pattern="data-grid"]');
  const dialog = page.getByRole("dialog");
  const openSpot = async (address: string) => {
    if (testInfo.project.name === "mobile") await grid.locator("ul").getByRole("button", { name: new RegExp(address) }).click();
    else await grid.getByRole("row").filter({ hasText: address }).getByRole("button", { name: en.dataGrid.edit, exact: true }).click();
    await expect(dialog).toBeVisible();
  };
  // The heading counts spots, not everything in the sandbox.
  await expect(grid.getByRole("heading")).toContainText("(3)");

  await pin(page, "spot-0").click();
  await map(page).locator('[data-selected-spot="spot-0"]').getByRole("button", { name: copy.reserve, exact: true }).click();
  await reserve(page, { date: "2026-11-18", from: "08:00", to: "09:00" });
  await expect(dialog).toHaveCount(0);
  await vehicles(page).getByRole("button", { name: copy.addVehicle }).click();
  await dialog.locator("#vehicle-plate").fill("BA123AB");
  await dialog.locator("#vehicle-spotId").selectOption("spot-0");
  await dialog.getByRole("button", { name: en.dataGrid.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(grid.getByRole("heading")).toContainText("(3)");
  expect(await counter()).toBe(5);

  await openSpot(SPOTS[0]!.address);
  await dialog.locator("#field-status").selectOption("occupied");
  await dialog.getByRole("button", { name: en.dataGrid.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(pin(page, "spot-0")).toHaveAttribute("data-status", "occupied");
  const edited = (await ofKind(undefined)).find((r) => r.id === "spot-0")!.values;
  expect(edited).toMatchObject({ status: "occupied", lat: PLACES[0]!.lat, lng: PLACES[0]!.lng });

  await openSpot(SPOTS[0]!.address);
  await dialog.getByRole("button", { name: en.dataGrid.delete, exact: true }).click();
  await dialog.getByRole("button", { name: en.dataGrid.confirmDeleteAction, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(pin(page, "spot-0")).toHaveCount(0);
  await expect(reservations(page).locator("[data-reservation]")).toHaveCount(0);
  await expect(vehicles(page).locator("[data-vehicle]")).toContainText(copy.noSpot);
  expect(await ofKind("reservation")).toHaveLength(0);
  expect((await ofKind("vehicle")).map((r) => r.values)).toEqual([{ kind: "vehicle", plate: "BA123AB" }]);
  expect(await counter()).toBe(3);
});

test("on the Slovak page the three blocks speak Slovak", async ({ page }) => {
  await seed(true);
  await open(page, "/sk/dashboard");
  await expect(map(page).getByRole("heading", { level: 2 })).toHaveText(sk.parking.mapHeading);
  await expect(reservations(page).getByRole("heading", { level: 2 })).toContainText(sk.parking.reservationsHeading);
  await expect(vehicles(page).getByRole("heading", { level: 2 })).toContainText(sk.parking.vehiclesHeading);
  await expect(pin(page, "spot-1")).toHaveAttribute("aria-label", `${SPOTS[1]!.address} — ${sk.parking.status.occupied}`);
});
