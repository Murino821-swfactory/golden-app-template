# CLAUDE.md — Golden App Template

Context file for AI agents implementing prototypes. **READ THIS FIRST, DO NOT EXPLORE.**

## Critical Rules for Fast Implementation

1. **DO NOT read files for context** — everything you need is in this CLAUDE.md
2. **DO NOT run `find`, `grep`, or `ls`** — the structure is documented below
3. **Read a file ONLY when you're about to edit it** — one read, one edit
4. **Batch all changes to a file in ONE Edit call** — no read-edit-read-edit loops

## Tech Stack (Golden Stack)

- **Framework:** Next.js 16, App Router, static export (`output: 'export'`)
- **Language:** TypeScript strict
- **Styling:** Tailwind CSS 4 + shadcn/ui + Radix primitives
- **Auth:** Firebase Authentication (Google Sign-In) — already implemented
- **Database:** Cloud Firestore — use `getCollectionPath()` for demo namespacing
- **i18n:** next-intl — all user text in `messages/en.json`

## Project Structure (MEMORIZE — DO NOT EXPLORE)

```
app/
  (public)/page.tsx      # Landing page — renders sections from SECTION_REGISTRY
  login/page.tsx         # Login page (already implemented)
components/
  sections/              # Landing sections: hero, features, pricing, testimonials, faq, contact, cta
  features/              # Pre-built feature components (checkin-toggle, streak-counter, calendar-grid)
  ui/                    # shadcn components (button, card, input, skeleton)
  auth/auth-guard.tsx    # Protects routes, redirects to /login
  layout/                # header.tsx, footer.tsx
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

3. In `lib/playground.ts` — add to DEFAULT_SECTIONS:
```tsx
const DEFAULT_SECTIONS = ["hero", "features", "newSection", "cta"];
```

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

**Files to modify:** `messages/en.json` ONLY

Just edit the JSON values. The components already read from it via `useTranslations()`.

## Pre-built Feature Components

These are ready to use — just import and render:

| Component | Import | Props |
|-----------|--------|-------|
| `CheckinToggle` | `@/components/features/checkin-toggle` | `pillars: string[]`, `onCheckin: (pillar) => void` |
| `StreakCounter` | `@/components/features/streak-counter` | `currentStreak: number`, `label?: string` |
| `CalendarGrid` | `@/components/features/calendar-grid` | `checkedDates: Date[]`, `month?: Date` |

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
