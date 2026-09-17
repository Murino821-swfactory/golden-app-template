import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * SPIKE — reads the locale from the route instead of returning a hardcoded "en".
 * (The hardcoded "en" was a Wave 0 item that was never closed.)
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = routing.locales.includes(requested as (typeof routing.locales)[number])
    ? (requested as (typeof routing.locales)[number])
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
