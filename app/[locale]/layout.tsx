import type { Metadata } from "next";
import { PrototypeShell, metadataFor } from "../shell";
import { config } from "@/lib/prototype-config";

/**
 * Root layout for the PREFIXED languages — `/sk`, `/de`, … — one per declared locale that
 * is not the default. The default locale is served at the bare path by `app/(default)/`;
 * `lib/locale-routing.ts` says why it lives there and not here as well.
 *
 * This is a root layout (it renders `<html>`), which is allowed because there is no
 * `app/layout.tsx`: a root layout at the top of `app/` gets no route params and so could
 * never know which language it was rendering.
 */

/**
 * The languages this prototype declared, minus the one already served at the bare path —
 * so a two-language prototype emits `/` and `/sk` and nothing else.
 *
 * The fallback is not a preference. Next 16 refuses the empty set outright: *"Page
 * '/[locale]/login' returned an empty array from generateStaticParams(). With
 * output: export, at least one route must be generated."* A single-language prototype —
 * most of them — would otherwise fail its own build here, so it emits its one language
 * under the prefix as well. Nothing links to that copy (`localePath` sends the default
 * locale to the bare path) and its canonical names the bare URL, so it identifies itself
 * as the duplicate it is instead of competing with the page the customer was given.
 */
export function generateStaticParams(): Array<{ locale: string }> {
  const prefixed = config.locales.filter((locale) => locale !== config.defaultLocale);
  return (prefixed.length > 0 ? prefixed : config.locales).map((locale) => ({ locale }));
}

/** `output: "export"` has no server to render an unlisted param, so asking for one is a
 * 404 from the file host rather than a build-time surprise. Stated rather than left to the
 * default, which is `true`. */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataFor(locale);
}

export default async function LocaleRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <PrototypeShell locale={locale}>{children}</PrototypeShell>;
}
