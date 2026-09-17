import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * The locale comes from the route.
 *
 * It used to be the literal `"en"`, with the comment "static export: single locale at build
 * time" — which was true of the template and false of the customer, who could ask for
 * Slovak and be handed English. Closing that was a Wave 0 item that never landed.
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
