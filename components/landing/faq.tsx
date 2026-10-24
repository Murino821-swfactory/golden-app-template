"use client";

import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useContent } from "@/hooks/use-content";
import { faqJsonLd } from "@/lib/faq-jsonld";
import { landingCopy } from "@/lib/landing/copy";
import { Eyebrow } from "./ui";

/**
 * Questions a visitor asks before opening the studio: the heading stays beside the
 * cards on a desktop, each card is a native `<details>` with a plus that turns into a
 * cross — no JavaScript needed, every screen reader understands it — plus FAQPage
 * JSON-LD for search and AI engines, exactly as the template's section ships it.
 */
export function FaqSection() {
  const t = useTranslations("faq");
  const locale = useLocale();
  const words = landingCopy(locale);
  const faq = useContent().landing?.faq;
  if (!faq) return null; // zod requires the copy whenever this section is enabled

  return (
    <section id="faq" data-section="faq" className="scroll-mt-24 mx-auto w-full max-w-6xl px-4 py-20 sm:py-28">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
        <div className="flex flex-col items-start gap-4 lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>{words.faq.eyebrow}</Eyebrow>
          <h2 className="text-balance text-3xl font-light tracking-[-0.02em] sm:text-5xl">{faq.heading ?? t("title")}</h2>
        </div>
        <div className="space-y-3">
          {faq.items.map((item, i) => (
            <details key={i} data-reveal style={{ "--i": i } as CSSProperties} className="landing-card group rounded-2xl px-5 sm:px-6">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                {item.question}
                <span aria-hidden className="landing-plus" />
              </summary>
              <p className="pb-5 text-sm text-muted-foreground sm:text-base">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd(faq.items) }} />
    </section>
  );
}
