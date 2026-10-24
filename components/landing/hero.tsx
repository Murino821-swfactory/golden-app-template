"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { HeroImageControls } from "@/components/sections/hero-image-controls";
import { CopyRewriteControls } from "@/components/sections/copy-rewrite-panel";
import { useContent } from "@/hooks/use-content";
import { useHeroImage } from "@/hooks/use-hero-image";
import { HERO_TEXT_SHADOW, heroOverlayBackground } from "@/lib/hero-overlay";
import { HERO_VIDEO, type HeroVideo } from "@/lib/hero-video";
import { landingActionHref } from "@/lib/landing-action";
import { landingCopy } from "@/lib/landing/copy";
import { localePath } from "@/lib/locale-routing";
import { config } from "@/lib/prototype-config";
import { cn } from "@/lib/utils";
import { StudioPreview } from "./studio-preview";
import { Eyebrow } from "./ui";

/**
 * The GitPulse Studio hero (2026-10-23), after the Indoobit case study on mdx.so: an
 * eyebrow between two hairlines, a light-weight headline, one action, and the product
 * itself rising from the fold. Same contract as the template's hero — headline and
 * subheadline from `prototype.config.json`, `[data-app-name]` (the title of the studio
 * window below, rather than a second kicker over the headline), the creator's hero-image
 * and "Edit texts" controls — on top of the demo's looping Veo video (`lib/hero-video.ts`).
 *
 * `overflow-clip`, not `-hidden`: a hidden overflow is a scroll container, and the
 * scroll-driven reveals in `app/landing.css` would then measure against it instead of the
 * page and never fire.
 */

/** The demo's looping video; the poster stays when it cannot play. */
function HeroVideoBackground({ video, poster }: { video: HeroVideo; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.play().catch(() => undefined);
  }, []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <video ref={ref} data-hero-video poster={poster} muted loop playsInline preload="metadata" className="landing-hero-video h-full w-full object-cover">
        {video.sources.map((s) => (
          <source key={s.src} src={s.src} type={s.type} media={s.media} />
        ))}
      </video>
      <div className="absolute inset-0" style={{ background: heroOverlayBackground() }} />
    </div>
  );
}

function HeroImageBackground({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* next/image cannot optimise in a static export; this is a plain decorative img. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-hero-image
        src={src}
        alt=""
        decoding="async"
        fetchPriority="low"
        onLoad={() => setLoaded(true)}
        className={cn("h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none", loaded ? "opacity-100" : "opacity-0")}
      />
      <div className="absolute inset-0" style={{ background: heroOverlayBackground() }} />
    </div>
  );
}

export function HeroSection() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const words = landingCopy(locale);
  const content = useContent();
  const landing = content.landing;
  const action = landingActionHref(config.patterns);
  // A route is served per language; an anchor is the same on every document.
  const href = action && action.startsWith("/") ? localePath(locale, action) : action;
  const hero = useHeroImage();
  const backdrop = Boolean(HERO_VIDEO || hero.src);

  return (
    <section id="hero" data-section="hero" className="landing-hero scroll-mt-24 relative isolate w-full overflow-clip">
      {HERO_VIDEO ? <HeroVideoBackground video={HERO_VIDEO} poster={hero.src ?? HERO_VIDEO.poster} /> : hero.src ? <HeroImageBackground key={hero.src} src={hero.src} /> : null}

      <div className="mx-auto w-full max-w-6xl px-4 pt-16 sm:pt-24">
        {/* Each child enters in turn on load (.landing-enter, nth-child delays); the group
            drifts up and fades as the page scrolls away (.landing-hero-copy). */}
        <div className="landing-hero-copy flex flex-col items-center gap-6 text-center" style={backdrop ? { textShadow: HERO_TEXT_SHADOW } : undefined}>
          <Eyebrow lines className="landing-enter">
            {words.hero.eyebrow}
          </Eyebrow>
          <h1 className="landing-enter max-w-4xl text-balance text-[2.75rem] font-light leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
            {landing?.headline ?? t("title")}
          </h1>
          <p className="landing-enter max-w-2xl text-balance text-muted-foreground sm:text-lg">{landing?.subheadline ?? t("subtitle")}</p>
          {/* One next step, as the template's contract requires (tests/landing-action.spec.ts);
              Indoobit's second "Learn more" button is the fold-cut studio below instead. */}
          {href && (
            <Button asChild size="lg" className="landing-enter h-11 rounded-full px-6 text-sm">
              <Link href={href}>{content.cta?.label ?? t("cta")}</Link>
            </Button>
          )}
        </div>

        {/* The fold cuts the studio: the mask fades it into the page below. It rises on load
            and tilts flat as the first scroll brings it up (.landing-frame). */}
        <div className="landing-fold landing-enter relative mt-14 h-[22rem] overflow-clip sm:mt-16 sm:h-[26rem]">
          <StudioPreview />
        </div>
      </div>

      <HeroImageControls hero={hero} />
      <CopyRewriteControls />
    </section>
  );
}
