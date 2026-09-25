"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { heroControlsView, type HeroButton } from "@/lib/hero-image";
import type { UseHeroImage } from "@/hooks/use-hero-image";

/**
 * The creator's and the founder's buttons under the hero. Rendered only when the server
 * named one of those two roles — every other visitor gets nothing, not a disabled button.
 *
 * The creator's single try is confirmed in the same button (a second tap), not a modal:
 * less friction on a phone and no focus trap. 44 px targets, full width and stacked below
 * `sm`, like the header's "Change colour".
 */
export function HeroImageControls({ hero }: { hero: UseHeroImage }) {
  const t = useTranslations("heroImage");
  const [confirming, setConfirming] = useState(false);
  const status = hero.status;
  if (!status) return null;

  const view = heroControlsView({
    role: status.role,
    hasImage: Boolean(status.src),
    visible: status.visible,
    generation: status.generation,
    ownerCanGenerate: status.ownerCanGenerate,
    confirming,
    timedOut: hero.timedOut,
  });

  function run(button: HeroButton) {
    switch (button.action) {
      case "generate":
        if (status!.role === "owner" && !confirming && button.label === "generate") {
          setConfirming(true);
          return;
        }
        setConfirming(false);
        void hero.generate();
        return;
      case "confirm":
        setConfirming(false);
        void hero.generate();
        return;
      case "hide":
        void hero.setVisible(false);
        return;
      case "show":
        void hero.setVisible(true);
        return;
    }
  }

  return (
    <div
      data-hero-image-controls
      className="relative mx-auto flex w-full max-w-5xl flex-col items-stretch gap-3 px-4 pb-8 sm:flex-row sm:items-center sm:justify-center"
    >
      <p aria-live="polite" className="text-center text-sm text-muted-foreground sm:text-left">
        {view.message ? t(view.message) : ""}
      </p>
      {view.buttons.map((button) => (
        <Button
          key={`${button.action}-${button.label}`}
          type="button"
          variant="outline"
          className="h-11 w-full sm:w-auto"
          disabled={button.disabled || hero.working}
          aria-busy={button.busy || undefined}
          onClick={() => run(button)}
        >
          {t(button.label)}
        </Button>
      ))}
    </div>
  );
}
