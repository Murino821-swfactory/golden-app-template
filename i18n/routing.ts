import { defineRouting } from "next-intl/routing";

/**
 * SPIKE — hardcoded locale list. In the real change this comes from
 * `prototype.config.json` (`locales` / `defaultLocale`).
 *
 * `localePrefix: "always"` is not a preference: `output: "export"` has no middleware, and
 * "as-needed" (default locale unprefixed) is implemented BY middleware. Every locale gets
 * a prefix, and the bare root is handled separately.
 */
export const routing = defineRouting({
  locales: ["en", "sk"],
  defaultLocale: "en",
  localePrefix: "always",
});
