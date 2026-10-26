import { useTranslations } from "next-intl";
import { navFor } from "@tokenwise/shared-ui";
import { BRAND_SITE } from "@/lib/editorial";
import { config } from "@/lib/prototype-config";

/** tokenwise.sk's public nav, every link absolute to the site — the list the header used to
 * carry (founder decision 2026-10-26), read from the package so the site's nav still exists
 * in one place. */
const SITE_NAV = navFor("prototype", { hasContact: false, siteOrigin: BRAND_SITE });

const NAV_LINK =
  "inline-flex min-h-11 items-center px-2 tracking-[0.05em] transition-colors hover:text-foreground";

/** Names the customer's app, like the header — see the note in header.tsx. */
export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
      <nav
        aria-label="tokenwise.sk"
        className="mb-3 flex flex-wrap justify-center text-xs"
        style={{ fontFamily: "var(--shared-font-mono)" }}
      >
        {SITE_NAV.map((item) => (
          <a key={item.label} href={item.href} className={NAV_LINK}>
            {item.label}
          </a>
        ))}
      </nav>
      <p>
        &copy; {new Date().getFullYear()} {config.appName}
      </p>
      {/* EU AI Act Art. 50 — synthetic-content disclosure (OTH-198). Subtle, uses the
          footer's muted token so it follows the customer's palette. */}
      <p className="mt-1 text-xs text-muted-foreground/70">{t("generatedBy")}</p>
    </footer>
  );
}
