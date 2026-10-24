# GitPulse Studio — the landing page (`/`)

**Branch:** `demo/gitpulse-studio` · **Live:** https://apps.tokenwise.sk/newapp/gitpulse-studio
(`/cs` in Czech) · **Since:** 2026-10-23 · **Reference:** the Indoobit case study on
[mdx.so](https://mdx.so/projects/indoobit/?id=3070) (MDX, April 2026) — the founder's
chosen model for "modern" landing pages.

The template's landing is a story of chapters on a sticky stage. This demo's landing is one
long editorial document in the order of the Indoobit page, with the same five sections the
config declares (`hero`, `features`, `howItWorks`, `faq`, `cta`) rendered by this branch's own
components in `components/landing/` and spread over the template's `SECTION_REGISTRY` in
`app/[locale]/page.tsx`. The shared `components/sections/*` stay as `main` ships them, so a
template refresh (`npm run prototypes:refresh` on the VM) merges past this design.

## What is on the page, and where it comes from

| Section | Indoobit element it follows | Words from | Facts shown |
|---|---|---|---|
| **Hero** | eyebrow pill between hairlines, light headline, one action (the template allows exactly one next step — `tests/landing-action.spec.ts`; Indoobit's second "Learn more" is the fold-cut studio below), the product's dashboard rising from the fold | `content.<locale>.landing.headline/subheadline`, `cta.label`; eyebrow in `lib/landing/copy.ts` | the studio preview (`components/landing/studio-preview.tsx`): the factory's record totals (`lib/studio/record-data.ts`), the live-projects snapshot (`lib/studio/projects.ts`), the five destinations (`lib/studio/channels.ts`), the projects caption (`lib/studio/scenarios.ts`). Nothing fetched, nothing invented. |
| **Features** | "Value across the board" bento with 01/02/03 numerals, then the concept gallery, then "The manifesto" | `landing.featuresHeading`, `landing.features[]` (Lucide icons); gallery kicker/title and manifesto in `lib/landing/copy.ts` | six cards: 2+1 / 1+2 / 2+1 (`bentoSpan`); **gallery** (`components/landing/gallery.tsx`, `lib/landing/gallery.ts`): six live apps as 1200 × 750 WebP screenshots of the real sites (`public/landing/`, 2026-10-24), names/descriptions/addresses from the studio's projects snapshot, each card a link to the app; **manifesto** split into words (`[data-word]`) |
| **How it works** | the glowing line through the steps, ticks hanging from it | `landing.howItWorks` | SVG path in `--primary`, drawn by scroll (`animation-timeline: view()`), fully drawn where unsupported or motion is reduced; a vertical hairline on a phone |
| **FAQ** | question cards with a plus that becomes a cross | `landing.faq` | native `<details>` + FAQPage JSON-LD, as in the template |
| **Closing band + wordmark** | the CTA band, then the giant "indoobit" wordmark | `cta.title/subtitle/label` | wordmark = `appName`, `aria-hidden` (the footer names the app); whole above the footer, dissolving at its foot — cut by the section edge it read as the footer overlapping the page (founder, 2026-10-24) |

`patterns.landing.presentation` is `document` (long-form), so the story stage never engages;
`tests/landing-story.spec.ts` skips its stage tests accordingly.

## Design rules kept

- **Palette tokens only.** Every glow, hairline and gradient is `color-mix()` over `--primary`,
  `--background`, `--card`, `--border` (`app/landing.css`), so "Change colour" in the header
  repaints the whole page. Indoobit's gold-on-black is not copied — the pair the owner picked is.
  Fonts follow the header's font switcher the same way.
- **Dark only, mobile first.** Indoobit's light/dark toggle is deliberately absent (golden rule 3).
  At 390 px nothing scrolls sideways (`tests/gitpulse-landing.spec.ts`); the publish bar comes
  first inside the fold-cut preview, because it is the promise.
- **No invented proof.** No logo strip ("Logoipsum" in the reference), no reviews, no prices,
  no made-up dashboard figures: the preview shows the real record and the real project list
  (sw-factory memory "customer claims limits").
- **Motion degrades to the finished state.** Everything sits behind `prefers-reduced-motion`;
  the scroll-driven part also behind `@supports (animation-timeline: view()) and
  (animation-range: entry 0% entry 40%)` — a browser that knows the timeline but not the
  range maps the whole pass to the animation and fades sections out as they leave (seen on the
  founder's screenshot, 2026-10-24). Decorative wrappers use `overflow: clip`, never `hidden`
  — a hidden overflow is a scroll container and would become the timeline's root, leaving the
  content at opacity 0. No `scroll-behavior: smooth`: Chromium drops a hash set during a
  running smooth scroll, and the template's anchors test walks the sections by hash.

## Motion (2026-10-24, founder: "wow for the customer, everything driven by scroll")

Two kinds, all CSS, no JavaScript, no library (`app/landing.css`):

| Where | On load (time) | On scroll (`animation-timeline`) |
|---|---|---|
| Hero | eyebrow → headline → subheadline → button → studio enter in turn (`.landing-enter`, nth-child delays) | copy drifts up and fades (`scroll(root)`, 0–600 px); the studio tilts from `rotateX(11deg)` flat as it rises (0–520 px); the film parallaxes at half speed (0–900 px) |
| Bento, steps, FAQ cards, band | — | rise on entry, siblings staggered by `--i` (`[data-reveal]`) |
| Gallery | — | ≥ 1024 px: the block is 300 svh tall, the pin sticks for two screens and the strip slides `translateX(-100% + 100cqw)` over the `contain` range of its named view timeline; otherwise a horizontal snap strip |
| How it works | — | the line draws itself (`stroke-dashoffset`, `entry 10% → cover 55%`) |
| Manifesto | — | each word lights up in turn (`view-timeline-name: --manifesto`, per-word `animation-range` by `--i`) |
| Wordmark | — | grows into place over its entry |

Scroll-driven animations run on the compositor (transform/opacity only), so a phone pays
nothing for them. The still frame a thumbnail or reduced-motion reader sees is the finished
state (`tests/gitpulse-landing.spec.ts`: words and reveals at opacity 1 under reduced motion).
- **Contract with the template's tests.** `id` + `data-section` per section with `scroll-mt-24`
  (stable anchors, OTH-144) and their order, `[data-app-name]`
  (the studio window's title), one `h2` per section, one `svg` per feature with an icon,
  `li` per step, `details` per question, the CTA link named `cta.label`.

## Copy (2026-10-23, EN + CS in `prototype.config.json`)

Written with the copywriting skill: one idea per section, customer language, specific over
vague, no exclamation marks, no claims the product cannot show. Headline "Ship code. Publish
the story." / "Pište kód. Publikujte příběh."; features say what a week of commits becomes;
the four steps start with a verb; the FAQ answers the six questions a visitor asks before
opening the studio (sign-in, own repository, source of content, posting on their behalf, cost,
ownership). Limits of the production copy gate are respected (steps ≤ 40/140, FAQ ≤ 120/400,
headings ≤ 60, CTA ≤ 60/140, description ≤ 160).

## Tests

`tests/gitpulse-landing.spec.ts` — document mode, the hero's eyebrow and single action, the
preview's figures/projects/destinations, the bento's wide card and numerals, the gallery (six
pictures that load, link out and swipe inside their strip on a phone), the manifesto split
into words yet read whole without motion, the glow line, FAQ cards opening, the wordmark whole
above the footer, Czech words, 390 px width, and the EN/CS copy having the same keys. The shared suites (`smoke`, `landing-v2`, `landing-story`, `seo`,
`locale`) keep guarding the contract above.
