"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { config } from "@/lib/prototype-config";

/**
 * The language switcher, showing only the languages this prototype was actually published
 * in — never the eight the template could ship. An entry that leads nowhere is worse than
 * a missing entry: it reads as a broken app rather than a single-language one.
 *
 * These are links, not state. Language is content, so it has a URL: a switcher that merely
 * swapped strings would leave one indexable page however many languages the customer paid
 * for, which is golden rules 3 and 4 quietly unmet. `usePathname` from the locale-aware
 * navigation returns the path WITHOUT the prefix, so switching keeps the reader on the page
 * they were reading instead of sending them back to the landing page.
 */

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  sk: "Slovenčina",
  cs: "Čeština",
  de: "Deutsch",
  pl: "Polski",
  es: "Español",
  fr: "Français",
  it: "Italiano",
};

/** Two letters is enough on a phone; the full name is the accessible name either way. */
function shortLabel(locale: string): string {
  return locale.toUpperCase();
}

export function LanguageSwitcher() {
  const active = useLocale();
  const pathname = usePathname();

  if (config.locales.length < 2) return null;

  return (
    <div role="group" aria-label="Language" className="flex items-center">
      {config.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          hrefLang={locale}
          aria-label={LANGUAGE_NAMES[locale] ?? locale}
          aria-current={locale === active ? "true" : undefined}
          className={
            "flex min-h-11 items-center px-2 font-mono text-xs tracking-wide transition-colors " +
            (locale === active
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {shortLabel(locale)}
        </Link>
      ))}
    </div>
  );
}
