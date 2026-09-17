"use client";

import { useSyncExternalStore, type ComponentType } from "react";
import {
  listenForPlaygroundUpdates,
  parsePlaygroundParams,
} from "@/lib/playground";
import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { PricingSection } from "@/components/sections/pricing";
import { TestimonialsSection } from "@/components/sections/testimonials";
import { FaqSection } from "@/components/sections/faq";
import { ContactSection } from "@/components/sections/contact";
import { CtaSection } from "@/components/sections/cta";
import { config } from "@/lib/prototype-config";

// ONE source of truth for sections: prototype.config.json (P5). This used to be a literal
// array here AND a second literal in lib/playground.ts, kept in sync by hand — which meant
// an agent editing one and not the other produced a build that rendered something different
// from what the wizard previewed. Now both read this.
//
// It is also what renders server-side / at static-export time, and on first client paint
// before hydration reconciles with the real external state (URL + postMessage).
const DEFAULT_SECTIONS: string[] = config.patterns.landing?.sections ?? [];

const SECTION_REGISTRY: Record<string, ComponentType> = {
  hero: HeroSection,
  features: FeaturesSection,
  pricing: PricingSection,
  testimonials: TestimonialsSection,
  faq: FaqSection,
  contact: ContactSection,
  cta: CtaSection,
};

// Playground config comes from two external sources: the URL (read once,
// cached by raw query string) and postMessage from the wizard (an explicit
// override that wins once received). useSyncExternalStore is the React
// primitive for subscribing to state living outside React without the
// "derive state via useEffect + setState" anti-pattern — it also keeps
// window access out of the render path during SSR/static export via
// getServerSnapshot.
let cachedSearch: string | null = null;
let cachedSections: string[] = DEFAULT_SECTIONS;
let overrideSections: string[] | null = null;

function subscribe(onStoreChange: () => void): () => void {
  return listenForPlaygroundUpdates((update) => {
    if (update.sections) {
      overrideSections = update.sections;
      onStoreChange();
    }
  });
}

function getSnapshot(): string[] {
  if (overrideSections) {
    return overrideSections;
  }

  const search = window.location.search;
  if (search !== cachedSearch) {
    cachedSearch = search;
    cachedSections = parsePlaygroundParams(
      new URLSearchParams(search)
    ).sections;
  }
  return cachedSections;
}

function getServerSnapshot(): string[] {
  return DEFAULT_SECTIONS;
}

export default function LandingPage() {
  const sections = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return (
    <>
      {sections.map((id) => {
        const Section = SECTION_REGISTRY[id];
        return Section ? <Section key={id} /> : null;
      })}
    </>
  );
}
