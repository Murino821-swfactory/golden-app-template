# CLAUDE.md — [PROJECT_NAME]

Context file for AI agents. Replace [PROJECT_NAME] with actual name after adoption.

See also: `@AGENTS.md` (Next.js 16 breaking-change notice, auto-maintained by `next dev`).

## What this project is

[1-2 sentence description of the project purpose and target users]

This repo (`golden-app-template`) is itself the Golden Stack starter template —
until a concrete project adopts it, treat every page/component as scaffolding
meant to be replaced, not a finished product.

## Tech stack (Golden Stack compliant)

- **Framework:** Next.js 16, App Router, static export (`output: 'export'`)
- **Language:** TypeScript strict
- **Styling:** Tailwind CSS 4 + shadcn/ui + Radix primitives
- **Auth:** Firebase Authentication (Google Sign-In)
- **Database:** Cloud Firestore
- **i18n:** next-intl
- **Hosting:** Firebase Hosting
- **Testing:** Playwright E2E

See SW Factory `docs/GOLDEN_STACK.md` for full standard.

## Demo mode

When `NEXT_PUBLIC_DEMO_SLUG` is set, all Firestore paths are namespaced under
`demos/{slug}/...`. This enables multiple demo instances to share one Firebase
project without data collision.

## Playground mode

The landing page reads URL params (`?pattern=&palette=&style=&sections=&locale=`)
and adjusts rendering. The wizard's iframe preview uses this to show live changes.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run typecheck    # Type check
npm run lint         # ESLint
npm run test:e2e     # Playwright tests
npm run deploy:production  # Deploy to Firebase (set --only hosting:site-name)
```

## Conventions

- Components in `components/ui/` are shadcn — regenerate via `npx shadcn@latest add`
- Use `cn()` from `lib/utils.ts` for conditional Tailwind classes
- All user-facing text via next-intl (`messages/*.json`)
- Auth operations must call `ensureAuthPersistence()` first (MUST pattern)
- Demo Firestore paths via `getCollectionPath(collection)` from `lib/firebase.ts`

## Landing sections + auth pages (Task 4b, 2026-09-08)

- `/login` (`app/login/page.tsx`) renders a Google sign-in button wired to
  `signInWithGoogle()` from `useAuth()`; routes to `/dashboard` on success,
  shows an error message on failure. `AuthGuard` (`components/auth/auth-guard.tsx`)
  redirects unauthenticated users here.
- The landing page lives at `app/(public)/page.tsx` (route group, URL still `/`),
  wrapped by `app/(public)/layout.tsx` with `components/layout/header.tsx` +
  `footer.tsx`. Seven section components in `components/sections/` (`hero`,
  `features`, `pricing`, `testimonials`, `faq`, `contact`, `cta`) each render a
  wrapper with `data-section="<id>"`.
- The landing page reads playground config (URL params + live `postMessage`
  from the wizard) via `useSyncExternalStore` over `parsePlaygroundParams()` /
  `listenForPlaygroundUpdates()` (`lib/playground.ts`) — deliberately NOT
  `useEffect` + `setState`, to avoid the cascading-render anti-pattern and to
  keep `window` access out of the render path during static export
  (`getServerSnapshot` returns the default section set for SSR/prerender).
  Only the sections named in `config.sections`, in that order, are rendered.
- `tests/smoke.spec.ts` (8/8 passing: 4 tests × chromium/mobile) is the gate
  this closed — keep app changes satisfying the tests as written, not the
  other way around.
