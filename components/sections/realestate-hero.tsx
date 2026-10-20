"use client";

import { useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useContent } from "@/hooks/use-content";
import { useHeroImage } from "@/hooks/use-hero-image";
import { LandingRail } from "@/components/realestate/rail";
import { WORKSPACE_COPY, workspaceLocale } from "@/lib/realestate/copy";
import { landingActionHref } from "@/lib/landing-action";
import { config } from "@/lib/prototype-config";
import { cn } from "@/lib/utils";
import { CopyRewriteControls } from "./copy-rewrite-panel";
import { HeroImageControls } from "./hero-image-controls";
import { DisplayText, Eyebrow, PillButton, PillLink, TwoTone } from "./realestate-landing-ui";

/**
 * This prototype's hero (replaces the template's in `app/[locale]/page.tsx`), composed
 * after mdx.so (founder request 2026-10-19): the object first — the listing dossier,
 * centred, lit by a pool of the accent, the artifact every agent works with all day — and
 * under it the rail, the whole path of a sale lit in sequence on load. The words sit low,
 * as on the reference: the headline set light with its first clause in weight, the
 * two-tone subheadline, the pill action; beside them the statement column with what the
 * desk does. The Gemini street at dusk is faded far back so the words read in every
 * palette.
 *
 * Copy still comes from `prototype.config.json` (headline, subheadline, CTA label); the
 * product-specific words — bullets, rail labels, the dossier — are in
 * `lib/realestate/copy.ts`. The template's AI hero image keeps its contract: when the
 * creator or the founder generated one (`hero-image.json`), it replaces the static
 * photograph in the same layer. The hero carries exactly ONE link — the configured next
 * step — as the template's does; the second action is a button. The entrance is opacity
 * only, so nothing the hero-image gate measures ever moves.
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

const fade = (ms: number) => ({ "--hero-delay": `${ms}ms` }) as CSSProperties;

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
            className="h-full w-full object-cover object-center opacity-40"
          />
        )}
        {/* The pool of the accent behind the dossier, then the fade into the page. */}
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_26%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_72%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:grid-rows-[auto_auto_auto] lg:gap-x-14 lg:gap-y-8 lg:pb-16 lg:pt-10">
        {/* The words — first on a phone, low and left on a desktop. */}
        <div data-hero-fade style={fade(120)} className="flex flex-col items-start gap-5 lg:col-start-1 lg:row-start-3 lg:self-end">
          <Eyebrow data-app-name>{config.appName}</Eyebrow>
          <h1 className="max-w-3xl text-balance text-[2.75rem] font-light leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-[3.5rem]">
            <DisplayText text={headline} />
          </h1>
          <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            <TwoTone text={subheadline} />
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {href && <PillLink href={href}>{content.cta?.label ?? t("cta")}</PillLink>}
            <PillButton onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              {r.secondaryCta}
            </PillButton>
          </div>
        </div>

        {/* The listing dossier: the artifact, not a screenshot, centred like the object of
            the reference. Its words are copy, its numbers the seed's Panenská flat, so the
            demo opens on the same record. */}
        <figure aria-hidden data-hero-dossier data-hero-fade className="relative w-full lg:col-span-2 lg:row-start-1 lg:w-[min(100%,46rem)] lg:justify-self-center">
          <div className="absolute inset-x-10 -top-4 bottom-4 -z-10 rounded-full bg-primary/15 blur-3xl" />
          <div className="grid overflow-hidden rounded-3xl bg-card/90 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)] ring-1 ring-foreground/10 backdrop-blur-md sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE_PATH}/images/dossier-interior-800.webp`} srcSet={`${BASE_PATH}/images/dossier-interior-800.webp 800w, ${BASE_PATH}/images/dossier-interior.webp 1200w`} sizes="(min-width: 1024px) 380px, 100vw" alt="" decoding="async" className="aspect-[4/3] w-full object-cover sm:aspect-auto sm:h-full" />
            <div className="flex flex-col gap-5 p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <Eyebrow>{r.dossier.eyebrow}</Eyebrow>
                <span className="rounded-full border border-foreground/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">{r.dossier.status}</span>
              </div>
              <div>
                <p className="text-4xl font-light tabular-nums tracking-[-0.03em] sm:text-5xl">{r.dossier.price}</p>
                <p className="mt-2 text-sm text-muted-foreground">{r.dossier.facts}</p>
                <p className="text-sm">{r.dossier.place}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[r.dossier.energy, r.dossier.portals, r.dossier.matches].map((chip) => (
                  <span key={chip} className="rounded-full bg-foreground/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/90">{chip}</span>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-foreground/10 pt-4 text-xs text-muted-foreground">
                <span>{r.dossier.deal}</span>
                <span>{r.dossier.agent}</span>
              </div>
            </div>
          </div>
        </figure>

        <div data-hero-fade style={fade(320)} className="lg:col-span-2 lg:row-start-2">
          <LandingRail labels={r.rail} caption={r.railCaption} />
        </div>

        {/* The statement column: who the desk is for and what it does, beside the words. */}
        <div data-hero-fade style={fade(220)} className="border-t border-foreground/15 pt-6 lg:col-start-2 lg:row-start-3 lg:self-end">
          <p className="text-base font-medium">{r.eyebrow}</p>
          <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {r.bullets.map((b) => (
              <li key={b} className="flex gap-3">
                <span aria-hidden className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <HeroImageControls hero={hero} />
      <CopyRewriteControls />
    </section>
  );
}
