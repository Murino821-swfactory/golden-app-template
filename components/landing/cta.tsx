"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useContent } from "@/hooks/use-content";
import { landingActionHref } from "@/lib/landing-action";
import { landingCopy } from "@/lib/landing/copy";
import { localePath } from "@/lib/locale-routing";
import { config } from "@/lib/prototype-config";
import { Eyebrow } from "./ui";

/**
 * The closing band, then the name of the app as large as the page — the Indoobit page
 * ends the same way, its wordmark half cut by the bottom edge. The wordmark is
 * decoration (`aria-hidden`): the footer under it already names the app for everyone.
 * Label and destination come from the `cta` pattern, as in the template's section.
 */
export function CtaSection() {
  const t = useTranslations("cta");
  const locale = useLocale();
  const words = landingCopy(locale);
  const copy = useContent().cta;
  const action = landingActionHref(config.patterns);
  const href = action && action.startsWith("/") ? localePath(locale, action) : action;

  return (
    <section id="cta" data-section="cta" className="landing-closing scroll-mt-24 relative mx-auto w-full max-w-6xl overflow-clip px-4 pt-20 sm:pt-28">
      <div data-reveal className="landing-band relative overflow-clip rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-20">
        <Eyebrow>{words.cta.eyebrow}</Eyebrow>
        <h2 className="mt-5 text-balance text-3xl font-light tracking-[-0.02em] sm:text-5xl">{copy?.title ?? t("title")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-balance text-muted-foreground sm:text-lg">{copy?.subtitle ?? t("subtitle")}</p>
        {href && (
          <Button asChild size="lg" className="mt-8 h-11 rounded-full px-6 text-sm">
            <Link href={href}>{copy?.label ?? t("action")}</Link>
          </Button>
        )}
      </div>
      <p data-wordmark aria-hidden="true" className="landing-wordmark">
        {config.appName}
      </p>
    </section>
  );
}
