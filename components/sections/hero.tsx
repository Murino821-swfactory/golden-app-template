"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { config } from "@/lib/prototype-config";

/**
 * Hero section — the first thing a visitor sees.
 *
 * Headline and subheadline come from `prototype.config.json` when present, with
 * translations as a fallback. Sonnet writes the config values; the translations are just
 * placeholders for local dev and to keep the template buildable before any content agent
 * has touched it.
 */

const landing = config.patterns.landing;

export function HeroSection() {
  const t = useTranslations("landing");
  const headline = landing?.headline ?? t("title");
  const subheadline = landing?.subheadline ?? t("subtitle");

  return (
    <section
      data-section="hero"
      className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28"
    >
      <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        {headline}
      </h1>
      <p className="max-w-xl text-balance text-muted-foreground sm:text-lg">
        {subheadline}
      </p>
      <Button asChild size="lg">
        <Link href="#contact">{t("cta")}</Link>
      </Button>
    </section>
  );
}
