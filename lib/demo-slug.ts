/**
 * Demo-tenant utilities — intentionally side-effect-free.
 *
 * getDemoSlug was extracted from lib/firebase.ts so pages that only need the slug
 * (contact.tsx) don't pull in Firebase auth/firestore initializers at module scope.
 */

export function getDemoSlug(): string | null {
  return process.env.NEXT_PUBLIC_DEMO_SLUG || null;
}

/**
 * The name this app goes by at the factory — the idea chat's `slug`, the showcase strip's
 * own tile to leave out, the `utm_content` of tokenwise links. A standalone product built
 * from this template (own Firebase project, so no demo tenant and no `NEXT_PUBLIC_DEMO_SLUG`)
 * sets `NEXT_PUBLIC_PRODUCT_SLUG`; a prototype goes by its demo slug.
 */
export function getProductSlug(): string | null {
  return process.env.NEXT_PUBLIC_PRODUCT_SLUG || getDemoSlug();
}
