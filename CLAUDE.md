# CLAUDE.md — Golden App Template

Context file for AI agents implementing prototypes. **READ THIS FIRST, DO NOT EXPLORE.**

> **Staleness warning (2026-09-17).** Most of the recipes below were written for the era
> when a Developer agent wrote code into this template per customer. That agent was
> removed in Wave 2 (2026-09-14): a prototype is now **assembled** from
> `prototype.config.json`, and no model writes code here at all. Treat the recipes as
> history until they are rewritten. What is current: the structure table, the config
> contract, the theming section and the commands.

## Quick Reference — Which Files to Edit

| Feature Type | Files to Change |
|-------------|-----------------|
| App name (header, footer, title) | `prototype.config.json` → `appName` — **never** `messages/en.json` |
| Landing copy (headline, features) | `prototype.config.json` → `content.<locale>.landing` |
| Chrome text (Sign in, Dashboard…) | `messages/<locale>.json` — **all 8 bundles, same keys**, a test enforces it |
| Which sections render | `prototype.config.json` → `patterns.landing.sections` |
| Which languages are published | `prototype.config.json` → `locales` / `defaultLocale` |
| Colour palette | `prototype.config.json` → `theme.colorScheme` (and `lib/color-schemes.ts` for the ramps) |
| Custom section | Create in `components/sections/`, register in `app/(public)/page.tsx` |

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

## Routing is per language — every route lives under `app/[locale]/`

`output: "export"` has no middleware, and next-intl's "default locale without a prefix"
mode is implemented BY middleware. So `localePrefix` is `"always"`: every language has a
prefix (`/sk/login`), and `app/page.tsx` is a small document that redirects the bare root
to the primary language.

- **never** import `Link` or `useRouter` from `next/*` — use `@/i18n/navigation`. A plain
  `next/link` drops the prefix and a Slovak visitor lands on a 404.
- `generateStaticParams` + `setRequestLocale` in `app/[locale]/layout.tsx` are both
  load-bearing: without `setRequestLocale` the subtree goes dynamic and the export FAILS.
- `messages/<locale>.json` exists for all 8 languages with identical keys. A missing key
  does not fail a build; next-intl renders the key path into the page.

## Tech Stack (Golden Stack)

- **Framework:** Next.js 16, App Router, static export (`output: 'export'`)
- **Language:** TypeScript strict
- **Styling:** Tailwind CSS 4 + shadcn/ui + Radix primitives
- **Auth:** Firebase Authentication (Google Sign-In) — already implemented
- **Database:** Cloud Firestore — use `getCollectionPath()` for demo namespacing
- **i18n:** next-intl — **chrome only** (`messages/en.json`: Sign in, Dashboard, Loading).
  The customer's own words — app name, headline, features, CTA label — live in
  `prototype.config.json`. Mixing the two is how every prototype ended up with "Golden App"
  in its header while its `<title>` was correct.

## Project Structure (MEMORIZE — DO NOT EXPLORE)

```
app/
  page.tsx               # Redirect document: bare root -> /<defaultLocale>/
  layout.tsx             # Pass-through; the real <html> is in [locale]/layout.tsx
  [locale]/
    layout.tsx           # <html lang>, palette CSS, header/footer, hreflang
    (public)/page.tsx    # Landing page — renders sections from SECTION_REGISTRY
    login/page.tsx       # Login page (already implemented)
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
  playground.ts          # DEFAULT_CONFIG, parsePlaygroundParams()
  utils.ts               # cn() for className merging
messages/
  en.json                # All user-facing text (translate by copying to sk.json etc.)
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

**Files to modify:** `components/sections/new-section.tsx` (create), `app/(public)/page.tsx`, `lib/playground.ts`, `messages/en.json`

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

2. In `app/(public)/page.tsx` — add to SECTION_REGISTRY:
```tsx
import { NewSection } from "@/components/sections/new-section";
// In SECTION_REGISTRY:
newSection: NewSection,
```

3. In `lib/prototype-config.ts` — add the id to `SECTION_IDS`. It is a closed enum on
   purpose: a section id nothing renders must fail the build, not render nothing. Then run
   `npm run schema` so the harness asks for the same set (CI fails if you forget).

4. In `messages/en.json` — add translations:
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

## Pre-built Hook: use-checkins.ts (READY TO USE)

Complete working hook with streak calculation and Firestore persistence:

```tsx
import { useCheckins } from "@/hooks/use-checkins";

const { checkins, todayCheckins, currentStreak, loading, doCheckin } = useCheckins();
```

### Recipe 6: Add Dashboard Page (MOST COMMON)

**Create:** `app/dashboard/page.tsx`

```tsx
"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { useCheckins } from "@/hooks/use-checkins";
import { CheckinToggle, StreakCounter, CalendarGrid } from "@/components/features";

const PILLARS = ["Sleep", "Exercise", "Nutrition", "Mindfulness", "Hydration"];

function DashboardContent() {
  const { todayCheckins, currentStreak, checkins, doCheckin, loading } = useCheckins();
  
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  
  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-2xl font-bold text-center">Your Dashboard</h1>
      <StreakCounter currentStreak={currentStreak} />
      <CheckinToggle pillars={PILLARS} checkedToday={todayCheckins} onCheckin={doCheckin} />
      <CalendarGrid checkedDates={checkins.map(c => c.date)} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
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

## Tailwind Colors (DO NOT HARDCODE)

All four palettes ship in every build as `html[data-scheme="<id>"]` rules
(`cssBlocksForAll()` in `lib/color-schemes.ts`), and the header's switcher changes the
palette by writing that attribute — so a hardcoded colour is not merely off-brand, it is
the one thing on the page that will not repaint when the visitor switches. The choice
persists in `localStorage`; `prototype.config.json` still decides what a first-time
visitor sees.

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
