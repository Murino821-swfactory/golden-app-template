import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/auth-context";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { config, contentFor } from "@/lib/prototype-config";
import { localeHref } from "@/lib/locale-routing";
import { ThemeBootstrap } from "@tokenwise/shared-ui";

/**
 * The document every page of a prototype is rendered into, in one language.
 *
 * It is a component rather than `app/layout.tsx` because a prototype has TWO root layouts:
 * `app/(default)/layout.tsx` serves the default locale at the bare path and
 * `app/[locale]/layout.tsx` serves the others under a prefix (the reasoning is in
 * `lib/locale-routing.ts`). A root layout is the only place `<html lang>` can be set, and a
 * root layout at `app/layout.tsx` receives no route params — so it could never know which
 * language it was rendering, which is how `lang` came to be whatever `getLocale()` returned
 * with no route to read. Both root layouts render this, so the shell still exists once.
 */

// The visitor's palette and font are applied before the first paint by the package's
// `ThemeBootstrap` (first child of <body>, the standard blocking-script slot in the App
// Router), so a returning visitor never sees the customer's default flash first.
// Typefaces are self-hosted by `@tokenwise/shared-ui` — no next/font, no Google CDN.

/**
 * Title, description and hreflang for one language.
 *
 * Identity comes from prototype.config.json, never from a literal. A hardcoded title is
 * what made the smoke gate punish personalization (P3): the moment a prototype named
 * itself, `toHaveTitle(/Golden App/)` failed on an otherwise perfect build.
 *
 * The meta description is copy, so it is per-locale — it used to be the default locale's on
 * every document, which for a Slovak page meant an English snippet in the search result.
 * The `alternates` block is golden rule 3 (SEO+GEO): a search engine has no other way to
 * learn that `/` and `/sk` are the same page in two languages. Single-language prototypes
 * get no alternates at all, because a lone hreflang pointing at itself says nothing.
 */
export function metadataFor(locale: string): Metadata {
  const multilingual = config.locales.length > 1;

  return {
    title: config.appName,
    description: contentFor(config, locale).description,
    alternates: {
      canonical: localeHref(locale),
      ...(multilingual
        ? {
            languages: Object.fromEntries(
              config.locales.map((id) => [id, localeHref(id)])
            ),
          }
        : {}),
    },
  };
}

export async function PrototypeShell({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  // A static export has no middleware to carry the locale, so the ROUTE is what tells
  // next-intl which language this document is. Set before anything reads a translation.
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    // EVERY palette ships as a CSS rule keyed by `data-scheme`, computed at build time by
    // the deterministic rule in @tokenwise/shared-ui (theming/color-schemes.ts), so switching one is an attribute
    // write rather than a rebuild. `data-scheme` starts on the palette the customer picked
    // in the wizard — that is what a first-time visitor sees — and the bootstrap script
    // below overrides it only for a visitor who chose differently on this device.
    // `data-font` works the same way: `inter` for every first visit, the visitor's pick
    // after that.
    <html
      lang={locale}
      className={cn("font-sans", "dark")}
      data-scheme={config.theme.colorScheme}
      data-font="inter"
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeBootstrap palettes />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/* Header and Footer sit here, not in a route group, because the header carries
              the palette switcher, the language switcher and the sign-in control: a page
              without it is a page where the visitor can neither change the palette nor
              sign out. /login and /dashboard were exactly that. */}
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
