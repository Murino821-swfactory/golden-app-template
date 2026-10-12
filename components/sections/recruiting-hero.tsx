"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check } from "lucide-react";
import { useContent } from "@/hooks/use-content";
import { RECRUITING_COPY, recruitingLocale } from "@/lib/recruiting/copy";
import { localePath } from "@/lib/locale-routing";
import { landingActionHref } from "@/lib/landing-action";
import { config } from "@/lib/prototype-config";
import { cn } from "@/lib/utils";
import { CopyRewriteControls } from "./copy-rewrite-panel";

/**
 * This prototype's hero (replaces the template's in `app/[locale]/page.tsx`): the Gemini
 * illustration of a pipeline as the backdrop, the headline on its dark left third, and a
 * static miniature of the board so the product shows itself before the first click.
 *
 * Copy still comes from `prototype.config.json` (headline, subheadline, CTA label); the
 * recruiting-specific words — bullets, the second CTA, the preview — are in
 * `lib/recruiting/copy.ts`. Fixed status colours on the preview are the board's own.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const STAGE_RING: Record<string, string> = {
  screening: "ring-sky-400/40 text-sky-200",
  submitted: "ring-sky-400/40 text-sky-200",
  interview: "ring-amber-400/40 text-amber-200",
  offer: "ring-amber-400/40 text-amber-200",
};

export function RecruitingHero() {
  const t = useTranslations("landing");
  const content = useContent();
  const locale = useLocale();
  const r = RECRUITING_COPY[recruitingLocale(locale)];
  const landing = content.landing;
  const href = landingActionHref(config.patterns);
  const headline = landing?.headline ?? t("title");
  const subheadline = landing?.subheadline ?? t("subtitle");

  return (
    <section data-section="hero" className="relative isolate w-full overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* next/image cannot optimise in a static export; a plain decorative picture. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BASE_PATH}/images/hero-pipeline.webp`}
          srcSet={`${BASE_PATH}/images/hero-pipeline-800.webp 800w, ${BASE_PATH}/images/hero-pipeline.webp 1376w`}
          sizes="100vw"
          alt=""
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover object-right opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-24">
        <div className="flex flex-col items-start gap-5">
          <p data-app-name className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{config.appName}</p>
          <p className="text-sm font-medium text-foreground/80">{r.landing.eyebrow}</p>
          <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{headline}</h1>
          <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">{subheadline}</p>
          <ul className="space-y-1.5 text-sm">
            {r.landing.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-1">
            {href && (
              <Link
                href={href}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background shadow-lg shadow-black/20 hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {content.cta?.label ?? t("cta")}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            )}
            <Link
              href={localePath(locale, "/workspace/matcher")}
              className="inline-flex min-h-12 items-center rounded-xl border border-foreground/30 bg-background/40 px-5 text-sm font-medium backdrop-blur hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              {r.landing.matcherCta}
            </Link>
          </div>
        </div>

        <figure aria-hidden className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="rounded-2xl border border-foreground/15 bg-card/80 p-3 shadow-2xl shadow-black/40 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs font-medium text-muted-foreground">{r.landing.previewTitle}</span>
              <span className="flex gap-1">
                <span className="size-2 rounded-full bg-muted-foreground/40" />
                <span className="size-2 rounded-full bg-muted-foreground/40" />
                <span className="size-2 rounded-full bg-muted-foreground/40" />
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {r.landing.previewCards.map((card) => (
                <div key={card.stage} className="rounded-xl bg-background/70 p-2">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{r.stages[card.stage as keyof typeof r.stages]}</p>
                  <div className="mt-2 rounded-lg bg-card p-2 ring-1 ring-foreground/10">
                    <p className="truncate text-[11px] font-medium">{card.name}</p>
                    <p className={cn("mt-1 inline-block rounded-full px-1.5 text-[10px] font-medium ring-1 ring-inset", STAGE_RING[card.stage] ?? "ring-foreground/20")}>{card.score} %</p>
                  </div>
                  <div className="mt-1.5 h-6 rounded-lg bg-card/60 ring-1 ring-foreground/5" />
                </div>
              ))}
            </div>
          </div>
        </figure>
      </div>
      <CopyRewriteControls />
    </section>
  );
}
