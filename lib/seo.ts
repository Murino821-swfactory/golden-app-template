import type { Metadata, MetadataRoute } from "next";
import { config, contentFor, type PrototypeConfig } from "./prototype-config";
import { localeHref } from "./locale-routing";

/** The publisher supplies the real origin (the harness already does). Never infer a
 * customer's host from its app name. Unconfigured local builds keep relative canonicals. */
export function siteOrigin(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (!value) return undefined;
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_ORIGIN must be an http(s) origin, without a path or credentials");
  }
  return url.origin;
}

export function publicUrl(locale: string, route = "/"): string {
  const path = localeHref(locale, route);
  const origin = siteOrigin();
  return origin ? new URL(path, origin).href : path;
}

export function languageAlternates(): Record<string, string> | undefined {
  if (config.locales.length < 2) return undefined;
  return Object.fromEntries([
    ...config.locales.map((id) => [id, publicUrl(id)]),
    ["x-default", publicUrl(config.defaultLocale)],
  ]);
}

export function landingMetadata(locale: string): Metadata {
  const copy = contentFor(config, locale);
  const origin = siteOrigin();
  return {
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    title: config.appName,
    description: copy.description,
    alternates: { canonical: publicUrl(locale), languages: languageAlternates() },
    openGraph: {
      type: "website", title: config.appName, description: copy.description,
      siteName: config.appName, url: publicUrl(locale), locale,
      alternateLocale: config.locales.filter((id) => id !== locale),
    },
    twitter: { card: "summary", title: config.appName, description: copy.description },
  };
}

export const privateMetadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null, languages: {} },
  openGraph: null,
  twitter: null,
};

export function landingJsonLd(locale: string): string {
  const copy = contentFor(config, locale);
  const url = publicUrl(locale);
  // featureList names only what the features section actually renders — the same honesty
  // rule llmsText follows. No section, no featureList; nothing is claimed that a visitor
  // cannot see on the page.
  const sections = new Set(config.patterns.landing?.sections ?? []);
  const featureList = sections.has("features")
    ? (copy.landing?.features ?? []).map((feature) => feature.title)
    : [];
  const doc = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: config.appName, description: copy.description, inLanguage: config.locales, ...(siteOrigin() ? { url: publicUrl(config.defaultLocale) } : {}) },
      { "@type": "WebPage", name: copy.landing?.headline ?? config.appName, description: copy.description, inLanguage: locale, ...(siteOrigin() ? { url } : {}) },
      // The product itself. WebSite/WebPage describe a page; this says "the thing this page
      // is about is a web application" — the node a search engine or an AI assistant reads
      // to answer "what is <app> and what does it do". Every prototype here is a browser
      // app, so it is always accurate; `applicationCategory` is the broad default since the
      // template serves business/productivity tools. No `offers` and no `aggregateRating`:
      // the config carries no price or review, and discovery must not invent either.
      { "@type": "WebApplication", name: config.appName, description: copy.description, applicationCategory: "BusinessApplication", operatingSystem: "Any", inLanguage: config.locales,
        ...(featureList.length ? { featureList } : {}),
        ...(siteOrigin() ? { url: publicUrl(config.defaultLocale) } : {}) },
    ],
  };
  return JSON.stringify(doc).replace(/</g, "\\u003c");
}

export function publicSitemap(): MetadataRoute.Sitemap {
  if (!siteOrigin()) return []; // a preview cannot claim a production domain
  return config.locales.map((locale) => ({
    url: publicUrl(locale),
    ...(languageAlternates() ? { alternates: { languages: languageAlternates() } } : {}),
  }));
}

/** Only text from sections that actually render. No prices, testimonials, private records
 * or model-created company identity — and no `listings`: those offers are illustrative
 * until the owner publishes real ones, and discovery must not present them as facts. llms.txt is discovery content, not an access control. */
export function llmsText(source: PrototypeConfig = config): string {
  const sections = new Set(source.patterns.landing?.sections ?? []);
  const lines = [`# ${source.appName}`, "", `> ${contentFor(source).description}`, "", "## Public pages", ""];
  for (const locale of source.locales) {
    const copy = contentFor(source, locale);
    lines.push(`- [${source.appName} (${locale})](${publicUrl(locale)}): ${copy.description}`, "", `## ${locale}`, "");
    if (sections.has("hero")) lines.push(copy.landing?.headline ?? source.appName, "", copy.landing?.subheadline ?? "", "");
    if (sections.has("features")) for (const feature of copy.landing?.features ?? []) lines.push(`### ${feature.title}`, "", feature.description, "");
    if (sections.has("howItWorks")) for (const step of copy.landing?.howItWorks?.steps ?? []) lines.push(`### ${step.title}`, "", step.description, "");
    if (sections.has("useCases")) for (const item of copy.useCases?.items ?? []) lines.push(`### ${item.title}`, "", item.situation, "", item.action, "");
    if (sections.has("comparison") && copy.comparison) for (const row of copy.comparison.rows) lines.push(`### ${row.topic}`, "", `${copy.comparison.beforeLabel}: ${row.before}`, "", `${copy.comparison.afterLabel}: ${row.after}`, "");
    if (sections.has("faq")) for (const item of copy.landing?.faq?.items ?? []) lines.push(`### ${item.question}`, "", item.answer, "");
  }
  return lines.join("\n").trimEnd() + "\n";
}
