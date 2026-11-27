# @tokenwise/shared-ui

The one header of tokenwise.sk and of every prototype built from `golden-app-template`:
logo, nav, **Change colour** (30 palettes), **font** (10 faces), **button** (5 looks of the
page's action, 0.9.0), **image transparency** (the page's picture, 0 to 100 % in tens, 0.10.0),
**image veil** (the layer over the page's picture, on or off, 0.11.0), **language**, **cart** and
**user**. A change to the header is one PR here. Since 0.12.0 it also ships a project's **own
palette** (the customer's brand) beside the thirty.

Colour, font, button, language, cart and sign-in are icons with no visible words — a colour
wheel, `Aa`, a small action in the look on screen, a globe, a cart, a figure (founder decision
2026-09-28, 0.3.0; the globe 2026-11-25, 0.7.0 — it read `EN ▾` before; the button 0.9.0).
Each one's name is its `aria-label`, so a host's translations of `changeColourLabel`,
`changeFontLabel`, `changeButtonLabel`, `language` and `signIn` still matter. Colour, font and
the button's look step to the next one on a click; the globe opens a popup that lists
`languages` — each a link named in itself, the one on screen marked — and titles it with
`labels.language`. With fewer than two languages there is no globe at all.

Spec: sw-factory `docs/superpowers/specs/2026-09-25-shared-header-design.md`.
Decision: sw-factory `docs/decisions/shared-header-package.md`.

## What it is not

- No Firebase, no auth, no next-intl, no `@/` imports. The user and sign-out arrive as
  props — one component reaching for auth would join the sign-in of `tokenwise.sk` and
  `apps.tokenwise.sk`, which the origin split keeps apart. `test/package.test.ts` enforces it.
- No network. Fonts are self-hosted woff2 under `fonts/` (OFL); nothing loads from Google.
- No build. It ships TypeScript source; the consumer compiles it.

## Using it (every consumer, all three steps)

1. `next.config.ts`: `transpilePackages: ["@tokenwise/shared-ui"]`
2. `globals.css`:
   ```css
   @import "@tokenwise/shared-ui/styles.css";
   @source "<path to>/@tokenwise/shared-ui/src";   /* Tailwind 4 skips node_modules */
   :root {
     --shared-bg: …; --shared-ink: …; --shared-ink-muted: …;
     --shared-accent: …; --shared-rule: …; --shared-gutter: …;
   }
   @theme inline { --font-sans: var(--shared-font-sans); }
   ```
   Without `@source` the header renders unstyled and nothing fails.
3. Layout: `<html data-font="<default>" [data-scheme="<default>"] [data-button="<default>"]
   [data-image-transparency="0"] [data-image-veil="on"]>`, and
   `<ThemeBootstrap palettes? buttons? imageTransparency? imageVeil? />`
   as the **first child of `<body>`** — it applies a returning visitor's palette, appearance,
   font, button look, picture transparency and picture veil before the first paint. Put
   `suppressHydrationWarning` on `<html>`: the script changes those attributes (and the `.dark`
   class) before React hydrates, on purpose.
   **Dark and light (founder decision 2026-11-25: the dark-only rule is dropped).** With
   `palettes`, the stylesheet carries BOTH variants of every palette
   (`cssBlocksForBothAppearances()`): the dark rules as `html[data-scheme="x"]`, the light ones
   — the same deterministic rule mirrored, `rolesFor(id, "light")` — as
   `html[data-appearance="light"][data-scheme="x"]`. The host themes `<html>` for a first visit:
   dark is shadcn's `.dark` class and no mark, light is `data-appearance="light"` and no
   `.dark`. Pass the same side to `<Header appearance>` and the header shows the switch — in the
   bar from 1024px, in the menu below — which moves the mark and the class together and stores
   the choice (`localStorage` key `appearance`). Without `palettes` no stored appearance is
   applied: a host with one fixed look is never turned over by another app on its origin.

```tsx
<Header
  variant="prototype"              // landing | public | dashboard | admin | prototype
  siteOrigin="https://tokenwise.sk" // prototype: tokenwise.sk's nav, absolute to the site
  logo={{ href: "https://tokenwise.sk/", text: "tokenwise", accent: ".sk" }}
  palette="midnight-teal-ocean-mist" // omit: no palette switcher
  font="inter"                      // same id as <html data-font>
  appearance="dark"                 // the side <html> opens on; omit: no dark/light switch
  button="glow"                     // same id as <html data-button>; omit: no button switcher
  imageTransparency="0"             // same step as <html data-image-transparency>; omit: no control
  imageVeil="on"                    // same state as <html data-image-veil>; omit: no control
  languages={[{ code: "en", name: "English", href: "/", current: true }, …]}
  user={user /* HeaderUser | null | "loading"; omit for no accounts */}
  signInHref="/login"
  userMenuItems={[{ label: "Dashboard", href: "/dashboard" }]}
  onSignOut={signOut}
  labels={{ changeColour: "Zmeniť farbu", … }}   // English defaults otherwise
/>
```

Node code that needs only data (palettes, font table) imports
`@tokenwise/shared-ui/theming`, which carries no React.

## The looks of an action (0.9.0)

One button steps through five looks of the page's action — its CTA — the way **Change colour**
steps through the palettes (`src/theming/button-styles.ts`; the choice is stored under `button`,
as `html[data-button]`). A look is a character, not a corner radius: a surface, a depth, and its
own answer to the pointer and to the click.

| look | at rest | under the pointer | on the click |
|---|---|---|---|
| `glow` | a pill of the accent in a pool of its own light | the light spreads into an aura | a ripple from where it was pressed, a ring of light leaves the pill |
| `block` | a slab of the accent standing on a hard offset shadow | the slab stands higher | it is pushed down onto the shadow and springs back |
| `glass` | a frosted pane: the page blurred through it, light caught along its top | the pane thickens | a sheen crosses the pane |
| `orbit` | a dark capsule with a light running round its edge | the track lights up | the whole edge flares and a ring leaves it |
| `marker` | bare words on a stroke of marker pen | the stroke thickens | the stroke rises over the words like a highlighter |

A host opts in with all of:

1. `@import "@tokenwise/shared-ui/buttons.css";` — the looks, and the header's icon for each;
2. `<html data-button="<default>">` and `<ThemeBootstrap buttons />` (brings a returning
   visitor's look back before the first paint);
3. the header's `button` prop — the control, and the click's answer (below);
4. `data-cta` on its action.

A host that does none of it gets no control, no CSS and an untouched action.

**What a look may touch.** Surface, edge, depth, weight and motion — never the action's size or
padding, and never its `animation` (that is the host's: an entrance would play again). Every
colour is a `--shared-*` token or a mix of them, so a look repaints with the palette. Two
optional tokens join the host's side of the contract: `--shared-accent-ink` (the ink on the
accent) and `--shared-surface` (the raised plane the glass is made of); both fall back to
`--shared-bg`. Keyboard focus is an outline, which no look uses. All motion sits inside
`prefers-reduced-motion: no-preference`.

**The click** (`src/theming/action-press.ts`, installed by the header). An action is a link, and
a link leaves the page the moment it is clicked, so its animation would never be seen. A plain
click is therefore held for `PRESS_HOLD_MS` (260 ms): the action wears `data-pressed`, the look
answers, and the same click is then let through to the host's router or the browser. Never held:
a click with a modifier key or another button, a click something above already took, any click
under reduced motion. While installed, the document carries `html[data-shared-press]`.

Adding a look is one entry in `BUTTON_STYLES` and its rules in `buttons.css`.
`test/button-styles.test.ts` fails on a look without them, on a colour of its own and on an
animation outside the motion block; the template's `tests/button-style.spec.ts` holds every look
to WCAG AA on every palette, at rest and pressed.

## The picture's transparency (0.10.0)

One button makes the page's picture ten per cent more transparent on every click — 0, 10, … 100,
then 0 again (founder, 2026-11-25). Its icon is a picture in a frame that fades with the page's;
below 1024px it is a row of the menu, "Image transparency: 30 %". The step is
`html[data-image-transparency]` and `localStorage.imageTransparency`
(`IMAGE_TRANSPARENCY_STEPS`, `imageTransparencyStore`).

The package only steps and stores. **What fades is the host's**: it passes `imageTransparency`
to `<Header>`, puts the same step on `<html>`, turns `<ThemeBootstrap imageTransparency />` on,
and keys its own picture's rules by the attribute. The template lays that much of the page's
ground over the hero's film or still scene (`components/editorial/stage.css`). A host that
passes nothing has no control.

## The picture's veil (0.11.0)

One button takes the veil off the page's picture and lays it back — on, off, on (founder,
2026-11-26: "a configuration that turns the layer used today on and off; it does not touch the
transparency"). Its icon is a layer over a layer, struck through while the veil is off; below
1024px it is a row of the menu, "Image veil: On", right after the transparency's. The state is
`html[data-image-veil]` and `localStorage.imageVeil` (`IMAGE_VEIL_STATES`, `imageVeilStore`),
apart from the transparency's: neither control moves the other.

As with the transparency, the package only toggles and stores. **What the veil is, is the
host's**: it passes `imageVeil` to `<Header>`, puts the same state on `<html>`, turns
`<ThemeBootstrap imageVeil />` on, and keys its picture's rules by the attribute. The template's
veil is the gradient of the page's ground over the hero's film or still scene; off, only the
short fade where the picture runs into the page is left (`components/editorial/stage.css`).

## A project's own palette (0.12.0)

"Insert my brand" (founder, 2026-11-27): a palette read from the customer's own picture ships as
`html[data-scheme="brand"]` — dark and light — through the same rule and the same AA gate as the
thirty (`derivePaletteRoles`, `assertReadable`). `cssBlocksForBrand(colors)` returns the two CSS
rules (it throws, as the build does, on colours that cannot be made readable) and
`BRAND_SCHEME_ID` names the scheme. `<ThemeBootstrap brand={colors} />` ships them. A host that
passes nothing is unchanged; "Change colour" still cycles the thirty.

## Adding a font

One entry in `src/theming/font-families.ts`, then
`npm run fonts:fetch -w @tokenwise/shared-ui` (downloads `latin` + `latin-ext` woff2 and the
OFL licence, rewrites `fonts/manifest.json` and `styles.css`). Commit the result.

## Releasing

Every change under `src/`, `styles.css` or `fonts/` bumps `version` in `package.json`
**and** `src/version.ts` (CI refuses otherwise). Semver: changed props = major, new feature =
minor, fix = patch. Merging to `main` publishes the new version to npm
(`.github/workflows/publish-shared-ui.yml`, secret `NPM_TOKEN`).
