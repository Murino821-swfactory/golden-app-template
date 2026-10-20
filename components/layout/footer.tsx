import { useTranslations } from "next-intl";
import { config } from "@/lib/prototype-config";
import { FooterWordmark } from "./footer-wordmark";

/** Names the customer's app, like the header — see the note in header.tsx. On the landing
 * the name is also set large across the foot of the page (`FooterWordmark`). */
export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="overflow-hidden border-t border-foreground/10 px-4 pb-8 pt-10 text-sm text-muted-foreground sm:px-6 sm:pt-14">
      <div className="mx-auto w-full max-w-6xl">
        <FooterWordmark name={config.appName} />
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
