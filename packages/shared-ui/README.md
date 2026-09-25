# @tokenwise/shared-ui

The one header of tokenwise.sk and of every prototype built from `golden-app-template`:
logo, nav, **Change colour** (15 palettes), **font** (10 faces), **language**, **cart**
and **user**. A change to the header is one PR here.

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
3. Layout: `<html data-font="<default>" [data-scheme="<default>"]>`, and
   `<ThemeBootstrap palettes? />` as the **first child of `<body>`** — it applies a returning
   visitor's palette and font before the first paint.

```tsx
<Header
  variant="prototype"              // landing | public | dashboard | admin | prototype
  logo={{ href: "/", text: "My App" }}
  palette="midnight-teal-ocean-mist" // omit: no palette switcher
  font="inter"                      // same id as <html data-font>
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

## Adding a font

One entry in `src/theming/font-families.ts`, then
`npm run fonts:fetch -w @tokenwise/shared-ui` (downloads `latin` + `latin-ext` woff2 and the
OFL licence, rewrites `fonts/manifest.json` and `styles.css`). Commit the result.

## Releasing

Every change under `src/`, `styles.css` or `fonts/` bumps `version` in `package.json`
**and** `src/version.ts` (CI refuses otherwise). Semver: changed props = major, new feature =
minor, fix = patch. Merging to `main` publishes the new version to npm
(`.github/workflows/publish-shared-ui.yml`, secret `NPM_TOKEN`).
