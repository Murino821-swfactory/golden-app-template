"use client";

import { useTranslations } from "next-intl";

export function FaqSection() {
  const t = useTranslations("faq");

  return (
    <section
      data-section="faq"
      className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24"
    >
      <h2 className="text-center text-3xl font-semibold tracking-tight">
        {t("title")}
      </h2>
      <div className="mt-8 space-y-2 rounded-lg border border-border/60 p-4">
        <h3 className="font-medium">{t("q1")}</h3>
        <p className="text-sm text-muted-foreground">{t("a1")}</p>
      </div>
    </section>
  );
}
