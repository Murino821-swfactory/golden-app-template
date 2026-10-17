"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { growthCopy } from "@/lib/growth/copy";
import { localePath } from "@/lib/locale-routing";

/** The dashboard's door to the growth plan, in the language on screen. */
export function GrowthLink() {
  const locale = useLocale();
  const copy = growthCopy(locale);
  return (
    <Link
      href={localePath(locale, "/growth")}
      className="block rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 transition-colors hover:bg-primary/15"
      data-testid="growth-link"
    >
      <span className="block font-semibold text-primary">{copy.dashboard.link} →</span>
      <span className="block text-sm text-muted-foreground">{copy.dashboard.hint}</span>
    </Link>
  );
}
