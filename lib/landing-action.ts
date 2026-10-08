import type { PrototypeConfig } from "./prototype-config";

/** The hero and closing CTA share the next step chosen for this prototype. */
export function landingActionHref(patterns: PrototypeConfig["patterns"]): string | null {
  const sections = patterns.landing?.sections ?? [];
  const requested = patterns.cta?.href;
  if (requested) {
    // The model sometimes names an app entry that this template does not export.
    // Preserve custom customer routes; only these known template aliases need repair.
    if (!["/app", "/signup", "#signup"].includes(requested)) {
      if (!requested.startsWith("#")) return requested;
      if (requested === "#contact" && sections.includes("contact")) return requested;
      if (sections.some((section) => requested === `#chapter-${section}`)) return requested;
      // Section components do not all own an id; LandingStory owns chapter ids.
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
