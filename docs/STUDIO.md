# GitPulse Studio — the studio (`/studio`)

**Branch:** `demo/gitpulse-studio` · **Live:** https://apps.tokenwise.sk/newapp/gitpulse-studio/studio
(`/cs/studio` in Czech) · **Since:** 2026-10-16

GitPulse Studio's promise is "your commits become content". The studio is where that happens
for the three stories tokenwise.sk tells and changes every week — the same three sections
`tokenwise.sk/projects` and `tokenwise.sk/how-it-works` show — each with buttons that
publish it on tokenwise.sk, Facebook, Instagram, TikTok and YouTube.

## The three scenes

| Scene | Source | What it shows |
|---|---|---|
| **Live projects** | Firestore `projects` (`publicVisible` + `active`), the same query as tokenwise.sk/projects; bundled snapshot of 2026-10-16 while loading or when Firebase is absent | Every production app, most liked first: name, one line, creator / owner, likes, link. Figures: projects, likes, owners, newest. |
| **Git history** | The factory's record (fifteen eras from `tokenwise.sk/how-it-works`, bundled in `lib/studio/record-data.ts`) **or** any *public* GitHub repository read from the REST API on a click (up to 300 newest commits, cached 15 min in the browser) | Eras sorted by commits (toggle: in order), or weekly digests of the repository, busiest week first. |
| **Ship it** | Pure game rules in `lib/studio/ship-it.ts`, a 2D port of the WebGL game on `/how-it-works` | White cubes = tasks, red = defects, falling towards the pipeline (Linear → … → Prod). Tap a task: it rides the line and ships. Tap a defect: squashed. Missed / escaped count against you. Levels speed it up. Personal best in `localStorage`. **Record a 15 s clip** (`MediaRecorder` on the canvas) for TikTok / YouTube. |

## The publish bar

Five destinations, fixed by the owner:

| Destination | Image | Caption limit | Desktop route |
|---|---|---|---|
| tokenwise.sk | 1200 × 630 | 5 000 | Markdown article `.md` + image saved, article on the clipboard, https://tokenwise.sk/ opened |
| Facebook `@tokenwisefactory` | 1200 × 630 | 2 000 | Share dialog (`sharer.php?u=<page>`) opened, image saved, caption copied |
| Instagram `@tokenwisefactory` | 1080 × 1080 | 2 200 | Profile opened, image saved, caption copied |
| TikTok `@tokenwisefactory` | 1080 × 1920 | 2 200 | Profile opened, image (+ clip) saved, caption copied |
| YouTube `@tokenwisefactory` | 1280 × 720 | 5 000 (title 100) | Channel opened, thumbnail (+ clip) saved, description copied |

On a phone (coarse pointer + `navigator.canShare({files})`) the **share sheet** opens with the
files attached, so Instagram, TikTok and YouTube appear as targets directly.

Why not post through the networks' APIs: every one of them needs a server-side token; a
static prototype holds no secrets (Golden Security) and the factory's Meta token lives in
Secret Manager for `social-publish.ts`, not in a public page. The bar does everything a
browser can do honestly inside one click: the card is rendered *before* the click
(`renderCard`, a canvas → PNG), and `window.open` runs before the first `await`, or the
browser would block it.

Every publish is logged in the browser (`gitpulse.publish-log.v1`, newest first, 50 kept). A
**signed-in owner** also gets it as a record in the content queue — the dashboard's data
grid (`type` = Blog / Facebook / Instagram / TikTok / YouTube, `status` = Published).

## Where the code is

```
lib/studio/
  ship-it.ts       game rules (pure)           record.ts        eras + GitHub weekly digest
  record-data.ts   the bundled record          projects.ts      Firestore read + snapshot
  channels.ts      the five channels, captions scenarios.ts     scene data → ScenarioContent
  render-card.ts   canvas → PNG                publish.ts       share / download / open + log
  copy.ts          EN + CS                     client-store.ts  browser-only values, hydration-safe
components/studio/
  studio.tsx (tabs + log)  projects-scene.tsx  history-scene.tsx  game-scene.tsx  publish-bar.tsx
  studio-link.tsx (dashboard door)  ui.tsx
app/[locale]/studio/ + app/(default)/studio/   routes, per-language metadata
tests/studio-logic.spec.ts (rules)  tests/studio.spec.ts (the page, desktop + mobile)
```

Template files touched: `prototype.config.json` (CTA → `/studio`, features, queue options),
`app/[locale]/dashboard/page.tsx` (one `<StudioLink />`). On a template refresh with
conflicts, keep this branch's side of those two.

## Demo script (3 minutes)

1. Open `/studio`. **Live projects** opens on the real list from Firestore (badge "Live from
   Firestore"); scroll the cards, note the figures.
2. **Git history**: the eras are already sorted by commits — XV (179) first. Switch to
   *In order*. Switch to *A public repository*, keep `Murino821-swfactory/golden-app-template`,
   *Read commits*: weekly digests, busiest first.
3. **Ship it**: tap white cubes (they ride the line and ship), tap red ones (squashed). Let
   one red through: "Escaped". *Record a 15 s clip*.
4. Publish bar: pick **Instagram** — the preview is square, the caption within 2 200. Pick
   **TikTok** — portrait, "+ clip". Press *Publish on TikTok* (desktop: profile opens,
   files saved, caption copied; phone: share sheet). The receipt appears under
   *Published this session*.
5. Sign in → the dashboard grid holds the same publish as a content item.

## Republish

After the merge (merge commit, never squash — `prototypes:refresh` walks the history):
`npm run prototypes:refresh -- --republish --only gitpulse-studio` on the VM.
