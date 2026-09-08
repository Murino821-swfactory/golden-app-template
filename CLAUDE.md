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

## Known gaps (as of Task 4 — Playwright/CI/docs scaffold)

- No `/login` route yet — `AuthGuard` (`components/auth/auth-guard.tsx`) already
  redirects unauthenticated users to `/login`, but the page itself does not exist.
- The landing page (`app/page.tsx`) has no `[data-section='...']` markers yet —
  `parsePlaygroundParams()`/`listenForPlaygroundUpdates()` (`lib/playground.ts`)
  are wired but unused until real sections are built.
- `tests/smoke.spec.ts` already covers both of the above (login page, playground
  section markers) as a forward-looking gate: those two tests are EXPECTED to
  fail until the corresponding pages/sections land. Keep the tests as-is —
  fix the app, not the test, when doing that follow-up work.
