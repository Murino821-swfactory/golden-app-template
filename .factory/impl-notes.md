All keys are present and symmetric across the interface, EN, and SK. The implementation is complete.

## Changes
- `lib/cv-file-parser.ts` (NEW): Browser-only CV reader. Pure, testable guards (`isAcceptedCvFile`, `rejectionFor`, `MAX_CV_FILE_BYTES`, `CV_FILE_ACCEPT`, `ACCEPTED_CV_MIME`) plus `parseCvFile()`, which validates type/size then dynamically imports `pdfjs-dist` (PDF) or `mammoth` browser bundle (DOC/DOCX) — nothing is uploaded. All failures surface as a typed `CvParseError` (`type`/`size`/`read`/`empty`) the UI maps to copy; raw stack traces never reach the user.
- `components/features/cv-import.tsx` (NEW): `CvInputPanel` (CV textarea + Upload/LinkedIn buttons + inline `role="alert"` error + polite status live region), `CvImportDropzone` (drag-and-drop over the textarea with valid/invalid feedback), and `LinkedInImportDialog` (guided "Save to PDF" export flow, reusing the same parser). Dark tokens only, ≥44px touch targets, `prefers-reduced-motion` honored, hidden file inputs wired for a11y + Playwright.
- `components/features/cv-matcher.tsx`: Replaced the CV `TextPanel` with `CvInputPanel`, added shared import state (`importLoading`/`importError`/`importStatus`/`linkedInOpen`), the `importFile` handler, a 6s error auto-dismiss, and mounted `LinkedInImportDialog`. Job panel untouched; live analysis re-runs automatically when imported text populates `cv`.
- `lib/cv-matcher-copy.ts`: Added 18 import-related strings to the `Copy` interface, fully translated in EN and SK.
- `types/mammoth-browser.d.ts` (NEW): Minimal declaration for mammoth's untyped browser bundle.
- `tests/cv-import.spec.ts` (NEW): Unit coverage of the type/size guards and `parseCvFile` rejection paths (no heavy reader loaded).
- `tests/cv-matcher.spec.ts`: Added E2E tests — import controls present, LinkedIn dialog opens/closes with its steps, and an unsupported file shows the specific type error without touching the CV box.
- `package.json`: Added `pdfjs-dist@^4.10.38` and `mammoth@^1.9.0` (both dynamic-imported, browser-safe, static-export compatible).

## Deploy Components
- hosting: true
- firestore-rules: false
- firestore-indexes: false
- functions: false

## Notes
- **New deps**: `pdfjs-dist` and `mammoth` — the harness will `npm install`. Both are loaded via `await import()` so they stay out of the initial bundle and the static export (`output: 'export'`) is preserved.
- **pdf.js worker**: configured via `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` (self-hosted, no CDN — Golden Stack rule 4). This is the documented v4 pattern; if the worker ever fails to load at runtime it's caught and shown as a friendly `importError`, never a crash.
- **E2E scope**: success-path PDF/DOCX extraction is intentionally not asserted in E2E (hand-crafting a valid parseable binary in CI is fragile and would couple the gate to library internals). The tests instead cover the user-facing flows and the validation/error paths, which are deterministic. Parser validation logic is unit-tested directly.
- **LinkedIn**: no API/scraping (CORS + static export make it impossible). The dialog guides the user through LinkedIn's native "Save to PDF" and ingests that PDF with the same parser — the only viable backend-free approach.