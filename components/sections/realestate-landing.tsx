"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useContent } from "@/hooks/use-content";
import { faqJsonLd } from "@/lib/faq-jsonld";
import { ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { DISPLAY_H2, DisplayText, Glow, SECTION, TwoTone } from "./realestate-landing-ui";

/**
 * This prototype's versions of the template's landing sections (how it works, features,
 * use cases, comparison, FAQ), set in the landing's display language (see
 * `realestate-landing-ui.tsx`). They read the same copy from `prototype.config.json`
 * through `useContent()` and keep the same DOM contract the template's tests hold them
 * to: one `h2` with the configured heading, one `li` per step or use case, one `article`
 * per comparison row, one `details` per question with the FAQPage JSON-LD beside them,
 * and in the features section exactly one `svg` per configured icon — so no decorative
 * icon may enter that one. The template's own files stay untouched, so a template refresh
 * merges clean; `app/[locale]/page.tsx` is where these replace the originals.
 */

const delay = (i: number) => ({ "--reveal-delay": i }) as CSSProperties;

export function RealEstateHowItWorks() {
  const t = useTranslations("howItWorks");
  const block = useContent().landing?.howItWorks;
  if (!block) return null; // zod requires the copy whenever this section is enabled

  return (
    <section id="howItWorks" data-section="howItWorks" className={cn(SECTION, "overflow-hidden")}>
      <Glow className="left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2" />
      <div data-reveal className="mx-auto max-w-3xl text-center">
        <h2 className={DISPLAY_H2}>
          <DisplayText text={block.heading ?? t("title")} />
        </h2>
      </div>
      <ol className={cn("mt-14 grid gap-10 sm:grid-cols-2 lg:mt-20 lg:gap-8", block.steps.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        {block.steps.map((step, i) => (
          <li key={i} data-reveal style={delay(i)} className="border-t border-foreground/15 pt-6">
            <span aria-hidden className="block text-5xl font-light tabular-nums leading-none tracking-[-0.03em] text-primary/70">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-7 text-xl font-medium leading-snug">{step.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RealEstateFeatures() {
  const t = useTranslations("features");
  const content = useContent();
  const landing = content.landing;
  const features = landing?.features ?? [];
  const columns = features.length === 2 || features.length === 4 ? "lg:grid-cols-2" : "lg:grid-cols-3";

  return (
    // The one deeper band of the page — the reference's black section — derived from the
    // palette's background, so it follows "Change colour" like everything else.
    <section id="features" data-section="features" className="scroll-mt-24 w-full bg-[color-mix(in_oklab,var(--background)_70%,black)] py-20 sm:py-28 lg:py-36">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div data-reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <h2 className={cn(DISPLAY_H2, "max-w-2xl")}>
            <DisplayText text={landing?.featuresHeading ?? t("title")} />
          </h2>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            <TwoTone text={content.description} />
          </p>
        </div>
        <div className={cn("mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:gap-5", columns)}>
          {features.map((feature, i) => {
            const Icon = feature.icon ? ICONS[feature.icon] : null;
            return (
              <article
                key={feature.title + i}
                data-reveal
                style={delay(i % 3)}
                className="flex min-h-64 flex-col justify-between rounded-3xl bg-card/80 p-7 ring-1 ring-foreground/10 transition-transform duration-500 ease-[cubic-bezier(.625,.05,0,1)] hover:-translate-y-1 motion-reduce:transition-none"
              >
                {Icon && <Icon className="size-6 shrink-0 text-primary" aria-hidden />}
                <div className="mt-10">
                  <h3 className="text-xl font-medium leading-snug">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function RealEstateUseCases() {
  const copy = useContent().useCases;
  if (!copy) return null;
  return (
    <section id="useCases" data-section="useCases" className={SECTION}>
      <div data-reveal className="max-w-3xl">
        <h2 className={DISPLAY_H2}>
          <DisplayText text={copy.heading} />
        </h2>
      </div>
      <ol className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:mt-16 lg:gap-x-16">
        {copy.items.map((item, i) => (
          <li key={i} data-reveal style={delay(i % 2)} className="border-t border-foreground/15 pt-6">
            <span aria-hidden className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-4 text-2xl font-medium leading-snug tracking-[-0.01em] sm:text-3xl">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.situation}</p>
            <p className="mt-5 text-base leading-relaxed">{item.action}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RealEstateComparison() {
  const copy = useContent().comparison;
  if (!copy) return null;
  const label = "text-[11px] font-semibold uppercase tracking-[0.22em]";
  return (
    <section id="comparison" data-section="comparison" className={SECTION}>
      <div data-reveal className="mx-auto max-w-3xl text-center">
        <h2 className={DISPLAY_H2}>
          <DisplayText text={copy.heading} />
        </h2>
      </div>
      <div className="mt-12 lg:mt-16">
        <div className={cn("hidden grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,2fr)] gap-8 border-t border-foreground/15 py-4 sm:grid", label)}>
          <span />
          <span className="text-muted-foreground">{copy.beforeLabel}</span>
          <span className="text-primary">{copy.afterLabel}</span>
        </div>
        {copy.rows.map((row, i) => (
          <article key={i} data-reveal className="grid gap-4 border-t border-foreground/15 py-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,2fr)] sm:gap-8 sm:py-8">
            <h3 className="text-xl font-medium leading-snug">{row.topic}</h3>
            <div>
              <p className={cn(label, "text-muted-foreground sm:hidden")}>{copy.beforeLabel}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-0">{row.before}</p>
            </div>
            <div>
              <p className={cn(label, "text-primary sm:hidden")}>{copy.afterLabel}</p>
              <p className="mt-2 text-base leading-relaxed sm:mt-0">{row.after}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Questions a visitor asks before trying the app — native <details>, so it works without
 * JavaScript and with every screen reader — plus FAQPage JSON-LD for search and AI engines. */
export function RealEstateFaq() {
  const t = useTranslations("faq");
  const faq = useContent().landing?.faq;
  if (!faq) return null; // zod requires the copy whenever this section is enabled

  return (
    <section id="faq" data-section="faq" className={cn(SECTION, "max-w-3xl")}>
      <div data-reveal className="text-center">
        <h2 className={DISPLAY_H2}>
          <DisplayText text={faq.heading ?? t("title")} />
        </h2>
      </div>
      <div className="mt-12 border-t border-foreground/15 lg:mt-16">
        {faq.items.map((item, i) => (
          <details key={i} data-reveal className="group border-b border-foreground/15">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-base font-medium leading-snug sm:text-lg [&::-webkit-details-marker]:hidden">
              {item.question}
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/20 transition-transform duration-500 ease-[cubic-bezier(.625,.05,0,1)] group-open:rotate-45 motion-reduce:transition-none">
                <Plus className="size-4" />
              </span>
            </summary>
            <p className="pb-6 pr-12 text-sm leading-relaxed text-muted-foreground sm:text-base">{item.answer}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd(faq.items) }} />
    </section>
  );
}
