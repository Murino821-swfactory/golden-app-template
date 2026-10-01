"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useOwnerRole } from "@/hooks/use-owner-role";
import { localePath } from "@/lib/locale-routing";
import { config } from "@/lib/prototype-config";

/** The owner's shortcuts on the dashboard. Renders nothing for anyone else — which is why
 * the dashboard page can carry it as a single line (4 adopted prototypes customise that page). */
export function OwnerLinks() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { status } = useOwnerRole();
  if (!status) return null;
  return (
    <nav className="flex flex-wrap gap-2" aria-label={t("ownerContact")}>
      <Button asChild variant="outline" className="h-11">
        <Link href={localePath(locale, "/messages")}>{t("ownerMessages", { count: status.unreadMessages })}</Link>
      </Button>
      {config.patterns.contactForm && (
        <Button asChild variant="ghost" className="h-11">
          <Link href={`${localePath(locale, "/")}#contact`}>{t("ownerContact")}</Link>
        </Button>
      )}
    </nav>
  );
}
