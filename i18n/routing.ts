import { defineRouting } from "next-intl/routing";
import { config } from "@/lib/prototype-config";

/**
 * Which languages this prototype is routed for — read from `prototype.config.json`, so a
 * customer who ticked two boxes in the wizard gets two URL trees and nothing here changes.
 *
 * `localePrefix: "always"` is not a preference. `output: "export"` has no middleware, and
 * next-intl's "default locale without a prefix" mode is implemented BY middleware. Every
 * language carries a prefix; `app/page.tsx` is the document that sends the bare root to the
 * primary one.
 */
export const routing = defineRouting({
  locales: config.locales,
  defaultLocale: config.defaultLocale,
  localePrefix: "always",
});
