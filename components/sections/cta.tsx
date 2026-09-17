"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { config } from "@/lib/prototype-config";
import { useContent } from "@/hooks/use-content";

// The interactive half of the CTA — what it says and where it goes — is the `cta` pattern's
// declared schema, so it comes from prototype.config.json. It used to come from the
// translation bundle and the link was hardcoded to "#contact", which meant a customer could
// pick a call to action and get the template's one instead. The heading and subtitle stay
// in messages, where the rest of the prose lives.
const cta = config.patterns.cta;

export function CtaSection() {
  const t = useTranslations("cta");
  const label = useContent().cta?.label ?? t("action");
  const href = cta?.href ?? "#contact";

  return (
    <section
      data-section="cta"
      className="mx-auto w-full max-w-5xl px-4 py-16 text-center sm:py-24"
    >
      <div className="rounded-2xl bg-secondary px-6 py-12">
        <h2 className="text-3xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        <Button asChild size="lg" className="mt-6">
          {/* An in-app route goes through the locale-aware Link so it carries the language
              prefix; a fragment or an external URL is left to a plain anchor, which is
              also what stops Next prefetching a path that does not exist. Prefetching
              "/login" under locale routing put a 404 in every visitor's console — the
              minimal config caught it because there the CTA is in view immediately. */}
          {href.startsWith("/") ? (
            <Link href={href}>{label}</Link>
          ) : (
            <a href={href}>{label}</a>
          )}
        </Button>
      </div>
    </section>
  );
}
