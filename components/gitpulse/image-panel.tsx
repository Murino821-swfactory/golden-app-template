"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateImage } from "@/lib/gitpulse/api";
import type { GitpulseCopy } from "@/lib/gitpulse/copy";
import { getIdToken } from "@/lib/gitpulse/token";
import { IMAGE_ASPECTS, IMAGE_STYLES, type Digest, type ImageAspect, type ImageStyle, type UiError } from "@/lib/gitpulse/types";
import { CostChip, ErrorLine, PillGroup, StepCard } from "./ui";

/** Step 3 — the visual. One Gemini image per click, previewed and downloadable. */

export interface ImageResult {
  dataUri: string;
  costUsd: number;
  aspectRatio: ImageAspect;
}

const ASPECT_LABELS: Record<ImageAspect, string> = { "1:1": "1:1", "16:9": "16:9", "9:16": "9:16", "4:5": "4:5" };

export function ImagePanel({ digest, headline, image, onImage, copy }: {
  digest: Digest | null;
  headline: string;
  image: ImageResult | null;
  onImage: (image: ImageResult) => void;
  copy: GitpulseCopy;
}) {
  const [style, setStyle] = useState<ImageStyle>("abstract-tech");
  const [aspect, setAspect] = useState<ImageAspect>("4:5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const c = copy.image;

  async function generate() {
    if (!digest || busy) return;
    setBusy(true);
    setError(null);
    const out = await generateImage(
      { repo: digest.repo, headline, style, aspectRatio: aspect },
      getIdToken
    );
    setBusy(false);
    if (out.ok) onImage({ dataUri: out.data.image.dataUri, costUsd: out.data.costUsd, aspectRatio: aspect });
    else setError(out.error);
  }

  return (
    <StepCard title={c.step}>
      <PillGroup options={IMAGE_STYLES} value={style} onChange={setStyle} labels={c.styles} />
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{c.aspectLabel}</span>
        <PillGroup options={IMAGE_ASPECTS} value={aspect} onChange={setAspect} labels={ASPECT_LABELS} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void generate()} disabled={!digest || busy} className="h-10">
          {busy ? c.generating : c.generate}
        </Button>
        <CostChip label={copy.text.cost} costUsd={image ? image.costUsd : null} />
      </div>
      <ErrorLine error={error} copy={copy} />
      {image && (
        <div className="space-y-2">
          {/* A data URI from our own API; next/image cannot optimize it and has no need to. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.dataUri} alt={c.alt} className="w-full max-w-sm rounded-lg border border-border" />
          <Button asChild variant="outline" className="h-9">
            <a href={image.dataUri} download={`gitpulse-${digest?.weekOf ?? "week"}.jpg`}>{c.download}</a>
          </Button>
        </div>
      )}
    </StepCard>
  );
}
