import { type ComponentType } from "react";
import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { FaqSection } from "@/components/sections/faq";
import { CtaSection } from "@/components/sections/cta";
import { RealEstateContact } from "@/components/sections/realestate-contact";
import { RealEstateComparison, RealEstateUseCases } from "@/components/sections/realestate-landing";
import { LandingReveal } from "@/components/motion/landing-reveal";
import { PricingSection } from "@/components/sections/pricing";
import { TestimonialsSection } from "@/components/sections/testimonials";
import { ListingsSection } from "@/components/sections/listings";
import { LandingStory } from "@/components/sections/landing-story";
import { landingJsonLd } from "@/lib/seo";
import { config, landingPresentation } from "@/lib/prototype-config";
import { EDITORIAL_SECTIONS } from "@/components/editorial/registry";

// ONE source of truth for sections: prototype.config.json (P5). This used to also be
// readable from a `?sections=` URL param, wired for a wizard iframe preview that stopped
// existing in factory-web `c7f5d2e` — that path let anyone rewrite a live prototype's
// landing page from the URL bar, including into sections the build's config never
// provisioned content for (fabricated testimonials, an invented price list, on a real
// prospect's page). Removed 2026-09-18: the config the harness validated is now the only
// thing that decides what renders here.
const SECTIONS: string[] = config.patterns.landing?.sections ?? [];

// realitny-makler: since 2026-10-27 the landing is the golden template's editorial page
// (hero, features with the showcase strip, how it works, FAQ, closing band — founder: "1:1
// like GameDay"). Use cases, comparison and the contact form stay this prototype's own,
// in the display language of 2026-10-19 (`components/sections/realestate-*.tsx`).
const SECTION_REGISTRY: Record<string, ComponentType> = {
  hero: HeroSection,
  features: FeaturesSection,
  howItWorks: HowItWorksSection,
  pricing: PricingSection,
  testimonials: TestimonialsSection,
  faq: FaqSection,
  contact: RealEstateContact,
  cta: CtaSection,
  useCases: RealEstateUseCases,
  comparison: RealEstateComparison,
  listings: ListingsSection,
};

// The presentation decides which components draw the same sections (2026-10-26): editorial
// — the default — lays them out as one long page in display typography with the product in
// a lit frame; story and document keep the shared sections. Same ids, same copy contract,
// same `data-section` markers, so every suite that reads the page keeps holding.
const PRESENTATION = landingPresentation(config);
const REGISTRY: Record<string, ComponentType> =
  PRESENTATION === "editorial" ? { ...SECTION_REGISTRY, ...EDITORIAL_SECTIONS } : SECTION_REGISTRY;

export default async function LandingPage({ params }: { params: Promise<{ locale?: string }> }) {
  const locale = (await params).locale ?? config.defaultLocale;
  return (
    <>
      <script data-site-jsonld type="application/ld+json" dangerouslySetInnerHTML={{ __html: landingJsonLd(locale) }} />
      <LandingStory presentation={PRESENTATION} tone={config.patterns.landing?.tone ?? "light"} chapters={SECTIONS.map((id) => {
        const Section = REGISTRY[id];
        return { id, content: Section ? <Section /> : null };
      })} />
      <LandingReveal />
    </>
  );
}
