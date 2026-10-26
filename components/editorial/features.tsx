"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { useContent } from "@/hooks/use-content";
import { bentoSpan } from "@/lib/editorial";
import { ICONS } from "@/lib/icons";
import { type Feature } from "@/lib/prototype-config";
import { cn } from "@/lib/utils";
import { DISPLAY_H2, Numeral, SectionHead, Words } from "./ui";

/**
 * What the product does, as a bento: the first card wide, the rest as cards, each with its
 * numeral and Lucide icon in the palette's colour — then, when the customer's copy has one,
 * the manifesto: one paragraph in large type that lights up word by word as it scrolls into
 * the middle of the screen (`editorial.css`, `[data-word]`).
 *
 * Contract kept from the shared features section: the configured heading is the only
 * `h2`, and the section draws exactly one `svg` per feature with an icon (the numerals and
 * the manifesto are text, on purpose).
 */

const TRANSLATION_FALLBACK: Feature[] = [
  { title: "Feature One", description: "Description of feature one" },
  { title: "Feature Two", description: "Description of feature two" },
  { title: "Feature Three", description: "Description of feature three" },
];

export function FeaturesSection() {
  const t = useTranslations("features");
  const landing = useContent().landing;
  const features = landing?.features ?? TRANSLATION_FALLBACK;
  const manifesto = landing?.manifesto;
  const leadWords = manifesto ? manifesto.lead.split(" ").length : 0;

  return (
    <section id="features" data-section="features" className="scroll-mt-24 relative mx-auto w-full max-w-6xl px-4 py-20 sm:py-28">
      <SectionHead>
        <h2 className={DISPLAY_H2}>{landing?.featuresHeading ?? t("title")}</h2>
      </SectionHead>

      <ul data-bento className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => {
          const Icon = feature.icon ? ICONS[feature.icon] : null;
          const span = bentoSpan(i, features.length);
          return (
            <li
              key={feature.title + i}
              data-span={span.wide ? "wide" : "one"}
              data-reveal
              style={{ "--i": i % 3 } as CSSProperties}
              className={cn("editorial-card relative overflow-clip rounded-3xl p-6 sm:p-8", span.className)}
            >
              <Numeral index={i} className="absolute right-5 top-4" />
              {Icon && <Icon className="size-6 text-primary" aria-hidden />}
              <h3 className={cn("mt-8 text-xl font-medium tracking-tight", span.wide && "lg:text-3xl lg:font-light")}>{feature.title}</h3>
              <p className={cn("mt-2 max-w-prose text-sm text-muted-foreground sm:text-base", span.wide && "lg:max-w-xl")}>{feature.description}</p>
            </li>
          );
        })}
      </ul>

      {manifesto && (
        <div data-manifesto className="editorial-manifesto mx-auto mt-24 flex max-w-4xl flex-col items-center gap-6 text-center sm:mt-32">
          <p className="text-balance text-2xl font-light leading-snug tracking-[-0.02em] sm:text-4xl">
            <strong className="font-medium text-primary">
              <Words text={manifesto.lead} from={0} />
            </strong>{" "}
            <Words text={manifesto.body} from={leadWords} />
          </p>
        </div>
      )}
    </section>
  );
}
