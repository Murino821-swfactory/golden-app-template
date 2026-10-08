"use client";

import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useContent } from "@/hooks/use-content";
import { faqJsonLd } from "@/lib/faq-jsonld";

/** Questions a visitor asks before trying the app — native <details>, so it works without
 * JavaScript and with every screen reader — plus FAQPage JSON-LD for search and AI engines. */
export function FaqSection() {
  const t = useTranslations("faq");
  const faq = useContent().landing?.faq;
  if (!faq) return null; // zod requires the copy whenever this section is enabled

  return (
    <section data-section="faq" className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
      <h2 className="text-center text-3xl font-semibold tracking-tight">{faq.heading ?? t("title")}</h2>
      <div className="mt-8 divide-y divide-border rounded-lg border border-border">
        {faq.items.map((item, i) => (
          <details key={i} className="group px-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
              {item.question}
              <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <p className="pb-4 text-sm text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd(faq.items) }} />
    </section>
  );
}
