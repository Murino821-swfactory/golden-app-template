import type { PatternId } from "./prototype-config";

/**
 * patterns.ts — what each pattern is actually made of, in this repo.
 *
 * This is the template-side half of the rule that a pattern flagged `useInTemplate: true`
 * in `patternRegistry/golden-app-template` must have real code behind it. A flag on a
 * pattern whose component was never ported is a promise the wizard cannot keep: the
 * customer ticks "map", the config enables `mapBase`, and nothing renders — silently,
 * because a missing optional slice looks exactly like a disabled feature.
 *
 * `tests/patterns.spec.ts` asserts every file listed here exists. It proves the code is
 * present, not that it is correct — the smoke suite does that part.
 */
export const PATTERN_IMPLEMENTATIONS: Record<PatternId, readonly string[]> = {
  landing: [
    "app/[locale]/(public)/page.tsx",
    "components/sections/hero.tsx",
    "components/sections/features.tsx",
    "components/sections/faq.tsx",
  ],
  dashboard: ["app/[locale]/dashboard/page.tsx"],
  authGoogle: [
    "contexts/auth-context.tsx",
    "components/auth/auth-guard.tsx",
    "app/[locale]/login/page.tsx",
  ],
  cta: ["components/sections/cta.tsx"],
  contactForm: ["components/sections/contact.tsx"],
  dataGrid: ["components/patterns/data-grid/index.tsx", "hooks/use-records.ts"],
  mapBase: ["components/patterns/map-base/index.tsx"],
};
