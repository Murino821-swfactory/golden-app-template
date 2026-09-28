"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Header as SharedHeader, type HeaderLabels } from "@tokenwise/shared-ui";
import { useAuth } from "@/hooks/use-auth";
import { config } from "@/lib/prototype-config";
import { localePath, routeFromPathname } from "@/lib/locale-routing";
import { researchCopy } from "@/lib/law-expert/copy";

/**
 * The prototype's header is `@tokenwise/shared-ui`'s — the same component tokenwise.sk
 * renders, so a change to the header is one change (sw-factory spec
 * 2026-09-25-shared-header-design.md). This file only translates the prototype's world into
 * props: its name, its languages, its sign-in, its copy.
 *
 * The header is tokenwise.sk's, 1:1 (founder decision 2026-09-28): the site's logo and
 * public nav, every link absolute to tokenwise.sk — a prototype is served from
 * apps.tokenwise.sk, where a relative `/articles` would land in the prototype itself. The
 * customer's name is in the footer, the `<title>` and the page (it used to be the logo).
 * The controls — palette, font, language, cart, the prototype's own sign-in — stay the
 * prototype's.
 */

/** Where tokenwise.sk lives. Absolute, because a prototype is never served from it. */
const TOKENWISE_SITE = "https://tokenwise.sk";

/** Each language named in ITSELF: a visitor on the wrong language has to be able to read
 * the way out of it, and "Slovak" is no help to someone who only reads Slovak. */
const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  sk: "Slovenčina",
  cs: "Čeština",
  de: "Deutsch",
  pl: "Polski",
  hu: "Magyar",
  fr: "Français",
  es: "Español",
};

const LABEL_KEYS = [
  "openMenu",
  "closeMenu",
  "menu",
  "changeColour",
  "changeColourLabel",
  "font",
  "changeFontLabel",
  "language",
  "cart",
  "cartLabel",
  "cartEmpty",
  "signIn",
  "signOut",
  "account",
] as const satisfies readonly (keyof HeaderLabels)[];

export function Header() {
  const t = useTranslations("common");
  // Sign-in and dashboard in the language on screen: from `/sk/…` they lead to `/sk/login`
  // and `/sk/dashboard`, not to the default locale's.
  const locale = useLocale();
  const route = routeFromPathname(usePathname());
  const { user, loading, signOut } = useAuth();
  const withAuth = config.patterns.authGoogle !== undefined;

  // `t.raw`, not `t`: the templates carry `{name}`-style placeholders the package fills in
  // with the palette or font on screen, which only it knows.
  const labels = Object.fromEntries(
    LABEL_KEYS.map((key) => [key, t.raw(key) as string])
  ) as Partial<HeaderLabels>;

  return (
    <SharedHeader
      variant="prototype"
      siteOrigin={TOKENWISE_SITE}
      logo={{ href: `${TOKENWISE_SITE}/`, text: "tokenwise", accent: ".sk" }}
      palette={config.theme.colorScheme}
      font="inter"
      languages={config.locales.map((id) => ({
        code: id,
        name: LOCALE_NAMES[id] ?? id,
        // Keeps the visitor on the page they were reading rather than sending them home.
        href: localePath(id, route),
        current: id === locale,
      }))}
      user={withAuth ? (loading ? "loading" : user) : undefined}
      signInHref={localePath(locale, "/login")}
      userMenuItems={[
        { label: researchCopy(locale).nav, href: localePath(locale, "/research") },
        { label: t("dashboard"), href: localePath(locale, "/dashboard") },
      ]}
      onSignOut={signOut}
      labels={labels}
    />
  );
}
