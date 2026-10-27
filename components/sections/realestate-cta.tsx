"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check } from "lucide-react";
import { useContent } from "@/hooks/use-content";
import { WORKSPACE_COPY, workspaceLocale } from "@/lib/realestate/copy";
import { config } from "@/lib/prototype-config";
import { landingActionHref } from "@/lib/landing-action";
import { localePath } from "@/lib/locale-routing";

/**
 * The closing section: the two ways to work (solo agent, agency) side by side — each a
 * plain list of what the demo does for that person — and the closing band with the keys
 * photograph and the customer's words. Copy and destination of the band are the `cta`
 * pattern's, exactly as in the template's section. The plan cards open the same demo,
 * so a presentation can start from either chair.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function RealEstateCta() {
  const t = useTranslations("cta");
  const copy = useContent().cta;
  const locale = useLocale();
  const r = WORKSPACE_COPY[workspaceLocale(locale)].landing;
  const label = copy?.label ?? t("action");
  const href = landingActionHref(config.patterns);
  const workspace = localePath(locale, "/workspace");

  return (
    <>
      {/* The plans sit beside the band, not inside it: the band's one <h2> stays the customer's closing title. */}
      <div id="plans" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pt-16 sm:px-6 sm:pt-24">
        <h2 className="text-balance text-center text-3xl font-semibold tracking-tight">{r.plans.heading}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-pretty text-center text-muted-foreground">{r.plans.intro}</p>
        <div data-testid="landing-plans" className="mt-10 grid gap-4 md:grid-cols-2">
          {[r.plans.solo, r.plans.agency].map((plan, i) => (
            <article key={plan.name} className={i === 1 ? "rounded-3xl bg-card p-6 ring-2 ring-foreground/60 sm:p-8" : "rounded-3xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8"}>
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.who}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href={`${workspace}?mode=${i === 1 ? "agency" : "solo"}`} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-foreground/30 px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                {plan.cta}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
      <section id="cta" data-section="cta" className="scroll-mt-24 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid overflow-hidden rounded-3xl bg-secondary ring-1 ring-foreground/10 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE_PATH}/images/keys-handover-800.webp`} srcSet={`${BASE_PATH}/images/keys-handover-800.webp 800w, ${BASE_PATH}/images/keys-handover.webp 1024w`} sizes="(min-width: 640px) 40vw, 100vw" alt="" decoding="async" loading="lazy" className="aspect-square w-full object-cover sm:h-full" />
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{r.closingEyebrow}</p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight">{copy?.title ?? t("title")}</h2>
          <p className="text-pretty text-muted-foreground">{copy?.subtitle ?? t("subtitle")}</p>
          {href && (
            <Link href={href} className="inline-flex min-h-12 w-fit items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-ring">
              {label}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          )}
        </div>
      </div>
      </section>
    </>
  );
}
