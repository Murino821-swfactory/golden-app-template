/**
 * locale-routing.ts — where each declared language lives, as a path.
 *
 * **The default locale is served at the BARE path and nowhere else.** The others get a
 * `/<locale>` prefix. Two constraints forced that shape, and both are checkable rather
 * than matters of taste:
 *
 * 1. `/newapp/<slug>/` has to be a real document. It is the URL the customer is given,
 *    `factory-web/functions/src/prototype-serve.ts` maps it to `<slug>/index.html`, and
 *    the harness refuses to publish a build whose `out/index.html` does not carry this
 *    build's `<basePath>/_next/` assets (`verifyExportBasePath`, sw-factory
 *    `orchestrator/src/harness/prototype-publish.ts`). The obvious way to make `/` serve a
 *    language under `output: "export"` — a meta-refresh stub at the root — has no such
 *    assets, so it would fail every prototype's own publish gate.
 * 2. Emitting the default locale twice, at `/` and at `/en/`, would put two URLs on
 *    identical copy and make the hreflang set bigger than the set of documents that exist.
 *    One language, one URL.
 *
 * So `app/(default)/` renders the default locale at the bare path and `app/[locale]/`
 * renders the rest. `generateStaticParams` there returns the declared locales minus the
 * default, which for a single-language prototype — most of them — is the empty set, and
 * the build then emits no `[locale]` pages at all.
 */

import { config } from "./prototype-config";

/**
 * Next prefixes `next/link` hrefs with `basePath` itself, but a raw `<link rel="alternate">`
 * is untouched, so `localeHref` adds it and `localePath` does not. Read here rather than
 * from `next.config.ts` because that file is not importable from client code.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** True when this build actually ships the language — not merely when the template could. */
export function isDeclaredLocale(value: string | null | undefined): boolean {
  return typeof value === "string" && (config.locales as readonly string[]).includes(value);
}

/** The in-app path of `route` in `locale`, for `next/link` and `router.push`. */
export function localePath(locale: string, route = "/"): string {
  const normalized = route.startsWith("/") ? route : `/${route}`;
  if (locale === config.defaultLocale) return normalized;
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

/** The same path as a URL a browser can resolve on its own — base path included. */
export function localeHref(locale: string, route = "/"): string {
  return `${BASE_PATH}${localePath(locale, route)}`;
}

/**
 * The route a pathname names, with any locale prefix removed — `/sk/login` → `/login`.
 *
 * `usePathname()` already has `basePath` stripped, so this only has to deal with the
 * locale segment. Used by the language switcher so that switching language keeps the
 * visitor on the page they were reading instead of sending them home.
 */
export function routeFromPathname(pathname: string): string {
  const [, first = "", ...rest] = pathname.split("/");
  if (first !== config.defaultLocale && isDeclaredLocale(first)) {
    return `/${rest.join("/")}`.replace(/\/$/, "") || "/";
  }
  return pathname || "/";
}
