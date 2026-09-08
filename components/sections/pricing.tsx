"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PricingSection() {
  const t = useTranslations("pricing");
  const landing = useTranslations("landing");

  const tiers = [t("free"), t("pro"), t("enterprise")];

  return (
    <section
      data-section="pricing"
      className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24"
    >
      <h2 className="text-center text-3xl font-semibold tracking-tight">
        {t("title")}
      </h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {tiers.map((tier) => (
          <Card key={tier}>
            <CardHeader>
              <CardTitle>{tier}</CardTitle>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" className="w-full">
                {landing("cta")}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
