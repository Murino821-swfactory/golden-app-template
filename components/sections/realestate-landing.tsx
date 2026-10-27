"use client";

import type { CSSProperties } from "react";
import { useContent } from "@/hooks/use-content";
import { cn } from "@/lib/utils";
import { DISPLAY_H2, DisplayText, SECTION } from "./realestate-landing-ui";

/**
 * This prototype's versions of the template's use cases and comparison, set in the
 * landing's display language (see `realestate-landing-ui.tsx`); since 2026-10-27 the hero,
 * features, how it works, FAQ and closing band are the golden template's editorial ones. They read the same copy from `prototype.config.json`
 * through `useContent()` and keep the same DOM contract the template's tests hold them
 * to: one `h2` with the configured heading, one `li` per use case, one `article` per
 * comparison row. The template's own files stay untouched, so a template refresh
 * merges clean; `app/[locale]/page.tsx` is where these replace the originals.
 */

const delay = (i: number) => ({ "--reveal-delay": i }) as CSSProperties;

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
