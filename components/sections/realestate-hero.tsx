"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check } from "lucide-react";
import { useContent } from "@/hooks/use-content";
import { useHeroImage } from "@/hooks/use-hero-image";
import { LandingRail } from "@/components/realestate/rail";
import { WORKSPACE_COPY, workspaceLocale } from "@/lib/realestate/copy";
import { landingActionHref } from "@/lib/landing-action";
import { config } from "@/lib/prototype-config";
import { cn } from "@/lib/utils";
import { CopyRewriteControls } from "./copy-rewrite-panel";
import { HeroImageControls } from "./hero-image-controls";

/**
 * This prototype's hero (replaces the template's in `app/[locale]/page.tsx`).
 *
 * The thesis is the rail: the whole path of a sale, from the inquiry to the keys, drawn
 * under the headline and lit in sequence on load. Beside it, the artifact every agent
 * works with all day — a listing dossier: price in large tabular figures, the facts, the
 * compliance and publication state, the deal it is in. The Gemini street at dusk sits
 * behind, faded to the left so the words stay readable in every palette.
 *
 * Copy still comes from `prototype.config.json` (headline, subheadline, CTA label); the
 * product-specific words — bullets, rail labels, the dossier — are in
 * `lib/realestate/copy.ts`. The template's AI hero image keeps its contract: when the
 * creator or the founder generated one (`hero-image.json`), it replaces the static
 * photograph in the same layer. The hero carries exactly ONE link — the configured next
 * step — as the template's does; the second CTA is a button.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

function GeneratedBackground({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-hero-image
      src={src}
      alt=""
      decoding="async"
      fetchPriority="low"
      onLoad={() => setLoaded(true)}
      className={cn("h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none", loaded ? "opacity-100" : "opacity-0")}
    />
  );
}

export function RealEstateHero() {
  const t = useTranslations("landing");
  const content = useContent();
  const locale = useLocale();
  const r = WORKSPACE_COPY[workspaceLocale(locale)].landing;
  const landing = content.landing;
  const href = landingActionHref(config.patterns);
  const headline = landing?.headline ?? t("title");
  const subheadline = landing?.subheadline ?? t("subtitle");
  const hero = useHeroImage();

  return (
    <section data-section="hero" className="relative isolate w-full overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {hero.src ? (
          <GeneratedBackground key={hero.src} src={hero.src} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${BASE_PATH}/images/hero-street.webp`}
            srcSet={`${BASE_PATH}/images/hero-street-800.webp 800w, ${BASE_PATH}/images/hero-street.webp 1376w`}
            sizes="100vw"
            alt=""
            decoding="async"
            fetchPriority="high"
            className="h-full w-full object-cover object-right opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-10 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-24">
        <div className="flex flex-col items-start gap-5">
          <p data-app-name className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{config.appName}</p>
          <p className="text-sm font-medium text-foreground/80">{r.eyebrow}</p>
          <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{headline}</h1>
          <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">{subheadline}</p>
          <ul className="space-y-1.5 text-sm">
            {r.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-1">
            {href && (
              <Link href={href} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background shadow-lg shadow-black/20 hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-ring">
                {content.cta?.label ?? t("cta")}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex min-h-12 items-center rounded-xl border border-foreground/30 bg-background/40 px-5 text-sm font-medium backdrop-blur hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              {r.secondaryCta}
            </button>
          </div>
        </div>

        {/* The listing dossier: the artifact, not a screenshot. Its words are copy, its
            numbers the seed's Panenská flat, so the demo opens on the same record. */}
        <figure aria-hidden data-hero-dossier className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="overflow-hidden rounded-2xl border border-foreground/15 bg-card/85 shadow-2xl shadow-black/40 backdrop-blur-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE_PATH}/images/dossier-interior-800.webp`} srcSet={`${BASE_PATH}/images/dossier-interior-800.webp 800w, ${BASE_PATH}/images/dossier-interior.webp 1200w`} sizes="(min-width: 1024px) 480px, 100vw" alt="" decoding="async" className="aspect-[4/3] w-full object-cover" />
            <div className="space-y-3 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{r.dossier.eyebrow}</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{r.dossier.price}</p>
                  <p className="text-sm text-muted-foreground">{r.dossier.facts}</p>
                  <p className="text-sm">{r.dossier.place}</p>
                </div>
                <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-xs font-medium text-amber-200 ring-1 ring-inset ring-amber-400/35">{r.dossier.status}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-200 ring-1 ring-inset ring-emerald-400/35">{r.dossier.energy}</span>
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-200 ring-1 ring-inset ring-emerald-400/35">{r.dossier.portals}</span>
                <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-sky-200 ring-1 ring-inset ring-sky-400/35">{r.dossier.matches}</span>
              </div>
              <div className="flex items-center justify-between border-t border-foreground/10 pt-3 text-xs text-muted-foreground">
                <span>{r.dossier.deal}</span>
                <span>{r.dossier.agent}</span>
              </div>
            </div>
          </div>
        </figure>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20">
        <LandingRail labels={r.rail} caption={r.railCaption} />
      </div>
      <HeroImageControls hero={hero} />
      <CopyRewriteControls />
    </section>
  );
}
