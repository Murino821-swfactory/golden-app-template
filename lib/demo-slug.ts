/**
 * Demo-tenant utilities — intentionally side-effect-free.
 *
 * getDemoSlug was extracted from lib/firebase.ts so pages that only need the slug
 * (contact.tsx) don't pull in Firebase auth/firestore initializers at module scope.
 */

export function getDemoSlug(): string | null {
  return process.env.NEXT_PUBLIC_DEMO_SLUG || null;
}
