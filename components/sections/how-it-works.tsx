"use client";

import { useTranslations } from "next-intl";
import { useContent } from "@/hooks/use-content";
import { cn } from "@/lib/utils";

/** The first three or four things a user does — numerals as typography, not icons. */
export function HowItWorksSection() {
  const t = useTranslations("howItWorks");
  const block = useContent().landing?.howItWorks;
  if (!block) return null; // zod requires the copy whenever this section is enabled

  return (
    <section data-section="howItWorks" className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
      <h2 className="text-center text-3xl font-semibold tracking-tight">{block.heading ?? t("title")}</h2>
      <ol className={cn("mt-10 grid gap-8 sm:grid-cols-3", block.steps.length === 4 && "sm:grid-cols-2 lg:grid-cols-4")}>
        {block.steps.map((step, i) => (
          <li key={i} className="flex gap-4 sm:flex-col sm:gap-3">
            <span aria-hidden className="text-4xl font-semibold tabular-nums leading-none text-primary">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="font-medium">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
