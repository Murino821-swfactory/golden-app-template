/**
 * The showcase strip (founder, 2026-10-27): the live products tokenwise has built, shown
 * on EVERY prototype under its features as two rows of tiles sliding in opposite directions
 * — the same strip the tokenwise.sk landing shows. A fixed element: an advertisement for
 * the factory's other work, not something the customer's copy changes. The pictures ship
 * in `public/showcase/<key>.webp` (640 × 400, the landing's own screenshots), so every
 * export carries them and no prototype depends on tokenwise.sk being up.
 *
 * Order matters: the first row keeps the leading tiles. The kind of each product is chrome
 * (`showcase.kinds.<key>` in `messages/*.json`) so a Slovak prototype reads Slovak.
 */

export interface ShowcaseItem {
  key: string;
  name: string;
  href: string;
}

export const SHOWCASE: readonly ShowcaseItem[] = [
  { key: "factory-web", name: "tokenwise.sk", href: "https://tokenwise.sk/" },
  { key: "gitpulse-studio", name: "GitPulse Studio", href: "https://apps.tokenwise.sk/newapp/gitpulse-studio" },
  { key: "wellnesspodhajska", name: "Wellness Podhájska", href: "https://wellnesspodhajska-63bcd.web.app/en" },
  { key: "wismeo", name: "Wismeo", href: "https://property-portfolio-6934a.web.app/en" },
  { key: "law-expert", name: "Law Expert", href: "https://lawexpert.tokenwise.sk/" },
  { key: "gameday", name: "GameDay", href: "https://gameday-app-e4f3d.web.app/" },
  { key: "collectibles", name: "Assetide", href: "https://your-card-collection-2026.web.app/" },
  { key: "propcheck", name: "PropCheck", href: "https://prop-check.web.app/" },
  { key: "cv-matcher", name: "CV Matcher", href: "https://cvmatcher.tokenwise.sk/" },
];

/** The picture of one product, under this build's base path. */
export function showcaseImage(basePath: string, item: ShowcaseItem): string {
  return `${basePath}/showcase/${item.key}.webp`;
}

/**
 * Where a tile leads, tagged so the funnel can tell which prototype sent the visitor —
 * the same parameters as "Built by TOKENWISE" (`brandHref`), medium `showcase`.
 */
export function showcaseHref(item: ShowcaseItem, slug: string | null): string {
  const url = new URL(item.href);
  url.searchParams.set("utm_source", "prototype");
  url.searchParams.set("utm_medium", "showcase");
  if (slug) url.searchParams.set("utm_content", slug);
  return url.toString();
}
