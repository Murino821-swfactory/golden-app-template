"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useContent } from "@/hooks/use-content";
import { useHeroImage } from "@/hooks/use-hero-image";
import { HeroImageControls } from "./hero-image-controls";
import { CopyRewriteControls } from "./copy-rewrite-panel";
import { WorkspacePreview } from "./workspace-preview";
import { config } from "@/lib/prototype-config";
import { landingActionHref } from "@/lib/landing-action";
import { localePath } from "@/lib/locale-routing";

/**
 * law-expert hero — the branch's own: a full-bleed photograph (`public/law/hero.jpg`, drawn
 * once with the factory's Gemini image model, 2026-10-13), the headline and subheadline from
 * `prototype.config.json`, two calls to action and a still of the workspace overview.
 *
 * The committed photograph is the default background; a visible founder/creator image from
 * `hero-image.json` replaces it (same absolute layer, moves nothing — tests/hero-image.spec).
 * "Edit texts" still rewrites the copy.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The generated image, faded in once it has loaded. Decoration: hidden from assistive tech. */
function GeneratedBackground({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-hero-image src={src} alt="" decoding="async" fetchPriority="low" onLoad={() => setLoaded(true)} className={`h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"}`} />
  );
}

export function HeroSection() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const content = useContent();
  const landing = content.landing;
  const target = landingActionHref(config.patterns);
  const href = target?.startsWith("/") ? localePath(locale, target) : target;
  const headline = landing?.headline ?? t("title");
  const subheadline = landing?.subheadline ?? t("subtitle");
  const hero = useHeroImage();
  const sk = locale === "sk";

  return (
    <section data-section="hero" className="relative isolate w-full overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* next/image cannot optimise in a static export; this is a plain decorative img. */}
        {hero.src ? <GeneratedBackground key={hero.src} src={hero.src} /> : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${BASE_PATH}/law/hero.jpg`} alt="" decoding="async" fetchPriority="high" className="h-full w-full object-cover object-[70%_center]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,color-mix(in_oklab,var(--background)_88%,transparent)_45%,color-mix(in_oklab,var(--background)_55%,transparent)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent,var(--background))]" />
      </div>
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:py-32">
        <div className="flex flex-col items-start gap-6 text-left">
          <p data-app-name className="text-sm font-medium uppercase tracking-widest text-muted-foreground">{config.appName}</p>
          <h1 className="max-w-3xl text-balance font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{headline}</h1>
          <p className="max-w-xl text-balance text-base text-muted-foreground sm:text-lg">{subheadline}</p>
          <div className="flex flex-wrap gap-3">
            {href && (
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link href={href}>{content.cta?.label ?? t("cta")}</Link>
              </Button>
            )}
            {/* A button, not a second link: the hero's one anchor is the configured next step. */}
            <Button type="button" size="lg" variant="outline" className="h-12 px-6 text-base" onClick={() => document.getElementById("chapter-useCases")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              {sk ? "Pre advokátov a kancelárie" : "For lawyers and firms"}
            </Button>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {(sk
              ? ["Lehoty podľa § 121 CSP", "Advokátska tarifa 655/2004", "InfoSúd + NS SR OpenData", "Slovenčina a angličtina"]
              : ["Deadlines per § 121 CSP", "Tariff decree 655/2004", "InfoSúd + NS SR OpenData", "Slovak and English"]
            ).map((item) => (
              <li key={item} className="flex items-center gap-1.5"><span aria-hidden className="size-1.5 rounded-full bg-primary" />{item}</li>
            ))}
          </ul>
        </div>
        <div className="flex justify-center lg:justify-end"><WorkspacePreview locale={locale} /></div>
      </div>
      <HeroImageControls hero={hero} />
      <CopyRewriteControls />
    </section>
  );
}
