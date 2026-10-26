import type { ComponentType } from "react";
import "./editorial.css";
import { CtaSection } from "./cta";
import { FaqSection } from "./faq";
import { FeaturesSection } from "./features";
import { HeroSection } from "./hero";
import { HowItWorksSection } from "./how-it-works";

/**
 * The editorial presentation's sections (default since 2026-10-26; sw-factory decision
 * "premium prototype design", after the landings of mdx.so and its Indoobit case study).
 * `app/[locale]/page.tsx` spreads them over the shared `SECTION_REGISTRY` when the config's
 * `patterns.landing.presentation` is `editorial` or absent — same ids, same copy contract
 * (`prototype.config.json`), same `data-section` markers, a different presentation. The
 * sections without an editorial form (contact, listings, use cases, comparison) keep the
 * shared components. The styles are imported here so they ship only with these sections.
 */
export const EDITORIAL_SECTIONS: Record<string, ComponentType> = {
  hero: HeroSection,
  features: FeaturesSection,
  howItWorks: HowItWorksSection,
  faq: FaqSection,
  cta: CtaSection,
};
