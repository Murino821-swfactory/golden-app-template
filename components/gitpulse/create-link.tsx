"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { gitpulseCopy } from "@/lib/gitpulse/copy";
import { localePath } from "@/lib/locale-routing";

/** The dashboard's door to the creation studio, in the language on screen. */
export function CreateLink() {
  const locale = useLocale();
  const copy = gitpulseCopy(locale);
  return (
    <Link
      href={localePath(locale, "/create")}
      className="block rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 transition-colors hover:bg-primary/15"
      data-testid="gitpulse-create-link"
    >
      <span className="block font-semibold text-primary">{copy.dashboardLink.title} →</span>
      <span className="block text-sm text-muted-foreground">{copy.dashboardLink.hint}</span>
    </Link>
  );
}
