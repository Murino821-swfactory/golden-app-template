import type { PrototypeConfig } from "./prototype-config";

/** The hero and closing CTA share the next step chosen for this prototype. */
export function landingActionHref(patterns: PrototypeConfig["patterns"]): string | null {
  if (patterns.cta) {
    // Older generated configs use /signup or #signup, but this template's Google
    // auth entry is /login and it has no signup page or signup anchor. Keep those
    // published prototypes actionable when they are refreshed from main.
    if (patterns.authGoogle && (patterns.cta.href === "/signup" || patterns.cta.href === "#signup")) {
      return "/login";
    }
    return patterns.cta.href;
  }
  if (patterns.landing?.sections.includes("contact")) return "#contact";
  if (patterns.authGoogle) return "/login";
  if (patterns.dashboard) return "/dashboard";
  return null;
}
