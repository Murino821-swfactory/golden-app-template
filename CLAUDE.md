# CLAUDE.md — Golden App Template

Context file for AI agents implementing prototypes. **READ THIS FIRST, DO NOT EXPLORE.**

> **Staleness warning (2026-09-17).** Most of the recipes below were written for the era
> when a Developer agent wrote code into this template per customer. That agent was
> removed in Wave 2 (2026-09-14): a prototype is now **assembled** from
> `prototype.config.json`, and no model writes code here at all. Treat the recipes as
> history until they are rewritten. What is current: the structure table, the config
> contract, the theming section and the commands.

## law-expert — the research page (this branch only, OTH-91)

`/research` (and `/sk/research`) is the product of this prototype; sign-in lands there.
It has a **server half** — the only prototype that does — in factory-web
(`functions/src/law-expert/`, function `lawExpertApi`, rewrite `/api/law-expert/**` on
apps.tokenwise.sk). Spec: sw-factory `docs/superpowers/specs/2026-09-24-law-expert-research-design.md`.

| What | Where |
|---|---|
| API client (origin-relative `/api/law-expert/*`, Bearer ID token) | `lib/law-expert/api.ts`, `token.ts` |
| Contract — a COPY of factory-web `functions/src/law-expert/types.ts`; change both | `lib/law-expert/types.ts` |
| What the page shows (memo grouping, unsupported flags, facet shares, case record) | `lib/law-expert/view.ts` |
| Copy, en + sk (not `messages/*.json` — those are shared chrome) | `lib/law-expert/copy.ts` |
| Components | `components/law-expert/*` |

- **Dates go out as `yyyy-MM-dd`.** InfoSúd silently ignores `dd.MM.yyyy` in `vydaniaOd`
  and returns the unfiltered set [FAKT 2026-09-25].
- **Nothing is invented:** the server drops citations that point outside the sources and
  never calls the memo model when no decisions were found; the page marks uncited text.
- **Test gap, stated:** the suite does not sign in with Google, so the signed-in page has
  no e2e test. Its logic is in `tests/law-expert-logic.spec.ts`; `tests/law-expert.spec.ts`
  covers the redirect, the CTA and the landing copy; the live page is checked by the smoke
  run after publishing.

## Quick Reference — Which Files to Edit

| Feature Type | Files to Change |
|-------------|-----------------|
| App name (header, footer, title) | `prototype.config.json` → `appName` — **never** `messages/en.json` |
| Landing copy (headline, features) | `prototype.config.json` → `content.<locale>.landing` |
| Chrome text (Sign in, Dashboard…) | `messages/<locale>.json` |
| Which sections render | `prototype.config.json` → `patterns.landing.sections` |
| Colour palette | `prototype.config.json` → `theme.colorScheme` (and `lib/color-schemes.ts` for the fifteen pairs and the rule) |
| Custom section | Create in `components/sections/`, register in `app/[locale]/page.tsx` |

## Critical Rules for Fast Implementation

1. **DO NOT read files for context** — everything you need is in this CLAUDE.md
2. **DO NOT run `find`, `grep`, or `ls`** — the structure is documented below
3. **Read a file ONLY when you're about to edit it** — one read, one edit
4. **Batch all changes to a file in ONE Edit call** — no read-edit-read-edit loops

## The config splits in two — learn this before editing anything

`prototype.config.json` has two halves, divided by ONE question: *does this value change
when the language changes?*

| | What | Written |
|---|---|---|
| `patterns` | what the prototype **is** — which patterns, which sections, entity field keys and types, map centre | once, whatever the language |
| `content.<locale>` | what it **says** — headline, labels, meta description | once per language |

So an entity's `fields[].key` and `.type` are in `patterns`, and that field's human label
is in `content.<locale>.dataGrid.fieldLabels`. Components get copy from `useContent()` and
merged grid fields from `useEntityFields()` (`hooks/use-content.ts`), both of which read
`useLocale()` — so nothing needs editing when a build ships more than one language.

A pattern is enabled iff its **`patterns`** slice exists. zod then requires the matching
content slice in **every** declared locale, so a language can never be offered and then
render blank.

Configs written before the split (copy inside `patterns`, no `locales`/`content`) are
still accepted: `migrateLegacyConfig` lifts them into `content.en`. That adapter exists
only for the window before the harness is deployed — do not write new configs in the old
shape.

## Tech Stack (Golden Stack)

- **Framework:** Next.js 16, App Router, static export (`output: 'export'`)
- **Language:** TypeScript strict
- **Styling:** Tailwind CSS 4 + shadcn/ui + Radix primitives
- **Auth:** Firebase Authentication (Google Sign-In) — already implemented
- **Database:** Cloud Firestore — use `getCollectionPath()` for demo namespacing
- **i18n:** next-intl, **routed** — one document per declared language. The bundles in
  `messages/<locale>.json` are chrome only (Sign in, Dashboard, Loading); the customer's
  own words — app name, headline, features, CTA label — live in `prototype.config.json`.
  Mixing the two is how every prototype ended up with "Golden App" in its header while its
  `<title>` was correct. See "Languages and routing" below for which URL serves which.

## Project Structure (MEMORIZE — DO NOT EXPLORE)

```
app/
  shell.tsx              # The <html> document, in one language — both root layouts render it
  (default)/             # The BARE path: /, /login, /dashboard — the default locale
    layout.tsx           #   root layout #1
    page.tsx             #   one-line re-exports of the [locale] modules
  [locale]/              # The prefixed languages: /sk, /sk/login, /sk/dashboard
    layout.tsx           #   root layout #2 + generateStaticParams
    page.tsx             # Landing page — renders sections from SECTION_REGISTRY
    login/page.tsx       # Login page (already implemented)
    dashboard/page.tsx   # Signed-in page — blocks appear per prototype.config.json
components/
  sections/              # Landing sections: hero, features, pricing, testimonials, faq, contact, cta
  features/              # Pre-built feature components (checkin-toggle, streak-counter, calendar-grid)
  ui/                    # shadcn components (button, card, input, skeleton)
  auth/auth-guard.tsx    # Protects routes, redirects to /login
  layout/                # header.tsx, footer.tsx, palette-switcher.tsx, user-menu.tsx
hooks/
  use-auth.ts            # useAuth() → { user, loading, signInWithGoogle, signOut }
lib/
  firebase.ts            # getCollectionPath(), getFirestoreInstance(), ensureAuthPersistence()
  utils.ts               # cn() for className merging
messages/
  en.json + 7 more       # Chrome text, one bundle per id in LOCALES (en sk cs de pl hu fr es)
types/
  index.ts               # User, DemoConfig interfaces
```

## Implementation Recipes

### Recipe 1: Add Interactive Feature to Hero Section

**Files to modify:** `components/sections/hero.tsx`, `messages/en.json`

```tsx
// In hero.tsx — add imports at top:
import { CheckinToggle } from "@/components/features/checkin-toggle";
import { StreakCounter } from "@/components/features/streak-counter";

// In hero.tsx — add JSX after the Button:
{/* PROTOTYPE: Your feature UI here */}
<CheckinToggle
  pillars={["work", "health", "relationships"]}
  onCheckin={(pillar) => console.log(`Checked in: ${pillar}`)}
/>
<StreakCounter currentStreak={7} />
```

### Recipe 2: Add Firestore Data (e.g., Check-ins)

**Files to modify:** `lib/firebase.ts` (add functions), `hooks/use-checkin.ts` (create)

```tsx
// In lib/firebase.ts — add at bottom:
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";

export async function saveCheckin(userId: string, pillar: string): Promise<void> {
  const path = getCollectionPath("checkins");
  const docId = `${userId}_${pillar}_${new Date().toISOString().slice(0, 10)}`;
  await setDoc(doc(getFirestoreInstance(), path, docId), {
    userId,
    pillar,
    timestamp: serverTimestamp(),
  });
}

export async function getCheckins(userId: string, since: Date): Promise<unknown[]> {
  const path = getCollectionPath("checkins");
  const q = query(
    collection(getFirestoreInstance(), path),
    where("userId", "==", userId),
    where("timestamp", ">=", since)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
```

```tsx
// Create hooks/use-checkin.ts:
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { saveCheckin, getCheckins } from "@/lib/firebase";

export function useCheckin() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const since = new Date();
    since.setDate(since.getDate() - 30);
    getCheckins(user.uid, since).then(setCheckins).finally(() => setLoading(false));
  }, [user]);

  const checkin = async (pillar: string) => {
    if (!user) return;
    await saveCheckin(user.uid, pillar);
    setCheckins((prev) => [...prev, { pillar, timestamp: new Date() }]);
  };

  return { checkins, checkin, loading };
}
```

### Recipe 3: Add New Section

**Files to modify:** `components/sections/new-section.tsx` (create), `app/[locale]/page.tsx`, every `messages/*.json`

1. Create component in `components/sections/`:
```tsx
"use client";
import { useTranslations } from "next-intl";

export function NewSection() {
  const t = useTranslations("newSection");
  return (
    <section data-section="newSection" className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="text-3xl font-semibold">{t("title")}</h2>
    </section>
  );
}
```

2. In `app/[locale]/page.tsx` — add to SECTION_REGISTRY:
```tsx
import { NewSection } from "@/components/sections/new-section";
// In SECTION_REGISTRY:
newSection: NewSection,
```

3. In `lib/prototype-config.ts` — add the id to `SECTION_IDS`. It is a closed enum on
   purpose: a section id nothing renders must fail the build, not render nothing. Then run
   `npm run schema` so the harness asks for the same set (CI fails if you forget).

4. In **every** `messages/*.json` — add the key. `tests/locale.spec.ts` fails if one
   bundle carries a key another does not; a missing key renders the raw key path on a
   customer's page.
```json
"newSection": {
  "title": "New Section Title"
}
```

### Recipe 4: Protect a Page with Auth

**Files to modify:** target page only

```tsx
// Wrap page content with AuthGuard:
import { AuthGuard } from "@/components/auth/auth-guard";

export default function ProtectedPage() {
  return (
    <AuthGuard>
      {/* Your protected content */}
    </AuthGuard>
  );
}
```

### Recipe 5: Update Landing Copy

**Files to modify:** `prototype.config.json` ONLY

`content.<locale>.landing.headline`, `.subheadline`, `.features[]`,
`content.<locale>.cta.label`, and `appName` at the root. The components read the config
through `useContent()` and fall back to `messages/<locale>.json` only when a value is
absent — that fallback is placeholder text for local dev, never something a customer
should see.

## Pre-built Feature Components

These are ready to use — just import and render:

| Component | Import | Props |
|-----------|--------|-------|
| `CheckinToggle` | `@/components/features` | `pillars: string[]`, `checkedToday: string[]`, `onCheckin: (pillar) => void` |
| `StreakCounter` | `@/components/features` | `currentStreak: number`, `label?: string` |
| `CalendarGrid` | `@/components/features` | `checkedDates: Date[]`, `month?: Date` |
| `ProgressRing` | `@/components/features` | `progress: number (0-100)`, `label?: string` |
| `StatCard` | `@/components/features` | `value: string`, `label: string`, `icon?: string` |

### Recipe 6: Add Dashboard Page (MOST COMMON)

**Create:** `app/[locale]/dashboard/page.tsx`

```tsx
"use client";

import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="mx-auto max-w-2xl space-y-8 p-6">
        <h1 className="text-2xl font-bold text-center">Your Dashboard</h1>
        {/* Your dashboard content here */}
      </div>
    </AuthGuard>
  );
}
```

This is the FASTEST path for a 5-pillar wellness app: create this ONE file, update `messages/en.json` with app-specific copy. Done.

## Available UI Components (shadcn)

Import from `@/components/ui/`:
- `Button` — `<Button variant="default|outline|ghost" size="sm|default|lg">`
- `Card`, `CardHeader`, `CardTitle`, `CardContent`
- `Input` — `<Input placeholder="..." />`
- `Skeleton` — loading placeholder

## Demo Mode

`NEXT_PUBLIC_DEMO_SLUG` namespaces all Firestore under `demos/{slug}/...`.
Always use `getCollectionPath(collection)` — never hardcode collection names.

## Languages and routing

A prototype declares `locales` and `defaultLocale` in `prototype.config.json`, and the
build emits one document per language.

| Language | URL |
|---|---|
| `defaultLocale` | the **bare** path — `/`, `/login`, `/dashboard` |
| every other declared locale | prefixed — `/sk`, `/sk/login`, `/sk/dashboard` |

The default locale stays at the bare path because that is the URL the customer is given
(`tokenwise.sk/newapp/<slug>/`), and because the harness reads `out/index.html` and refuses
to publish a build where it is not a real document with this build's `basePath` assets
(`verifyExportBasePath`). A redirect stub at the root would fail that gate. The full
reasoning, including why there are two root layouts and no `app/layout.tsx`, is in
`lib/locale-routing.ts`.

Consequences when editing:

- **Never write a bare `/login` or `/dashboard` href.** Use `localePath(locale, route)`
  from `lib/locale-routing.ts`, or a Slovak visitor silently lands in English.
- `LOCALES` in `lib/prototype-config.ts` may only name ids that have a `messages/*.json`
  bundle. `npm run schema` publishes the list as `menu.locales` and the harness reads it
  from there — the wizard and the harness keep no copy.
- One declared language means no language switcher at all, and no hreflang alternates.
- `fixtures/full.config.json` and `fixtures/multilingual.config.json` both declare two
  locales, so both CI jobs exercise locale routing.

## Firestore rules — owned by factory-web, not here

This repo ships no `firestore.rules` and `firebase.json` has no `"firestore"` key. Rules
for the shared demo tenant (`demos/{slug}/**`) are owned by `factory-web/firestore.rules`,
which binds each slug to the prototype's requester email (`demoOwnerEmail`) plus the
founder — never re-add a copy here. A second copy of the same rule can only drift, and the
weaker one is the one that eventually deploys: this repo previously shipped one that
granted read/write on every prototype's data to any signed-in user of any prototype,
latent only because `deploy:production` is hosting-only here.

## Tailwind Colors (DO NOT HARDCODE)

All fifteen palettes ship in every build as `html[data-scheme="<id>"]` rules
(`cssBlocksForAll()` in `lib/color-schemes.ts`), and the header's **Change colour** button
steps to the next one by writing that attribute — so a hardcoded colour is not merely
off-brand, it is the one thing on the page that will not repaint when the visitor clicks.
The choice persists in `localStorage`; `prototype.config.json` still decides what a
first-time visitor sees. A palette is a two-colour pair: the darker colour is the
background, the lighter is both text and accent (`primary` = `foreground`), so emphasis
comes from weight, underline or a filled surface — never from a second hue.

Retired ids (`red`, `blue`, `yellow`, `green`) are translated by the config parser, and
`fixtures/full.config.json` keeps `"blue"` on purpose as the CI proof that they still build.

Use semantic tokens — they adapt to the customer's palette:
- `bg-background`, `text-foreground` — main surface
- `bg-primary`, `text-primary-foreground` — accent
- `bg-card`, `text-card-foreground` — cards
- `bg-muted`, `text-muted-foreground` — secondary text
- `border`, `ring` — borders and focus rings

## Commands

```bash
npm run dev              # Dev server
npm run build            # Production build (must pass)
npm run typecheck        # Type check
npm run test:e2e         # Playwright smoke tests (must pass)
```

## Summary: Fastest Path

1. Read this CLAUDE.md completely
2. Identify which 2-3 files need changes based on the spec
3. For each file: read → make ALL changes → move to next file
4. Run `npm run build` once at the end
5. Done — no exploration, no extra reads, no refactoring
