"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { localePath } from "@/lib/locale-routing";
import { studioCopy } from "@/lib/studio/copy";

/** The dashboard's door to the studio, in the language on screen. */
export function StudioLink() {
  const locale = useLocale();
  const copy = studioCopy(locale);
  return (
    <Link
      href={localePath(locale, "/studio")}
      className="block rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 transition-colors hover:bg-primary/15"
      data-testid="studio-link"
    >
      <span className="block font-semibold text-primary">{copy.dashboard.studioLink} →</span>
      <span className="block text-sm text-muted-foreground">{copy.dashboard.studioHint}</span>
    </Link>
  );
}
