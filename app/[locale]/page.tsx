import { type ComponentType } from "react";
import { RealEstateHero } from "@/components/sections/realestate-hero";
import { RealEstateCta } from "@/components/sections/realestate-cta";
import { RealEstateContact } from "@/components/sections/realestate-contact";
import {
  RealEstateComparison,
  RealEstateFaq,
  RealEstateFeatures,
  RealEstateHowItWorks,
  RealEstateUseCases,
} from "@/components/sections/realestate-landing";
import { LandingReveal } from "@/components/motion/landing-reveal";
import { PricingSection } from "@/components/sections/pricing";
import { TestimonialsSection } from "@/components/sections/testimonials";
import { ListingsSection } from "@/components/sections/listings";
import { LandingStory } from "@/components/sections/landing-story";
import { landingJsonLd } from "@/lib/seo";
import { config } from "@/lib/prototype-config";

// ONE source of truth for sections: prototype.config.json (P5). This used to also be
// readable from a `?sections=` URL param, wired for a wizard iframe preview that stopped
// existing in factory-web `c7f5d2e` — that path let anyone rewrite a live prototype's
// landing page from the URL bar, including into sections the build's config never
// provisioned content for (fabricated testimonials, an invented price list, on a real
// prospect's page). Removed 2026-09-18: the config the harness validated is now the only
// thing that decides what renders here.
const SECTIONS: string[] = config.patterns.landing?.sections ?? [];

// realitny-makler: every rendered section is this prototype's own, set in the landing's
// display language after mdx.so (2026-10-19, `components/sections/realestate-*.tsx`); the
// template's files stay untouched so a refresh merges clean. The sections this config
// does not render keep the template's components, so the registry stays complete.
const SECTION_REGISTRY: Record<string, ComponentType> = {
  hero: RealEstateHero,
  features: RealEstateFeatures,
  howItWorks: RealEstateHowItWorks,
  pricing: PricingSection,
  testimonials: TestimonialsSection,
  faq: RealEstateFaq,
  contact: RealEstateContact,
  cta: RealEstateCta,
  useCases: RealEstateUseCases,
  comparison: RealEstateComparison,
  listings: ListingsSection,
};

export default async function LandingPage({ params }: { params: Promise<{ locale?: string }> }) {
  const locale = (await params).locale ?? config.defaultLocale;
  return (
    <>
      <script data-site-jsonld type="application/ld+json" dangerouslySetInnerHTML={{ __html: landingJsonLd(locale) }} />
      <LandingStory presentation={config.patterns.landing?.presentation} chapters={SECTIONS.map((id) => {
        const Section = SECTION_REGISTRY[id];
        return { id, content: Section ? <Section /> : null };
      })} />
      <LandingReveal />
    </>
  );
}
