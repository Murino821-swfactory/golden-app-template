"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Feature } from "@/lib/prototype-config";
import { useContent } from "@/hooks/use-content";

/**
 * Features section — 1-6 cards showing what the product does.
 *
 * Features come from `prototype.config.json` when present, with translations as a fallback.
 * Each feature can have an optional emoji icon. The grid adapts: 3 columns on desktop for
 * 3 or 6 items, 2 columns for 2 or 4, and a single column on mobile.
 */

const TRANSLATION_FALLBACK: Feature[] = [
  { title: "Feature One", description: "Description of feature one" },
  { title: "Feature Two", description: "Description of feature two" },
  { title: "Feature Three", description: "Description of feature three" },
];

export function FeaturesSection() {
  const t = useTranslations("features");
  const features = useContent().landing?.features ?? TRANSLATION_FALLBACK;

  const gridCols =
    features.length === 2 || features.length === 4
      ? "sm:grid-cols-2"
      : "sm:grid-cols-3";

  return (
    <section
      data-section="features"
      className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24"
    >
      <h2 className="text-center text-3xl font-semibold tracking-tight">
        {t("title")}
      </h2>
      <div className={`mt-10 grid gap-4 ${gridCols}`}>
        {features.map((feature, i) => (
          <Card key={feature.title + i}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {feature.icon && (
                  <span className="text-2xl" role="img" aria-hidden>
                    {feature.icon}
                  </span>
                )}
                {feature.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {feature.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
