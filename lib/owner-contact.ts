/**
 * owner-contact.ts — the prototype owner's public card and the owner's controls.
 *
 * Server: factory-web `prototypeOwnerContact`. Visitors read `<basePath>/owner-contact.json`;
 * this repo ships a static `{}` there, so the sandbox smoke gate and CI (no functions) get a
 * 200. `/api/*` is called only for a signed-in user on a published prototype
 * (`ownerActionsAvailable`) — same rule as the hero image.
 */
export const OWNER_CONTACT_API = "/api/prototype-owner-contact";
/** The owner's public profile: the contact card plus a role, a short bio, where they work
 * and a website (2026-10-09). Same list and limits as factory-web `owner-contact-core.ts`;
 * the owner types every field, no model writes it. */
export const OWNER_CARD_FIELDS = [
  "firstName",
  "lastName",
  "address",
  "phone",
  "email",
  "headline",
  "bio",
  "serviceArea",
  "website",
] as const;
export type OwnerCardField = (typeof OWNER_CARD_FIELDS)[number];
export type OwnerCard = Partial<Record<OwnerCardField, string>>;
export type OwnerRole = "owner" | "admin";

export interface OwnerStatus {
  role: OwnerRole;
  card: OwnerCard;
  unreadMessages: number;
}

export function parseOwnerCard(body: unknown): OwnerCard {
  const out: OwnerCard = {};
  if (typeof body !== "object" || body === null) return out;
  for (const field of OWNER_CARD_FIELDS) {
    const v = (body as Record<string, unknown>)[field];
    if (typeof v === "string" && v.trim()) out[field] = v;
  }
  return out;
}

export const cardIsEmpty = (card: OwnerCard) => Object.keys(card).length === 0;

export function fullName(card: OwnerCard): string | null {
  const name = [card.firstName, card.lastName].filter(Boolean).join(" ");
  return name || null;
}

/** The card's website as a link, or null: only `https:` reaches an href, whatever the
 * stored value — the server checks the same, this is the second guard at render time. */
export function websiteHref(website: string | undefined): string | null {
  if (!website) return null;
  try {
    const url = new URL(website);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** The website as a visitor reads it: host and path, no scheme. */
export const websiteText = (href: string) => href.replace(/^https:\/\//, "").replace(/\/$/, "");

export const telHref = (phone: string) => `tel:${phone.replace(/[^+0-9]/g, "")}`;

export const mapsHref = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export function parseOwnerStatus(body: unknown): OwnerStatus | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (b.role !== "owner" && b.role !== "admin") return null;
  const unread = typeof b.unreadMessages === "number" && Number.isInteger(b.unreadMessages) && b.unreadMessages > 0 ? b.unreadMessages : 0;
  return { role: b.role, card: parseOwnerCard(b.card), unreadMessages: unread };
}

export function ownerActionsAvailable(basePath: string, slug: string | null): boolean {
  return basePath.startsWith("/newapp/") && Boolean(slug);
}

export async function fetchOwnerCard(basePath: string): Promise<OwnerCard> {
  try {
    const res = await fetch(`${basePath}/owner-contact.json`, { cache: "no-cache" });
    if (!res.ok) return {};
    return parseOwnerCard(await res.json());
  } catch (err) {
    console.warn("[owner-contact] card unavailable:", err);
    return {};
  }
}

export type OwnerContactAction = { action: "status" } | { action: "save"; card: OwnerCard };

export async function postOwnerContact(
  token: string,
  slug: string,
  action: OwnerContactAction
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(OWNER_CONTACT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ slug, ...action }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
