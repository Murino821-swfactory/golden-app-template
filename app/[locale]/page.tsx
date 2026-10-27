import { type ComponentType } from "react";
import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { GameSection } from "@/components/sections/game";
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

const SECTION_REGISTRY: Record<string, ComponentType> = {
  hero: HeroSection,
  features: FeaturesSection,
  howItWorks: HowItWorksSection,
  game: GameSection,
  pricing: PricingSection,
  testimonials: TestimonialsSection,
  faq: FaqSection,
  contact: ContactSection,
  cta: CtaSection,
  useCases: UseCasesSection,
  comparison: ComparisonSection,
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
    </>
  );
}
