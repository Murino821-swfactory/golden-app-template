import { useTranslations } from "next-intl";
import { config } from "@/lib/prototype-config";

/** Names the customer's app, like the header — see the note in header.tsx. */
export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
      <p>
        &copy; {new Date().getFullYear()} {config.appName}
      </p>
      {/* EU AI Act Art. 50 — synthetic-content disclosure (OTH-198). Subtle, uses the
          footer's muted token so it follows the customer's palette. */}
      <p className="mt-1 text-xs text-muted-foreground/70">{t("generatedBy")}</p>
    </footer>
  );
}
