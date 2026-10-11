"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Info, Map as MapIcon } from "lucide-react";
import { MapBase } from "@/components/patterns/map-base";
import { Button } from "@/components/ui/button";
import { useContent } from "@/hooks/use-content";
import { selectInquiry } from "@/lib/listing-inquiry";
import {
  filterByCategory,
  formatNumber,
  formatPrice,
  listingCards,
  listingPoints,
  usedCategories,
  type ListingCard,
} from "@/lib/listings";
import { config } from "@/lib/prototype-config";
import { cn } from "@/lib/utils";

const listings = config.patterns.listings;
const hasMap = config.patterns.mapBase !== undefined;
const hasContact = config.patterns.landing?.sections.includes("contact") ?? false;

function Price({ card }: { card: ListingCard }) {
  const t = useTranslations("listings");
  const locale = useLocale();
  if (card.price === undefined || !listings?.currency) {
    return <p className="text-lg font-semibold">{t("priceOnRequest")}</p>;
  }
  const amount = formatPrice(card.price, listings.currency, locale);
  return (
    <p className="text-lg font-semibold tabular-nums">
      {card.pricePeriod === "month" ? t("perMonth", { price: amount }) : amount}
    </p>
  );
}

function ListingCardView({ card, inquireLabel }: { card: ListingCard; inquireLabel?: string }) {
  const t = useTranslations("listings");
  const locale = useLocale();
  const available = card.status === "available";
  return (
    <li data-listing={card.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wider">
        <span className="text-muted-foreground">{card.categoryLabel}</span>
        <span className={cn("rounded-full border px-2 py-0.5", available ? "border-primary text-primary" : "border-border text-muted-foreground")}>
          {t(`status.${card.status}`)}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-medium text-balance">{card.title}</h3>
      <div className="mt-2">
        <Price card={card} />
      </div>
      {card.facts.length > 0 && (
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {card.facts.map((fact) => (
            <div key={fact.key} className="flex gap-1.5">
              <dt className="text-muted-foreground">{fact.label}</dt>
              <dd className="font-medium tabular-nums">
                {formatNumber(fact.value, locale)}
                {fact.unit ? ` ${fact.unit}` : ""}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {card.summary && <p className="mt-3 text-sm text-muted-foreground">{card.summary}</p>}
      {card.highlights.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {card.highlights.map((highlight, i) => (
            <li key={i} className="rounded-md bg-muted px-2 py-1 text-xs">{highlight}</li>
          ))}
        </ul>
      )}
      {hasContact && inquireLabel && card.status !== "unavailable" && (
        <div className="mt-auto pt-5">
          <Button asChild variant="outline" className="h-11 w-full">
            {/* A same-page hash: LandingStory turns it into the contact chapter on desktop,
                the browser scrolls to it everywhere else. */}
            <a href="#contact" onClick={() => selectInquiry({ id: card.id, title: card.title })}>
              {inquireLabel}
            </a>
          </Button>
        </div>
      )}
    </li>
  );
}

/**
 * The offers (pattern `listings`). Phase A: illustrative offers from the config, static
 * and public. The map is mounted only when the visitor asks for it — its tiles come from a
 * third-party CDN, and a page that fetched them on load would put a network dependency
 * into every prototype's console-clean smoke gate.
 */
export function ListingsSection() {
  const t = useTranslations("listings");
  const copy = useContent().listings;
  const [category, setCategory] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const cards = useMemo(() => (listings ? listingCards(listings, copy) : []), [copy]);
  const points = useMemo(() => listingPoints(cards), [cards]);
  if (!listings || !copy) return null;

  const categories = usedCategories(listings);
  const visible = filterByCategory(cards, category);

  return (
    <section data-section="listings" className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
      <h2 className="text-balance text-center text-3xl font-semibold tracking-tight">{copy.heading}</h2>
      {copy.intro && <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">{copy.intro}</p>}
      <p data-listings-notice className="mx-auto mt-4 flex max-w-2xl items-start justify-center gap-2 text-center text-xs text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        {copy.notice}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {categories.length > 1 && (
          <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap justify-center gap-2">
            {[null, ...categories].map((key) => (
              <Button
                key={key ?? "all"}
                type="button"
                size="sm"
                variant={category === key ? "default" : "outline"}
                aria-pressed={category === key}
                className="h-11 sm:h-9"
                onClick={() => setCategory(key)}
              >
                {key === null ? t("all") : (Object.hasOwn(copy.categoryLabels, key) ? copy.categoryLabels[key] : key)}
              </Button>
            ))}
          </div>
        )}
        {hasMap && points.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-expanded={showMap}
            className="h-11 sm:h-9"
            onClick={() => setShowMap((open) => !open)}
          >
            <MapIcon aria-hidden className="size-4" />
            {showMap ? t("hideMap") : t("showMap")}
          </Button>
        )}
      </div>

      {showMap && (
        <div className="mt-6">
          <MapBase points={points} />
        </div>
      )}

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((card) => (
          <ListingCardView key={card.id} card={card} inquireLabel={copy.inquireLabel} />
        ))}
      </ul>
    </section>
  );
}
