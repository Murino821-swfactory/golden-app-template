import { useTranslations } from "next-intl";
import { navFor } from "@tokenwise/shared-ui";
import { BRAND_SITE } from "@/lib/editorial";
import { config } from "@/lib/prototype-config";
import { FooterWordmark } from "./footer-wordmark";

/** tokenwise.sk's public nav, every link absolute to the site — the list the header used to
 * carry (founder decision 2026-10-26), read from the package so the site's nav still exists
 * in one place. */
const SITE_NAV = navFor("prototype", { hasContact: false, siteOrigin: BRAND_SITE });

const NAV_LINK =
  "inline-flex min-h-11 items-center px-2 tracking-[0.05em] transition-colors hover:text-foreground";

/** Names the customer's app, like the header — see the note in header.tsx. On the landing
 * the name is also set large across the foot of the page (`FooterWordmark`). */
export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="overflow-hidden border-t border-foreground/10 px-4 pb-8 pt-10 text-sm text-muted-foreground sm:px-6 sm:pt-14">
      <div className="mx-auto w-full max-w-6xl">
        <FooterWordmark name={config.appName} />
        <nav
          aria-label="tokenwise.sk"
          className="mb-3 flex flex-wrap justify-center text-xs sm:justify-start"
          style={{ fontFamily: "var(--shared-font-mono)" }}
        >
          {SITE_NAV.map((item) => (
            <a key={item.label} href={item.href} className={NAV_LINK}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {config.appName}
          </p>
          {/* EU AI Act Art. 50 — synthetic-content disclosure (OTH-198). Subtle, uses the
              footer's muted token so it follows the customer's palette. */}
          <p className="text-xs text-muted-foreground/70">{t("generatedBy")}</p>
        </div>
      </div>
    </footer>
  );
}
