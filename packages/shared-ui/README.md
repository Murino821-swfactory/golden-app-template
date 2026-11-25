# @tokenwise/shared-ui

The one header of tokenwise.sk and of every prototype built from `golden-app-template`:
logo, nav, **Change colour** (30 palettes), **font** (10 faces), **button** (5 looks of the
page's action, 0.7.0), **language**, **cart** and **user**. A change to the header is one PR
here.

Colour, font, button, cart and sign-in are icons with no visible words — a colour wheel,
`Aa`, a small action in the look on screen, a cart, a figure (founder decision 2026-09-28,
0.3.0). Each one's name is its `aria-label`, so a host's translations of `changeColourLabel`,
`changeFontLabel`, `changeButtonLabel` and `signIn` still matter.

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
3. Layout: `<html data-font="<default>" [data-scheme="<default>"] [data-button="<default>"]>`,
   and `<ThemeBootstrap palettes? buttons? appearance? />` as the **first child of `<body>`** —
   it applies a returning visitor's palette, font and button look before the first paint. Put
   `suppressHydrationWarning` on `<html>`: the script changes those attributes before React
   hydrates, on purpose.
   `appearance` (`"dark"` default | `"light"`, T-400) is the project's build-time variant, a
   paid add-on: the same deterministic rule derives a LIGHT counterpart of every palette
   (`cssBlocksForAll("light")`, `rolesFor(id, "light")`). It is NOT a visitor toggle — a build
   ships one variant — so the host also drops shadcn's `.dark` class on `<html>` for light.

```tsx
<Header
  variant="prototype"              // landing | public | dashboard | admin | prototype
  siteOrigin="https://tokenwise.sk" // prototype: tokenwise.sk's nav, absolute to the site
  logo={{ href: "https://tokenwise.sk/", text: "tokenwise", accent: ".sk" }}
  palette="midnight-teal-ocean-mist" // omit: no palette switcher
  font="inter"                      // same id as <html data-font>
  button="pill"                     // same id as <html data-button>; omit: no button switcher
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

## The looks of an action (0.7.0)

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

## Adding a font

One entry in `src/theming/font-families.ts`, then
`npm run fonts:fetch -w @tokenwise/shared-ui` (downloads `latin` + `latin-ext` woff2 and the
OFL licence, rewrites `fonts/manifest.json` and `styles.css`). Commit the result.

## Releasing

Every change under `src/`, `styles.css` or `fonts/` bumps `version` in `package.json`
**and** `src/version.ts` (CI refuses otherwise). Semver: changed props = major, new feature =
minor, fix = patch. Merging to `main` publishes the new version to npm
(`.github/workflows/publish-shared-ui.yml`, secret `NPM_TOKEN`).
