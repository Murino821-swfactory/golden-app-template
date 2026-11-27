/**
 * A customer's texts on the golden demo (founder, 2026-11-27).
 *
 * "Build it now" in tokenwise.sk's project chat used to start a build of half an hour, and a
 * visitor who leaves the chat while it runs is lost. So the model now writes only the WORDS —
 * the golden demo's own text slots, nothing else — and the golden demo shows them in the
 * visitor's browser, the way "My brand" shows a brand (`lib/brand-try.ts`): no build, no commit,
 * no test run. The structure — sections, patterns, fields, the offers' numbers, the theme — stays
 * the build's, so what the customer sees is the tested golden demo with their words in it.
 *
 * What may be shown is decided here, purely (`withCustomerTexts`):
 * - only on the golden demo (`patterns.landing.tryIt`): a customer's own page never takes words
 *   from a link — the lesson of the removed `?sections=` parameter (app/[locale]/page.tsx);
 * - only the app's name and the words are taken; everything else is the build's;
 * - the build's default language is required, and only languages the build serves are taken;
 * - every value the demo's words have is there again, of the same kind, lists keep the demo's
 *   lengths and no text is blank — so no section mixes the demo's words with the customer's;
 * - the result passes the template's own parser (lengths, enums, cross-references).
 *
 * Where the words come from: a preview link `?preview=<token>`; the loader
 * (`components/editorial/customer-texts.tsx`) asks the site's API for them. Shown, not kept:
 * nothing is stored in the browser, and a reload asks again.
 */
import { config as builtConfig, parsePrototypeConfig, type PrototypeConfig } from "./prototype-config";

/** The longest app name taken — the factory's chat caps the name it asks for at the same 100. */
export const APP_NAME_MAX = 100;

/** A preview link's token: unguessable, URL-safe and never a path. */
export const PREVIEW_TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

/** Where a preview link's words are asked for when the build names no other API. */
export const PREVIEW_API_DEFAULT = "/api/prototype-preview";

/** How long the page waits, unseen, for a preview link's words before it shows the demo as it is.
 * `app/globals.css` uncovers the page after the same time even if no script runs. */
export const CUSTOMER_TEXTS_TIMEOUT_MS = 8_000;

export type CustomerTextsResult = { ok: true; config: PrototypeConfig } | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Every place where the demo's words have a value must have one of the same kind in `words`. */
function sameShape(demo: unknown, words: unknown, path: string, issues: string[]): void {
  if (Array.isArray(demo)) {
    if (!Array.isArray(words)) issues.push(`${path}: expected a list`);
    else if (words.length !== demo.length) issues.push(`${path}: expected ${demo.length} items, got ${words.length}`);
    else demo.forEach((item, index) => sameShape(item, words[index], `${path}.${index}`, issues));
    return;
  }
  if (isRecord(demo)) {
    if (!isRecord(words)) issues.push(`${path}: expected an object`);
    else for (const [key, value] of Object.entries(demo)) sameShape(value, words[key], `${path}.${key}`, issues);
    return;
  }
  if (typeof words !== typeof demo) issues.push(`${path}: expected a ${typeof demo}`);
  else if (typeof words === "string" && !words.trim()) issues.push(`${path}: blank text`);
}

/**
 * Pure: the build's config with a customer's name and words in it — or why they cannot be shown.
 * `raw` is `{ appName?, content: { <locale>: <the demo's words, rewritten> } }`.
 */
export function withCustomerTexts(base: PrototypeConfig, raw: unknown): CustomerTextsResult {
  if (base.patterns.landing?.tryIt !== true) {
    return { ok: false, error: "a customer's words are shown on the golden demo only" };
  }
  if (!isRecord(raw) || !isRecord(raw.content)) {
    return { ok: false, error: "content: expected an object with one entry per language" };
  }
  const { appName, content } = raw;
  if (appName !== undefined && (typeof appName !== "string" || !appName.trim() || appName.length > APP_NAME_MAX)) {
    return { ok: false, error: `appName: expected a name of 1 to ${APP_NAME_MAX} characters` };
  }

  const served: readonly string[] = base.locales;
  const given = Object.keys(content);
  const foreign = given.filter((locale) => !served.includes(locale));
  if (foreign.length) return { ok: false, error: `content: languages this build does not serve: ${foreign.join(", ")}` };
  if (!given.includes(base.defaultLocale)) {
    return { ok: false, error: `content.${base.defaultLocale}: the build's default language is required` };
  }
  // The default language first: downstream, the first language is the one the bare path shows.
  const locales = [base.defaultLocale, ...served.filter((locale) => locale !== base.defaultLocale && given.includes(locale))];

  const demo = base.content[base.defaultLocale];
  const issues: string[] = [];
  for (const locale of locales) sameShape(demo, content[locale], `content.${locale}`, issues);
  if (issues.length) return { ok: false, error: issues.join("\n") };

  try {
    const shown = parsePrototypeConfig({
      ...base,
      appName: typeof appName === "string" ? appName.trim() : base.appName,
      locales,
      content: Object.fromEntries(locales.map((locale) => [locale, content[locale]])),
    });
    return { ok: true, config: shown };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** The token of a preview link's query (`location.search`), or null when there is none or it is not one. */
export function previewTokenFrom(search: string): string | null {
  const token = new URLSearchParams(search).get("preview");
  return token && PREVIEW_TOKEN.test(token) ? token : null;
}

/** Where a preview link's words are asked for: the site's own API, unless the build names another. */
export function previewApiUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_PREVIEW_API || PREVIEW_API_DEFAULT).replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(token)}`;
}

/**
 * Before the first paint, a page opened from a preview link is marked as waiting for its words,
 * so the demo's own words never flash first (`app/globals.css` keeps it unseen meanwhile). It is
 * rendered by the shell for a `tryIt` build only, right after the theme's bootstrap.
 */
export const CUSTOMER_TEXTS_BOOTSTRAP = `(function(){try{var t=new URLSearchParams(location.search).get("preview");if(t&&${PREVIEW_TOKEN}.test(t))document.documentElement.setAttribute("data-customer-texts","loading")}catch(e){}})();`;

// ── The store the page reads (outside React, like "My brand") ───────────────────────────────

let shown: PrototypeConfig | null = null;
const listeners = new Set<() => void>();

export const customerTexts = {
  /** The config with the customer's words, or null while the page shows the build's own. */
  get: (): PrototypeConfig | null => shown,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Shows the words when they may be shown; the result says why not otherwise. Nothing is stored. */
  show(raw: unknown, base: PrototypeConfig = builtConfig): CustomerTextsResult {
    const result = withCustomerTexts(base, raw);
    if (result.ok) {
      shown = result.config;
      for (const listener of listeners) listener();
    }
    return result;
  },
};
