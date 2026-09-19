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
 *
 * The routed pages live under `app/[locale]/`. The identically-named files under
 * `app/(default)/` are one-line re-exports that put the default locale at the bare path
 * (`lib/locale-routing.ts`), so they are not listed separately: there is one module per
 * page and it is the one named here.
 */
export const PATTERN_IMPLEMENTATIONS: Record<PatternId, readonly string[]> = {
  landing: [
    "app/[locale]/page.tsx",
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
