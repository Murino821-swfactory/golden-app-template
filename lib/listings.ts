/**
 * listings.ts — the public catalogue of offers. Pure, so the rules are testable without a
 * browser (`tests/listings.spec.ts`).
 *
 * Phase A (founder decision 2026-10-09): the offers live in `prototype.config.json`,
 * written by the content call as ILLUSTRATIVE examples. They are static and public — no
 * Firestore read, no rules change. An owner-managed catalogue is a later phase.
 */
import type { ListingsCopy, ListingsPattern } from "./prototype-config";

export type ListingItem = ListingsPattern["items"][number];

/** One offer as a card renders it: structure plus the copy for the language on screen. */
export interface ListingCard {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  summary: string;
  highlights: string[];
  status: NonNullable<ListingItem["status"]>;
  price?: number;
  pricePeriod: NonNullable<ListingItem["pricePeriod"]>;
  facts: Array<{ key: string; label: string; value: number; unit?: string }>;
  location?: { lat: number; lng: number };
}

const own = <T>(record: Record<string, T> | undefined, key: string): T | undefined =>
  record && Object.hasOwn(record, key) ? record[key] : undefined;

export function listingCards(listings: ListingsPattern, copy: ListingsCopy | undefined): ListingCard[] {
  return listings.items.map((item) => {
    const text = own(copy?.items, item.id);
    return {
      id: item.id,
      category: item.category,
      categoryLabel: own(copy?.categoryLabels, item.category) ?? item.category,
      title: text?.title ?? item.id,
      summary: text?.summary ?? "",
      highlights: text?.highlights ?? [],
      status: item.status ?? "available",
      ...(item.price !== undefined ? { price: item.price } : {}),
      pricePeriod: item.pricePeriod ?? "once",
      facts: (listings.attributes ?? []).flatMap(({ key, unit }) => {
        const value = own(item.attributes, key);
        if (value === undefined) return [];
        return [{ key, label: own(copy?.attributeLabels, key) ?? key, value, ...(unit ? { unit } : {}) }];
      }),
      ...(item.location ? { location: item.location } : {}),
    };
  });
}

/** `null` = every category. An unknown category shows nothing rather than everything. */
export function filterByCategory(cards: readonly ListingCard[], category: string | null): ListingCard[] {
  return category === null ? [...cards] : cards.filter((card) => card.category === category);
}

/** Categories that actually have an offer, in the configured order. */
export function usedCategories(listings: ListingsPattern): string[] {
  const used = new Set(listings.items.map((item) => item.category));
  return listings.categories.filter((key) => used.has(key));
}

export function formatPrice(price: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

/** The offers that have a place, as map pins. */
export function listingPoints(cards: readonly ListingCard[]): MapPoint[] {
  return cards.flatMap((card) => (card.location ? [{ id: card.id, ...card.location, label: card.title }] : []));
}
