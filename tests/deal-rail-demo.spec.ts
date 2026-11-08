import { test, expect } from "@playwright/test";
import { checklistTemplate, SALE_STAGES } from "../lib/realestate/model";
import { railStations } from "../lib/realestate/deal-rail-demo";

/**
 * The landing's deal rail demo (T-384, from the T-344 v3 redesign): the workspace's own sale rail and checklist,
 * station by station, ending at the keys. Pure, no browser.
 */
test.describe("landing deal rail demo (pure)", () => {
  test("six stations from the offer to the handover, in the workspace's order", () => {
    expect(railStations().map((s) => s.stage)).toEqual(SALE_STAGES.filter((s) => s !== "closed"));
  });

  test("every station carries exactly its own checklist items, and the rail ends with the keys", () => {
    const stations = railStations();
    for (const station of stations) {
      expect(station.items).toEqual(checklistTemplate("sale").filter((i) => i.stage === station.stage).map((i) => i.key));
      expect(station.items.length).toBeGreaterThan(0);
    }
    expect(stations.at(-1)!.items.at(-1)).toBe("keysHanded");
  });
});
