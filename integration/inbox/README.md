# OTH-277 inbox persistence regression

Run from the repository root, with Java, Chromium (`npx playwright install chromium`) and
Firestore emulator v1.19.8 installed by Firebase CLI:

```sh
FACTORY_FIRESTORE_RULES=/path/to/factory-web/firestore.rules npm run test:inbox:emulator
```

`FIRESTORE_EMULATOR_JAR` can override the default Firebase cache jar path. Ports 3187
(browser fixture) and 8787 (Firestore) must be free. The runner starts and stops its own
emulator using project `rules-test`; all SDK traffic and admin seed/inspection requests
stay on loopback. No credentials, customer records, deployed endpoint or rules copy are
required. Rules remain owned by factory-web.

This fixture bundles the actual messages page, `useInbox`, message parsing, UI components,
locale bundles and compiled application CSS. It supplies a synthetic owner gate and a
native back link in place of Next routing. It uses the full config fixture with EN/SK/DE
routing declarations (German customer content reuses the synthetic English content;
German inbox chrome uses the real German bundle). This is an isolated client integration
test, not a replacement for the static-export browser suite.

The SDK connects using an emulator mock owner token. Permission denial is real: after the
inbox loads, only the owner's email in the emulator changes. `unavailable` is a rejected
write injected at the SDK adapter; the hook and UI run unchanged. A deferred write checks
that unread remains visible until acknowledgement and reopening cannot duplicate the
pending write.

The 18 cases cover EN/SK/DE at 1280×800 and 390×844: native keyboard summary activation,
message preservation, nonempty localized alert and retry, unchanged persisted `readAt`
on rejection, retry recovery, permitted writes surviving reload and horizontal overflow.
The existing header, font, language and sign-in baseline tests are unchanged.

Test-first evidence (2026-10-19): before changing production code, the EN desktop
permission-denied regression failed because `getByRole("alert")` found no element after
the emulator denied the write; the original page had silently removed its unread badge.
After the repair, all 18 cases passed. Local rules source:
`factory-web` rules commit `2776e1a42acf1578637f0ae37458e24a6d7d1e1f`.

Additional local validation on the repaired tree:

- `npm run typecheck` and `npm run lint` passed.
- `npm run test:packages` passed (24 package tests).
- `npm run build` passed (production static export).
- `PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e -- --workers=4 --reporter=line`
  passed: 659 tests; 19 existing config-dependent skips on the default config.
- `git diff --check` passed.
