import { getRequestConfig } from "next-intl/server";
import { config } from "../lib/prototype-config";

/**
 * Which language is being rendered, and which bundle answers for it.
 *
 * This used to be `const locale = "en"` with the comment "Static export: single locale at
 * build time". The build was single-locale because of this line, not the other way round:
 * `demo/cv-matcher` declared `["en","sk"]`, the content call wrote complete Slovak copy and
 * zod enforced it, and `tokenwise.sk/newapp/cv-matcher/sk/` answered 404. The copy was paid
 * for and no URL rendered it.
 *
 * `requestLocale` is the `[locale]` route segment. It is `undefined` for a route outside
 * that segment — which here is `app/(default)/`, the tree that serves the default locale at
 * the bare path — so falling back to `config.defaultLocale` is the answer for that tree
 * rather than a guess about an unknown request. `locale` is the override next-intl passes
 * when a caller asks for a language explicitly, as the shell does.
 *
 * Anything else falls back too: the `[locale]` segment matches any single path segment, so
 * an unknown one reaches here, and rendering the default beats rendering nothing.
 */
export default getRequestConfig(async ({ locale: explicit, requestLocale }) => {
  const requested = explicit ?? (await requestLocale);
  const locale =
    requested && (config.locales as readonly string[]).includes(requested)
      ? requested
      : config.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
