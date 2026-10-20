"use client";

import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useContent } from "@/hooks/use-content";
import { WORKSPACE_COPY, workspaceLocale } from "@/lib/realestate/copy";
import { config } from "@/lib/prototype-config";
import { landingActionHref } from "@/lib/landing-action";
import { localePath } from "@/lib/locale-routing";
import { cn } from "@/lib/utils";
import { DISPLAY_H2, DisplayText, Eyebrow, Glow, PillLink, SECTION } from "./realestate-landing-ui";

/**
 * The closing of the page, in the landing's display language: the two ways to work (solo
 * agent, agency) side by side — each a plain list of what the demo does for that person,
 * each opening the same demo in its chair — and the closing band with the keys
 * photograph as a large rounded image and the customer's words beside it, the way the
 * reference closes on a project card. Copy and destination of the band are the `cta`
 * pattern's, exactly as in the template's section; the plans' words are this prototype's
 * (`lib/realestate/copy.ts`).
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
      <div id="plans" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pt-20 sm:px-6 sm:pt-28 lg:pt-36">
        <div data-reveal className="mx-auto max-w-3xl text-center">
          <h2 className={DISPLAY_H2}>
            <DisplayText text={r.plans.heading} />
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-muted-foreground sm:text-lg">{r.plans.intro}</p>
        </div>
        <div data-testid="landing-plans" className="mt-12 grid gap-5 md:grid-cols-2 lg:mt-16">
          {[r.plans.solo, r.plans.agency].map((plan, i) => (
            <article
              key={plan.name}
              data-reveal
              style={{ "--reveal-delay": i } as CSSProperties}
              className={cn("flex flex-col rounded-3xl p-6 ring-1 sm:p-9", i === 1 ? "bg-card ring-foreground/40" : "bg-card/60 ring-foreground/10")}
            >
              <Eyebrow>{String(i + 1).padStart(2, "0")}</Eyebrow>
              <h3 className="mt-5 text-3xl font-light tracking-[-0.02em] sm:text-4xl">{plan.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{plan.who}</p>
              <ul className="mt-8 grid gap-3 border-t border-foreground/10 pt-6 text-sm">
                {plan.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <PillLink href={`${workspace}?mode=${i === 1 ? "agency" : "solo"}`} variant={i === 1 ? "solid" : "outline"} className="mt-8 w-full sm:w-auto sm:self-start">
                {plan.cta}
              </PillLink>
            </article>
          ))}
        </div>
      </div>

      <section data-section="cta" className={SECTION}>
        <div data-reveal className="relative isolate grid overflow-hidden rounded-3xl bg-card/70 ring-1 ring-foreground/10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <Glow className="-bottom-32 -right-24 h-[28rem] w-[28rem]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE_PATH}/images/keys-handover-800.webp`} srcSet={`${BASE_PATH}/images/keys-handover-800.webp 800w, ${BASE_PATH}/images/keys-handover.webp 1024w`} sizes="(min-width: 1024px) 480px, 100vw" alt="" decoding="async" loading="lazy" className="aspect-[4/3] w-full object-cover lg:aspect-auto lg:h-full" />
          <div className="flex flex-col items-start justify-center gap-6 p-7 sm:p-10 lg:p-14">
            <Eyebrow>{r.closingEyebrow}</Eyebrow>
            <h2 className={DISPLAY_H2}>
              <DisplayText text={copy?.title ?? t("title")} />
            </h2>
            <p className="max-w-md text-pretty text-muted-foreground sm:text-lg">{copy?.subtitle ?? t("subtitle")}</p>
            {href && (
              <PillLink href={href} className="mt-2 w-full sm:w-auto">
                {label}
              </PillLink>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
