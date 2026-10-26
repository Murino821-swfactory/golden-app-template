"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroImageControls } from "@/components/sections/hero-image-controls";
import { CopyRewriteControls } from "@/components/sections/copy-rewrite-panel";
import { ProductPreview } from "@/components/sections/product-preview";
import { useContent } from "@/hooks/use-content";
import { useHeroImage } from "@/hooks/use-hero-image";
import { heroNamePlacement, heroObjectKind } from "@/lib/editorial";
import { HERO_TEXT_SHADOW, heroOverlayBackground } from "@/lib/hero-overlay";
import { landingActionHref } from "@/lib/landing-action";
import { formatPrice, listingCards, type ListingCard } from "@/lib/listings";
import { localePath } from "@/lib/locale-routing";
import { config } from "@/lib/prototype-config";
import { cn } from "@/lib/utils";
import { DisplayText, Eyebrow, TwoTone } from "./ui";

/**
 * The editorial hero (default since 2026-10-26), after the reference landings the founder
 * chose: an eyebrow pill between two hairlines, a display headline set light with one
 * phrase in weight, a two-tone subheadline, one action — and under them the product itself
 * in a lit frame rising from the fold: the sample records the grid will show, else the
 * first offers of the catalogue. Same contract as the shared hero — headline, subheadline
 * and CTA from `prototype.config.json`, exactly one link, `[data-app-name]` once, the
 * creator's hero-image and "Edit texts" controls.
 *
 * The AI hero image keeps both shapes (`lib/hero-image.ts`): `background` fills the hero
 * under the words exactly as the shared hero draws it; `object` is a figure beside the
 * words, lit from behind, with no text over it to keep readable.
 *
 * `overflow-clip`, not `-hidden`: a hidden overflow is a scroll container, and the
 * scroll-driven reveals in `editorial.css` would measure against it instead of the page.
 */

const listings = config.patterns.listings;

/** The AI background, as the shared hero draws it: full-bleed, under the words, faded into the page. */
function HeroBackground({ src }: { src: string }) {
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

/** The AI object: a figure beside the words, in a pool of the accent — never under the text. */
function HeroObject({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <figure data-hero-object aria-hidden className="editorial-object editorial-enter relative mx-auto mt-10 w-full max-w-md lg:mt-0 lg:max-w-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        decoding="async"
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        className={cn("editorial-object-image w-full transition-opacity duration-700 motion-reduce:transition-none", loaded ? "opacity-100" : "opacity-0")}
      />
    </figure>
  );
}

/** The first offers of the catalogue, drawn the way the cards draw them — without links,
 * so the hero keeps its one action. Not `h3`s: the hero's only heading is the headline. */
function HeroOffers({ cards }: { cards: ListingCard[] }) {
  const t = useTranslations("listings");
  const locale = useLocale();
  return (
    <ul data-hero-offers className="grid gap-2 sm:grid-cols-3">
      {cards.map((card) => {
        const price = card.price !== undefined && listings?.currency ? formatPrice(card.price, listings.currency, locale) : null;
        return (
          <li key={card.id} data-hero-offer className="editorial-offer rounded-xl p-4 text-left">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{card.categoryLabel}</p>
            <p data-offer-title className="mt-2 text-sm font-medium leading-snug">{card.title}</p>
            <p className="mt-2 text-base font-medium tabular-nums">
              {price === null ? t("priceOnRequest") : card.pricePeriod === "month" ? t("perMonth", { price }) : price}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function HeroSection() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const content = useContent();
  const landing = content.landing;
  const action = landingActionHref(config.patterns);
  // A route is served per language; an anchor is the same on every document.
  const href = action && action.startsWith("/") ? localePath(locale, action) : action;
  const hero = useHeroImage();
  const headline = landing?.headline ?? t("title");
  const subheadline = landing?.subheadline ?? t("subtitle");
  const eyebrow = landing?.eyebrow;

  const samples = config.patterns.dataGrid ? (content.dataGrid?.sampleRecords?.length ?? 0) : 0;
  const offers = listings ? listingCards(listings, content.listings).slice(0, 3) : [];
  const kind = heroObjectKind({ samples, offers: offers.length });
  const hasFrame = kind !== "none";
  const name = heroNamePlacement({ hasFrame, customEyebrow: Boolean(eyebrow) });

  const background = hero.src && hero.placement === "background" ? hero.src : null;
  const object = hero.src && hero.placement === "object" ? hero.src : null;

  return (
    <section id="hero" data-section="hero" className="editorial-hero scroll-mt-24 relative isolate w-full overflow-clip">
      {background ? <HeroBackground key={background} src={background} /> : null}

      <div
        className={cn(
          "mx-auto w-full max-w-6xl px-4 pt-16 sm:pt-24",
          object && "lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-12"
        )}
      >
        {/* Each child enters in turn on load (.editorial-enter, nth-child delays); the group
            drifts up and fades as the page scrolls away (.editorial-hero-copy). */}
        <div
          className={cn("editorial-hero-copy flex flex-col items-center gap-6 text-center", object && "lg:items-start lg:text-left")}
          style={background ? { textShadow: HERO_TEXT_SHADOW } : undefined}
        >
          <Eyebrow lines={!object} className="editorial-enter" data-app-name={name === "eyebrow" ? "" : undefined}>
            {eyebrow ?? config.appName}
          </Eyebrow>
          <h1 className="editorial-enter editorial-display max-w-4xl text-balance">
            <DisplayText text={headline} />
          </h1>
          <p className="editorial-enter max-w-2xl text-balance text-muted-foreground sm:text-lg">
            <TwoTone text={subheadline} />
          </p>
          {/* One next step, as the contract requires (tests/landing-action.spec.ts); the
              fold-cut frame below is the invitation to scroll. */}
          {href && (
            <Button asChild size="lg" className="editorial-pill editorial-enter h-12 rounded-full px-6 text-sm">
              <Link href={href}>
                {content.cta?.label ?? t("cta")}
                <ArrowUpRight aria-hidden className="size-4" />
              </Link>
            </Button>
          )}
          {name === "hidden" && (
            <span data-app-name className="sr-only">
              {config.appName}
            </span>
          )}
        </div>

        {object && <HeroObject src={object} />}
      </div>

      {hasFrame && (
        <div className="mx-auto w-full max-w-6xl px-4">
          {/* The fold cuts the frame: the mask fades it into the page below. It rises on
              load and tilts flat as the first scroll brings it up (.editorial-frame). */}
          <div className="editorial-fold editorial-enter relative mt-14 h-[20rem] overflow-clip sm:mt-16 sm:h-[24rem]">
            <div data-hero-frame className="editorial-frame mx-auto w-full max-w-4xl rounded-t-3xl">
              <div className="flex items-center gap-1.5 px-4 py-3">
                <span aria-hidden className="size-2.5 rounded-full bg-muted-foreground/40" />
                <span aria-hidden className="size-2.5 rounded-full bg-muted-foreground/40" />
                <span aria-hidden className="size-2.5 rounded-full bg-muted-foreground/40" />
                <span data-app-name className="ml-2 text-xs font-medium text-muted-foreground">
                  {config.appName}
                </span>
              </div>
              <div className="px-3 pb-3 sm:px-4 sm:pb-4">{kind === "preview" ? <ProductPreview /> : <HeroOffers cards={offers} />}</div>
            </div>
          </div>
        </div>
      )}

      <HeroImageControls hero={hero} />
      <CopyRewriteControls />
    </section>
  );
}
