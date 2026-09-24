"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { config, type Locale } from "@/lib/prototype-config";
import { localePath, routeFromPathname } from "@/lib/locale-routing";

/**
 * The language switcher — rendered only when the prototype actually ships more than one
 * language, and nothing at all when it ships one.
 *
 * Links, not the radiogroup the palette switcher uses: changing language changes the
 * document, so it is navigation and has to be a real href that a visitor can open in a new
 * tab and a crawler can follow. It keeps the visitor on the page they were reading rather
 * than sending them home, which is what `routeFromPathname` is for.
 *
 * Each language is named in ITSELF — a visitor who lands on the wrong language has to be
 * able to read the way out of it, and "Slovak" is no help to someone who only reads
 * Slovak. The codes are what fits beside the palette switcher at 390px, so the endonym is
 * the accessible name rather than the visible one.
 */
const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  sk: "Slovenčina",
  cs: "Čeština",
  de: "Deutsch",
  pl: "Polski",
  hu: "Magyar",
  fr: "Français",
  es: "Español",
};

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const active = useLocale();
  const route = routeFromPathname(usePathname());

  if (config.locales.length < 2) return null;

  return (
    <nav aria-label={t("language")} className="flex items-center">
      {config.locales.map((locale) => {
        const current = locale === active;
        return (
          <Link
            key={locale}
            href={localePath(locale, route)}
            hrefLang={locale}
            lang={locale}
            aria-label={LOCALE_NAMES[locale]}
            aria-current={current ? "page" : undefined}
            // 44px tall hit area around a two-character label: the target meets the
            // mobile-first minimum without the label growing into a button.
            className={
              "flex min-h-11 items-center px-1.5 text-xs font-medium uppercase transition-colors " +
              (current
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {locale}
          </Link>
        );
      })}
    </nav>
  );
}
