import { test, expect } from "@playwright/test";
import {
  cardIsEmpty,
  fullName,
  mapsHref,
  ownerActionsAvailable,
  parseOwnerCard,
  parseOwnerStatus,
  telHref,
} from "../lib/owner-contact";

test("telHref keeps only what a dialler understands", () => {
  expect(telHref("+421 900 123 456")).toBe("tel:+421900123456");
  expect(telHref("(02) 123/456-78")).toBe("tel:0212345678");
});

test("mapsHref encodes the address", () => {
  expect(mapsHref("Hlavná 1, Košice")).toBe("https://www.google.com/maps/search/?api=1&query=Hlavn%C3%A1%201%2C%20Ko%C5%A1ice");
});

test("parseOwnerCard keeps the five fields, non-empty strings only", () => {
  expect(parseOwnerCard({ firstName: "Jana", phone: "", email: 5, website: "x", address: "A 1" })).toEqual({
    firstName: "Jana",
    address: "A 1",
  });
  expect(parseOwnerCard(null)).toEqual({});
  expect(cardIsEmpty({})).toBe(true);
  expect(cardIsEmpty({ phone: "+421 900" })).toBe(false);
});

test("fullName joins what exists", () => {
  expect(fullName({ firstName: "Jana", lastName: "Nováková" })).toBe("Jana Nováková");
  expect(fullName({ lastName: "Nováková" })).toBe("Nováková");
  expect(fullName({ phone: "1" })).toBeNull();
});

test("parseOwnerStatus: a role or nothing", () => {
  expect(parseOwnerStatus({ role: null })).toBeNull();
  expect(parseOwnerStatus({ role: "owner", card: { firstName: "J" }, unreadMessages: 2 })).toEqual({
    role: "owner",
    card: { firstName: "J" },
    unreadMessages: 2,
  });
  expect(parseOwnerStatus({ role: "admin", unreadMessages: -1 })?.unreadMessages).toBe(0);
});

test("owner actions exist only on a published prototype with a slug", () => {
  expect(ownerActionsAvailable("/newapp/unbroken", "unbroken")).toBe(true);
  expect(ownerActionsAvailable("", "unbroken")).toBe(false);
  expect(ownerActionsAvailable("/demo/golden", "golden")).toBe(false);
  expect(ownerActionsAvailable("/newapp/unbroken", null)).toBe(false);
});
