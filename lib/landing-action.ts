import type { PrototypeConfig } from "./prototype-config";

/** The hero and closing CTA share the next step chosen for this prototype. */
export function landingActionHref(patterns: PrototypeConfig["patterns"]): string | null {
  if (patterns.cta) return patterns.cta.href;
  if (patterns.landing?.sections.includes("contact")) return "#contact";
  if (patterns.authGoogle) return "/login";
  if (patterns.dashboard) return "/dashboard";
  return null;
}
