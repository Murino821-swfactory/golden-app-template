"use client";

import { useLocale, useTranslations } from "next-intl";
import { useContent } from "@/hooks/use-content";
import { ICONS } from "@/lib/icons";
import { landingCopy } from "@/lib/landing/copy";
import { cn } from "@/lib/utils";
import { Eyebrow, Numeral } from "./ui";

/**
 * What you get, as a bento: the first feature wide, the rest as cards, each with its
 * numeral and Lucide icon in the palette's colour — then the manifesto, one paragraph in
 * large type, the way the Indoobit page states what the product is not.
 *
 * Contract kept from the template's features section: the configured heading is the
 * only `h2`, and the section draws exactly one `svg` per feature with an icon (the
 * eyebrows and the manifesto's kicker are text, on purpose).
 */
/**
 * Which cards span two columns, so every row of the bento is full. Three columns on a
 * desktop: six cards alternate wide-left, wide-right, wide-left (0, 3, 4); five get one
 * wide card, four get two. Two columns on a tablet: the first and, for an even count, the
 * last. `data-span` names the desktop decision — the first card is always the wide one.
 */
export function bentoSpan(index: number, count: number): { wide: boolean; className: string } {
  const lg = count % 3 === 0 ? (count >= 6 ? [0, 3, 4] : []) : count % 3 === 1 ? [0, 3] : [0];
  const sm = count % 2 === 0 ? [0, count - 1] : [0];
  const wideLg = lg.includes(index);
  const wideSm = sm.includes(index);
  return {
    wide: wideLg,
    className: cn(wideSm && "sm:col-span-2", wideLg ? "lg:col-span-2" : wideSm && "lg:col-span-1"),
  };
}

export function FeaturesSection() {
  const t = useTranslations("features");
  const locale = useLocale();
  const words = landingCopy(locale);
  const landing = useContent().landing;
  const features = landing?.features ?? [];

  return (
    <section id="features" data-section="features" className="scroll-mt-24 relative mx-auto w-full max-w-6xl px-4 py-20 sm:py-28">
      <div className="flex flex-col items-center gap-4 text-center">
        <Eyebrow>{words.features.eyebrow}</Eyebrow>
        <h2 className="max-w-3xl text-balance text-3xl font-light tracking-[-0.02em] sm:text-5xl">{landing?.featuresHeading ?? t("title")}</h2>
      </div>

      <ul data-bento className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => {
          const Icon = feature.icon ? ICONS[feature.icon] : null;
          const span = bentoSpan(i, features.length);
          return (
            <li
              key={feature.title + i}
              data-span={span.wide ? "wide" : "one"}
              data-reveal
              className={cn("landing-card relative overflow-clip rounded-3xl p-6 sm:p-8", span.className)}
            >
              <Numeral index={i} className="absolute right-5 top-4" />
              {Icon && <Icon className="size-6 text-primary" aria-hidden />}
              <h3 className={cn("mt-8 text-xl font-medium tracking-tight", span.wide && "lg:text-3xl lg:font-light")}>{feature.title}</h3>
              <p className={cn("mt-2 max-w-prose text-sm text-muted-foreground sm:text-base", span.wide && "lg:max-w-xl")}>{feature.description}</p>
            </li>
          );
        })}
      </ul>

      <div data-manifesto data-reveal className="mx-auto mt-24 flex max-w-4xl flex-col items-center gap-6 text-center sm:mt-32">
        <span data-kicker className="landing-eyebrow">
          {words.manifesto.kicker}
        </span>
        <p className="text-balance text-2xl font-light leading-snug tracking-[-0.02em] sm:text-4xl">
          <strong className="font-medium text-primary">{words.manifesto.lead}</strong> {words.manifesto.body}
        </p>
      </div>
    </section>
  );
}
