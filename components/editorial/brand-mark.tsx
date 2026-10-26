"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { getDemoSlug } from "@/lib/demo-slug";
import { BRAND_LETTERS, brandHref } from "@/lib/editorial";

/**
 * "Built by TOKENWISE" — the block every editorial page closes on (founder, 2026-10-26: the
 * factory's brand, not the app's name, set across the whole width the way mdx.so sets its
 * own letters). One link to tokenwise.sk, tagged with the prototype's slug so the funnel
 * can tell where a visitor came from; the kicker is chrome (`footer.builtBy`), the nine
 * letters are decoration in the header's fixed display face (`--shared-font-display`), and
 * the visually hidden "tokenwise.sk" gives the link its name. The app itself is named in
 * the footer and in the hero.
 */
export function BrandMark() {
  const t = useTranslations("footer");
  return (
    <a data-brand-mark href={brandHref(getDemoSlug())} target="_blank" rel="noopener noreferrer" className="editorial-brand">
      <span data-brand-kicker className="editorial-eyebrow">
        {t("builtBy")}
      </span>
      <span data-brand-letters aria-hidden="true" className="editorial-brand-letters">
        {BRAND_LETTERS.map((letter, i) => (
          <span key={i} data-brand-letter style={{ "--i": i } as CSSProperties}>
            {letter}
          </span>
        ))}
      </span>
      <span className="sr-only">tokenwise.sk</span>
    </a>
  );
}
