"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { useContent } from "@/hooks/use-content";
import { config } from "@/lib/prototype-config";
import { landingActionHref } from "@/lib/landing-action";

/** The closing band, with the "talent pool" illustration beside the customer's words.
 * Copy and destination are the `cta` pattern's, exactly as in the template's section. */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function RecruitingCta() {
  const t = useTranslations("cta");
  const copy = useContent().cta;
  const label = copy?.label ?? t("action");
  const href = landingActionHref(config.patterns);

  return (
    <section data-section="cta" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid overflow-hidden rounded-3xl bg-secondary ring-1 ring-foreground/10 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE_PATH}/images/talent-pool.webp`} alt="" decoding="async" loading="lazy" className="aspect-square w-full object-cover sm:h-full" />
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
          <h2 className="text-balance text-3xl font-semibold tracking-tight">{copy?.title ?? t("title")}</h2>
          <p className="text-pretty text-muted-foreground">{copy?.subtitle ?? t("subtitle")}</p>
          {href && (
            <Link
              href={href}
              className="inline-flex min-h-12 w-fit items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {label}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
