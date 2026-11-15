# T-430 parking register — emulator scenarios

The parking prototype's three features (spots on the map, reservations without overlaps,
the vehicle / licence plate register) exercised as a signed-in visitor uses them: the real
dashboard, this prototype's real `prototype.config.json`, the Firestore emulator and
**factory-web's real rules** (never copied here). Run from the repository root with Java and
the Firestore emulator v1.19.8 (Firebase CLI cache):

```sh
FACTORY_FIRESTORE_RULES=/path/to/factory-web/firestore.rules \
  npx playwright test -c integration/parking/playwright.config.ts
```

Ports 3190 (fixture) and 8790 (emulator) must be free. The fixture replaces Google sign-in
with one synthetic visitor (emulator mock token), Next's router/link with native adapters and
the CARTO base map with an empty style, so every request stays on loopback. The clock is
fixed to Monday 2026-11-16 09:30 Europe/Bratislava.

Scenarios (desktop 1280×800 and phone 390×844): first visit seeds the samples with pins;
placing an unplaced spot by tap and by "Use the centre of the map"; reserving from a pin,
an overlapping window refused with the reservation in the way named, a past window refused,
cancelling; a running reservation turning the pin, the legend and the KPI cards "Reserved"
without touching the stored spot; vehicles registered once per plate however it is typed,
found from any part of it and leading to their spot on the map; a grid edit keeping the pin;
removing a spot deleting its reservations and freeing its vehicles (every write a separate
batch the rules' counter accepts); the Slovak page.

Pure rules: `tests/parking-logic.spec.ts` (runs in the static-export suite, no browser needed).
