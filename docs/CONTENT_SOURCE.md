# Content item source — repository, video, image, sound, Markdown or link

**Branch:** `demo/gitpulse-studio` only (2026-10-25). Live at
`apps.tokenwise.sk/newapp/gitpulse-studio/dashboard` after a republish.

A content item in the dashboard grid (*Content Item records*) used to take a repository as
free text. Its source field (label **Source** / **Zdroj**, key `repository`) is now a picker
built for the phone — 80 % of visitors add content from one:

| Tile | Input | Stored in `values.repository` |
|---|---|---|
| Repository | text, `owner/name` | the text (records from before keep working) |
| Video | file — camera or gallery, MP4/MOV/WebM ≤ 100 MB | `video:<uploadId>/<name>` |
| Image | file — camera or gallery, JPEG/PNG/HEIC/WebP/GIF/AVIF ≤ 20 MB (no SVG) | `image:<uploadId>/<name>` |
| Sound | file, MP3/M4A/AAC/WAV/OGG/Opus/FLAC/AMR ≤ 25 MB | `audio:<uploadId>/<name>` |
| Markdown | file, `.md`/`.markdown` ≤ 1 MB (Android's `application/octet-stream` is fine) | `markdown:<uploadId>/<name>` |
| Link | `https://…` URL | the URL |

The value stays one `text` field (≤ 200 characters), so search, sort, the board, coercion and
factory-web's Firestore rules see nothing new.

## How it works

- **Tiles → one input.** Six radio tiles (3 × 2, the whole tile is the radio); each tile keeps
  its own draft, so switching loses nothing. A picked file is checked at once (type and size)
  and previewed from the device: image, video player, audio player, the first lines of Markdown.
- **Upload on Save.** The record dialog validates the value the field *will* store, then
  uploads (resumable, progress bar, cancelled if the dialog closes), then writes the record.
  If the record write fails, the new file is deleted. An unreachable bucket (no bucket, dead
  connection) fails the save after ~1 minute (`STORAGE_RETRY_MS`) — the SDK's default retried
  for ~17 minutes at "Uploading 0 %" (seen live 2026-10-26, before the bucket existed). Replacing a file uploads a new one and
  deletes the old one after the record is saved; deleting the record deletes its file.
- **Where the bytes live.** Firebase Storage, default bucket of `sw-factory-d4ac5`
  (`sw-factory-d4ac5.firebasestorage.app` — the bucket prototypes are built with):
  `demos/<slug>/users/<uid>/uploads/<uploadId>/<name>`, the visitor's own sandbox.
  factory-web `storage.rules` allow only the signed-in owner (verified e-mail) to create —
  never overwrite — and delete; the owner and the founder read. The allowlist and caps are
  repeated in `lib/gitpulse/source.ts`: **change one, change both.**
- **Mobile first.** The record dialog is a bottom sheet with a sticky Save bar that covers
  the home indicator, so Save is on screen however long the form grows.

## Code

| File | What |
|---|---|
| `lib/gitpulse/source.ts` | Pure: kinds, encode/parse, allowlists and caps, safe names, storage path |
| `lib/gitpulse/source-storage.ts` | The only Firebase Storage code (upload, URL, delete); imported on demand |
| `components/gitpulse/source-field.tsx` | The picker (`sourceWidget`: input, cell, commit, release) |
| `components/patterns/data-grid/widgets.ts`, `widget-types.ts`, `field-value.tsx` | Field-widget hook in the generic grid (branch-only; upstream candidate) |
| `components/patterns/data-grid/record-dialog.tsx` | Widget lifecycle: draft → validate → commit (upload) → save → release; sticky Save bar |
| `lib/gitpulse/copy.ts` → `source` | EN + CS copy |

## Tests

- `tests/content-source-logic.spec.ts` — pure logic (part of the static-export suite).
- `integration/content-source/` — the real dashboard, grid, dialog and picker against the
  Firestore **and** Storage emulators running factory-web's real rules, at 390 × 844 and
  1280 × 800 (upload of each kind, bad link, refused SVG, empty source, replace frees the old
  file, delete frees the last, record from before opens as a repository, Czech tiles):

  ```sh
  FACTORY_FIRESTORE_RULES=/path/to/factory-web/firestore.rules \
  FACTORY_STORAGE_RULES=/path/to/factory-web/storage.rules \
  npm run test:content-source:emulator
  ```

  Needs the Firebase CLI on `PATH` (or `FIREBASE_BIN`) and Java; ports 3189, 8789, 9189,
  4489, 4589 free. Rules are never copied into this repository.

## Known limits

- Rules cannot count a visitor's files: the per-file caps and Google sign-in bound abuse;
  a file whose record write failed *and* whose cleanup failed stays as an orphan.
- An image in HEIC previews only in Safari (the file uploads everywhere).
- A stored Markdown file has no inline preview when editing (reading it back would need
  bucket CORS); it opens via **Open**.
- No publish flow reads these files yet — they are the queue's raw material.
