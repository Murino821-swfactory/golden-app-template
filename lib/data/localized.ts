/**
 * Copy that BizLaunch CEE writes in its two languages. A plain record, not a message
 * bundle: `messages/*.json` must stay key-identical across all eight template locales
 * (`tests/locale.spec.ts`), and this prototype ships only English and Slovak. Typing both
 * keys as required makes a missing Slovak string a typecheck failure.
 */
export type Localized = { en: string; sk: string };

export function inLocale(text: Localized, locale: string): string {
  return locale === "sk" ? text.sk : text.en;
}
