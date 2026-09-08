"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FeaturesSection() {
  const t = useTranslations("features");

  const items = [
    { title: t("item1"), description: t("item1desc") },
    { title: t("item2"), description: t("item2desc") },
    { title: t("item3"), description: t("item3desc") },
  ];

  return (
    <section
      data-section="features"
      className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24"
    >
      <h2 className="text-center text-3xl font-semibold tracking-tight">
        {t("title")}
      </h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {item.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
