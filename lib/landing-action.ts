import type { PrototypeConfig } from "./prototype-config";

/** The hero and closing CTA share the next step chosen for this prototype.
 * prototypeConfigSchema validates configured routes and anchors before rendering. */
export function landingActionHref(patterns: PrototypeConfig["patterns"]): string | null {
  const sections = patterns.landing?.sections ?? [];
  const requested = patterns.cta?.href;
  if (requested) {
    // The model sometimes names an app entry that this template does not export.
    // Parsed configs only contain exported routes; retain legacy alias handling here.
    if (!["/app", "/signup", "#signup"].includes(requested)) {
      if (!requested.startsWith("#")) return requested;
      if (requested === "#contact" && sections.includes("contact")) return requested;
      if (sections.some((section) => requested === `#chapter-${section}`)) return requested;
      // Keep existing chapter destinations compatible with story and document modes.
      if (sections.includes(requested.slice(1) as (typeof sections)[number])) {
        return `#chapter-${requested.slice(1)}`;
      }
    }
  }
  if (patterns.landing?.sections.includes("contact")) return "#contact";
  if (patterns.authGoogle) return "/login";
  if (patterns.dashboard) return "/dashboard";
  // A landing-only concept has no signup/download/game route. Its next step is
  // the first rendered chapter explaining the concept, not an invented #start.
  if (requested) {
    const next = sections.find((section) => section !== "hero" && section !== "cta");
    if (next) return `#chapter-${next}`;
  }
  return null;
}

/**
 * The `prefetch` of the landing action's <Link>. Next.js prefetches an on-screen link together
 * with the code of the page it opens; behind the dashboard (and a branch's own app routes) that
 * is Firebase Auth + Firestore, ~0.7 MB that every anonymous visitor of the landing downloaded
 * for a page that sends them on to /login (measured on five live prototypes, 2026-11-15,
 * sw-factory T-438). Only the sign-in page is light enough (~4 kB) to fetch ahead of the tap;
 * every other route is fetched on the tap. Anchors and other sites are never prefetched.
 */
export function landingActionPrefetch(action: string | null): false | undefined {
  if (!action?.startsWith("/") || action === "/login") return undefined;
  return false;
}
