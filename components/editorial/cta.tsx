"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContent } from "@/hooks/use-content";
import { landingActionHref } from "@/lib/landing-action";
import { localePath } from "@/lib/locale-routing";
import { config } from "@/lib/prototype-config";
import { SCENE, sceneLoops } from "@/lib/scene";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";
import { LightLoop } from "./light-loop";
import { DISPLAY_H2 } from "./ui";

/**
 * The closing band, then the brand block "Built by TOKENWISE" (`brand-mark.tsx`) whole
 * above the footer — the reference landings end on their own letters the same way. Label
 * and destination of the band's action come from the `cta` pattern, as in the shared section.
 * Behind the band's words, ribbons of light flow (T-340, a Blender loop tinted by the palette) —
 * or, under a scene (T-368, `lib/scene.ts`), the scene's own close: the orb rising, the stage
 * light's pool, the glass drifting up behind the words (`scenes.css`).
 */
const LOOPS = sceneLoops(SCENE);

export function CtaSection() {
  const t = useTranslations("cta");
  const locale = useLocale();
  const copy = useContent().cta;
  const action = landingActionHref(config.patterns);
  // A route is served per language; an anchor is the same on every document.
  const href = action && action.startsWith("/") ? localePath(locale, action) : action;

  return (
    <section id="cta" data-section="cta" data-stagger className="editorial-closing scroll-mt-24 relative mx-auto w-full max-w-6xl overflow-clip px-4 pb-6 pt-20 sm:pt-28">
      <div data-reveal className="editorial-band relative overflow-clip rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-20">
        <LightLoop name={LOOPS.closing} marker="data-closing-light" className={cn("editorial-light-band", SCENE && `editorial-light-band-${SCENE}`)} />
        <h2 className={`${DISPLAY_H2} mx-auto`}>{copy?.title ?? t("title")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-balance text-muted-foreground sm:text-lg">{copy?.subtitle ?? t("subtitle")}</p>
        {href && (
          <Button asChild size="lg" className="editorial-pill mt-8 h-12 rounded-full px-6 text-sm">
            <Link href={href}>
              {copy?.label ?? t("action")}
              <ArrowUpRight aria-hidden className="size-4" />
            </Link>
          </Button>
        )}
      </div>
      <BrandMark />
    </section>
  );
}
