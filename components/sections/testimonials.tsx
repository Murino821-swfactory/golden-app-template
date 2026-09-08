"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

export function TestimonialsSection() {
  const t = useTranslations("testimonials");

  const quotes = [
    { quote: t("quote1"), author: t("author1") },
    { quote: t("quote2"), author: t("author2") },
  ];

  return (
    <section
      data-section="testimonials"
      className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24"
    >
      <h2 className="text-center text-3xl font-semibold tracking-tight">
        {t("title")}
      </h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {quotes.map((item) => (
          <Card key={item.author}>
            <CardContent className="flex flex-col gap-3 pt-6">
              <p className="text-sm text-muted-foreground">
                &ldquo;{item.quote}&rdquo;
              </p>
              <span className="text-sm font-medium">{item.author}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
