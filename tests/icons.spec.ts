import { test, expect } from "@playwright/test";
import { ICON_IDS } from "../lib/prototype-config";
import { ICONS } from "../lib/icons";

test("every icon id the schema offers resolves to a Lucide component, and nothing else is mapped", () => {
  expect(Object.keys(ICONS).sort()).toEqual([...ICON_IDS].sort());
  for (const id of ICON_IDS) expect(ICONS[id], id).toBeTruthy();
});
