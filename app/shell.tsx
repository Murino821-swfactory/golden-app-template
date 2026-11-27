import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/auth-context";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { IdeaChat } from "@/components/idea-chat";
import { config, initialButtonStyle } from "@/lib/prototype-config";
import { landingMetadata } from "@/lib/seo";
import { htmlAppearance } from "@/lib/theme-appearance";
import { DEFAULT_IMAGE_TRANSPARENCY, DEFAULT_IMAGE_VEIL, ThemeBootstrap } from "@tokenwise/shared-ui";

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

// The visitor's palette, appearance (dark or light), font, button look and the transparency and
// veil of the hero's picture are applied before the first paint by the package's `ThemeBootstrap`
// (first child of <body>, the standard blocking-script slot in the App Router), so a returning
// visitor never sees the customer's default flash first.
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
  return landingMetadata(locale);
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

  // The side a FIRST visit opens on (`theme.appearance`, dark when the config names none).
  // Dark keeps the `.dark` class and marks nothing; light drops `.dark` and marks the page, so
  // the palette's light tokens and the light-only CSS refinements apply. The visitor's switch
  // in the header moves the same class and the same mark (founder decision 2026-11-25).
  const { darkClass, dataAppearance } = htmlAppearance(config.theme.appearance);

  return (
    // EVERY palette ships as CSS rules keyed by `data-scheme` — a dark one and a light one —
    // computed at build time by the deterministic rule in @tokenwise/shared-ui
    // (theming/color-schemes.ts), so switching the palette or the side is an attribute
    // write rather than a rebuild. `data-scheme` starts on the palette the customer picked
    // in the wizard — that is what a first-time visitor sees — and the bootstrap script
    // below overrides it only for a visitor who chose differently on this device.
    // `data-font` works the same way: the face the config names for this prototype
    // (`patterns.landing.font`, 2026-10-26) — `inter` when it names none — for every first
    // visit, the visitor's pick after that. And so does `data-button` (2026-11-25), the look
    // of the landing's action: the config's (`theme.button`), else the package's first
    // (`initialButtonStyle`). The looks themselves are `@tokenwise/shared-ui/buttons.css`.
    <html
      lang={locale}
      className={cn("font-sans", darkClass && "dark")}
      data-scheme={config.theme.colorScheme}
      data-appearance={dataAppearance}
      data-font={config.patterns.landing?.font ?? "inter"}
      data-button={initialButtonStyle(config)}
      // How transparent the hero's picture is (2026-11-25): 0 % for every first visit — the
      // picture as the page draws it — and the visitor's step after that (`stage.css`).
      data-image-transparency={DEFAULT_IMAGE_TRANSPARENCY}
      // Whether the veil lies over the hero's picture (2026-11-26): on for every first visit —
      // the page as it has always been drawn — and the visitor's choice after that. Apart from
      // the transparency above: neither moves the other (`stage.css`).
      data-image-veil={DEFAULT_IMAGE_VEIL}
      // ThemeBootstrap rewrites data-scheme / data-appearance / data-font / data-button /
      // data-image-transparency / data-image-veil and the `.dark` class before React hydrates;
      // the mismatch is the point, not a bug.
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeBootstrap palettes buttons imageTransparency imageVeil />
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
            {/* The idea chat's launcher floats over every page (founder, 2026-10-27). */}
            <IdeaChat />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
