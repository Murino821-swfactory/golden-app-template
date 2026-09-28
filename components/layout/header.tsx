"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Header as SharedHeader, type HeaderLabels } from "@tokenwise/shared-ui";
import { useAuth } from "@/hooks/use-auth";
import { config } from "@/lib/prototype-config";
import { localePath, routeFromPathname } from "@/lib/locale-routing";

/**
 * The prototype's header is `@tokenwise/shared-ui`'s — the same component tokenwise.sk
 * renders, so a change to the header is one change (sw-factory spec
 * 2026-09-25-shared-header-design.md). This file only translates the prototype's world into
 * props: its name, its languages, its sign-in, its copy.
 *
 * The name comes from `prototype.config.json`. It used to come from `messages/en.json`,
 * whose `common.appName` is the string "Golden App" — so every prototype, whatever the
 * customer named it, introduced itself as the template in its own header and footer.
 */

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
  // Home, sign-in and dashboard in the language on screen: from `/sk/login` the name has
  // to lead back to `/sk`, not to the default locale's landing page.
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
      logo={{ href: localePath(locale), text: config.appName }}
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
      userMenuItems={[{ label: t("dashboard"), href: localePath(locale, "/dashboard") }]}
      onSignOut={signOut}
      labels={labels}
    />
  );
}
