import type { ComponentType } from "react";
import { CtaSection } from "./cta";
import { FaqSection } from "./faq";
import { FeaturesSection } from "./features";
import { HeroSection } from "./hero";
import { HowItWorksSection } from "./how-it-works";

/**
 * GitPulse Studio's own landing sections (`demo/gitpulse-studio`, 2026-10-23), spread
 * over the template's `SECTION_REGISTRY` in `app/[locale]/page.tsx`. Same ids, same copy
 * contract (`prototype.config.json`), same `data-section` markers — a different
 * presentation. Kept in their own folder so a template refresh merges past them: the
 * shared `components/sections/*` stay as `main` ships them.
 */
export const GITPULSE_SECTIONS: Record<string, ComponentType> = {
  hero: HeroSection,
  features: FeaturesSection,
  howItWorks: HowItWorksSection,
  faq: FaqSection,
  cta: CtaSection,
};
