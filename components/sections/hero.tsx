"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const t = useTranslations("landing");

  return (
    <section
      data-section="hero"
      className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28"
    >
      <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="max-w-xl text-balance text-muted-foreground sm:text-lg">
        {t("subtitle")}
      </p>
      <Button asChild size="lg">
        <Link href="#contact">{t("cta")}</Link>
      </Button>
    </section>
  );
}
