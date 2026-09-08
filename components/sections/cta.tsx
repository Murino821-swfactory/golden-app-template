"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  const t = useTranslations("cta");

  return (
    <section
      data-section="cta"
      className="mx-auto w-full max-w-5xl px-4 py-16 text-center sm:py-24"
    >
      <div className="rounded-2xl bg-secondary px-6 py-12">
        <h2 className="text-3xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        <Button asChild size="lg" className="mt-6">
          <Link href="#contact">{t("action")}</Link>
        </Button>
      </div>
    </section>
  );
}
