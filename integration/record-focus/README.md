# OTH-329 record dialog focus restoration

Run from the repository root with Java, Chromium (`npx playwright install chromium`)
and Firestore emulator v1.19.8 installed by Firebase CLI:

```sh
FACTORY_FIRESTORE_RULES=/path/to/factory-web/firestore.rules npm run test:record-focus:emulator
```

`FIRESTORE_EMULATOR_JAR` overrides the default Firebase cache jar. Ports 3188 (browser
fixture) and 8788 (Firestore) must be free. The runner starts and stops its own emulator
using project `rules-test`. All data is synthetic, all SDK and administrative seed/read
requests stay on loopback, and no credentials or production writes are needed. Rules
remain owned by factory-web; this fixture neither copies nor changes them.

The fixture bundles the real dashboard, header, grid, board, record dialog, record hooks,
Firestore writes, locale bundles and application CSS. It parses the full config fixture,
adding DE with the synthetic English customer content and real German chrome. A shared,
stable synthetic AuthProvider and emulator mock visitor token replace Google OAuth.
Next routing/images use native adapters; the unrelated map is an empty section to avoid
third-party tile traffic. A bounded read gate can delay `getDocs` during refresh, while
the eventual SDK read and every record write remain real. This client integration
fixture supplements the static-export browser suite.

The focus policy is:

- Escape, Cancel and successful edits restore the originating control, resolving its
  record id again if a refresh remounted it.
- If that record disappears, restore the next surviving record in the displayed order
  captured at opening, then the previous surviving record, then Add. Hidden responsive
  copies are excluded.
- Add closes back to Add. If Add becomes disabled at the 200-record limit, restore Search.
- Restoration runs through Radix's close-autofocus event and waits for a pending record
  refresh to finish. The shared dialog's containment and default opening behavior stay intact.

The 30 Chromium cases cover `/dashboard`, `/sk/dashboard` and `/de/dashboard`, each at
1280×800 and 390×844: board/table/mobile-row openers, Escape/Cancel, Tab and Shift+Tab
containment, continuation to the next record after closing, edit/create persistence,
required validation, next/previous/Add deletion fallbacks, the final allowed create and
persisted record limit, board view persistence, and delayed refresh with an edited record
filtered out of Search. A zero counter after deletion stays empty on reload.

Test-first evidence (2026-10-24): before changing production code, the EN desktop board
case failed at `closedAt` after Escape: the existing card was visible but inactive instead
of focused. Focus entry and both Tab containment loops passed before that failure.
Local rules source: factory-web rules commit `28ca4669a13e63195a015584a393b07d75b54f76`.

Local validation on the repaired tree:

- `npm run test:record-focus:emulator` with the rules path above: 30 passed.
- `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- `npm run test:packages`: 24 passed.
- Static export served with `npm run preview`, then
  `PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e -- --workers=2 --reporter=line`:
  677 passed, 19 existing config-dependent skips. An initial landing-anchor visibility
  failure passed its targeted three-case recheck and the final full run; baseline tests
  were unchanged.
- `git diff --check`: passed.

Fixture traces use `playwright/.cache/record-focus` to avoid collisions with the
static-export suite's output cleanup when both suites run concurrently.
