"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { config } from "@/lib/prototype-config";
import { useContent } from "@/hooks/use-content";
import { landingActionHref } from "@/lib/landing-action";

// The interactive half of the CTA — what it says and where it goes — is the `cta` pattern's
// declared schema, so it comes from prototype.config.json. It used to come from the
// translation bundle and the link was hardcoded to "#contact", which meant a customer could
// pick a call to action and get the template's one instead. The heading and subtitle stay
// in messages, where the rest of the prose lives.

export function CtaSection() {
  const t = useTranslations("cta");
  const label = useContent().cta?.label ?? t("action");
  const href = landingActionHref(config.patterns);

  return (
    <section
      data-section="cta"
      className="mx-auto w-full max-w-5xl px-4 py-16 text-center sm:py-24"
    >
      <div className="rounded-2xl bg-secondary px-6 py-12">
        <h2 className="text-3xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        {href && (
          <Button asChild size="lg" className="mt-6">
            <Link href={href}>{label}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
