"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { useContent } from "@/hooks/use-content";
import { cn } from "@/lib/utils";
import { DISPLAY_H2, GridBackdrop, Numeral, SectionHead } from "./ui";

/**
 * The first three or four things a user does, under one glowing line. The line is an SVG
 * path in the palette's colour that draws itself as the section scrolls into view
 * (`editorial.css`, scroll-driven; fully drawn where that is unsupported or motion is
 * reduced); the steps alternate above and below it on a desktop and stack along a vertical
 * hairline on a phone. The `ol`/`li` shape is the shared section's, so the step-count test
 * keeps holding.
 */
export function HowItWorksSection() {
  const t = useTranslations("howItWorks");
  const block = useContent().landing?.howItWorks;
  if (!block) return null; // zod requires the copy whenever this section is enabled

  const four = block.steps.length === 4;

  return (
    <section id="howItWorks" data-section="howItWorks" className="scroll-mt-24 relative mx-auto w-full max-w-6xl overflow-clip px-4 py-20 sm:py-28">
      <GridBackdrop />
      <SectionHead>
        <h2 className={DISPLAY_H2}>{block.heading ?? t("title")}</h2>
      </SectionHead>

      <div className="relative mt-16 sm:mt-24">
        <svg
          data-glow-line
          aria-hidden
          viewBox="0 0 1200 260"
          preserveAspectRatio="none"
          className="editorial-glow-line pointer-events-none absolute inset-x-0 top-0 hidden h-[260px] w-full lg:block"
        >
          {/* High over the steps that sit high (odd columns dip), so the line never crosses a numeral. */}
          <path
            d={four
              ? "M-20,110 C60,110 90,12 150,12 S350,196 450,196 S650,12 750,12 S950,196 1050,196 S1200,96 1240,104"
              : "M-20,110 C80,110 120,12 200,12 S500,196 600,196 S900,12 1000,12 S1200,80 1240,90"}
            pathLength="1"
          />
        </svg>

        <ol className={cn("editorial-steps relative grid gap-10 lg:gap-6", four ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
          {block.steps.map((step, i) => (
            <li key={i} data-reveal style={{ "--i": i } as CSSProperties} className={cn("relative flex gap-5 pl-6 lg:block lg:pl-0", i % 2 === 1 ? "lg:mt-60" : "lg:mt-7")}>
              <span aria-hidden className="editorial-tick" />
              <Numeral index={i} className="editorial-step-numeral shrink-0" />
              <div className="lg:mt-3">
                <h3 className="text-lg font-medium tracking-tight sm:text-xl">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
