import { type ComponentType } from "react";
import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { PricingSection } from "@/components/sections/pricing";
import { TestimonialsSection } from "@/components/sections/testimonials";
import { FaqSection } from "@/components/sections/faq";
import { ContactSection } from "@/components/sections/contact";
import { CtaSection } from "@/components/sections/cta";
import { UseCasesSection } from "@/components/sections/use-cases";
import { ComparisonSection } from "@/components/sections/comparison";
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

const SECTION_REGISTRY: Record<string, ComponentType> = {
  hero: HeroSection,
  features: FeaturesSection,
  howItWorks: HowItWorksSection,
  pricing: PricingSection,
  testimonials: TestimonialsSection,
  faq: FaqSection,
  contact: ContactSection,
  cta: CtaSection,
  useCases: UseCasesSection,
  comparison: ComparisonSection,
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
    </>
  );
}
