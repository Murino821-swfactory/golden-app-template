# Reading Diary — OTH-25

Mobile-first, dark-only reading diary for primary-school pupils, EN default and SK
via next-intl. Only demo/reading-diary changes, never shared-template main.

## Prototype assumptions

The issue specifies no accounts, classes, pass mark, question bank or persistence.
Use this browser profile's local storage with explicit device/shared-profile notice
and JSON download. No pupil names, school IDs, telemetry or diary cloud uploads.
Open Library receives an explicit search query (title, author or ISBN); diary data
and answers stay on the device. No automatic catalogue requests or remote covers.

Three reviewed starter quizzes: The Little Prince (original story), Alice's Adventures
in Wonderland (Gutenberg ebook 11), The Wonderful Wizard of Oz (Gutenberg ebook 55).
All three answers must be correct, with retries. For other books require three written
content answers: character/action, problem/resolution, remembered scene/significance.
20–1,000 trimmed characters each. They are explicitly ungraded reflections, not
AI-verified proof of reading. A similar catalogue title never inherits an answer key.
The prototype client gate is not tamperproof school assessment or teacher approval.

Validate quiz evidence at append and storage boundaries, valid non-future finish date,
rating 1–5, unique book ID, maximum 200 entries. Wrong/incomplete quizzes cannot add.
View answers, delete with confirmation, download diary. No invented pupil records.
EN/SK share the diary. Storage corruption, denial, quota or stale tabs do not overwrite
existing data or report a save. Clearing browser data erases the diary.

## Publication and verification

Build with factory loadDemoEnv, slug reading-diary and base path
/newapp/reading-diary, origin https://apps.tokenwise.sk. Publish with publishPrototype
base-path, Firebase-bundle, upload and URL gates. out/task-release.json reports exact
product SHA. Verify served marker and HTML/JS against tested export and run deployed
browser smoke. Never expose the private source document ID or email in public assets.

Pure tests cover quiz types, catalogue validation, dates, duplicates, cap and storage.
Browser tests cover quiz blocking/retry/cancel, reflection, catalogue failures, reload,
EN/SK, answers, deletion, download, storage failures and mobile overflow. Retain shared
smoke/SEO/locale tests. Deterministic mocked catalogue tests are distinct from live
Open Library availability checks. Existing template dependency advisories are inherited;
this feature adds no dependencies.

## Delivery validation — 2026-10-04

Typecheck, lint, config validation and static production build passed with Next.js
16.3.8 and matching ESLint rules. The inherited critical next/og advisory is patched;
15 inherited high/moderate dependency advisories remain (no additional dependencies).
All preserved Playwright suites: 556 passed, 36 configuration-dependent skips, zero
failures, desktop and 390px mobile. Six pure domain/storage tests passed. Slovak
mobile diary and quiz screenshots inspected; no horizontal overflow, including 360px.
Real browser search for `Maly princ`: Open Library HTTP 200, 11 work results, first
`Le petit prince`. This is a live catalogue check, not an intercepted fixture.
Manifest/start URL/scope and vector app icon provide the PWA manifest baseline;
no offline support is claimed. Factory typecheck and 1,035 unit tests also passed.
