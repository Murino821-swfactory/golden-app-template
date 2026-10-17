"use client";

import { Player } from "@remotion/player";
import { Input } from "@/components/ui/input";
import type { GitpulseCopy } from "@/lib/gitpulse/copy";
import type { Digest } from "@/lib/gitpulse/types";
import { RECAP_FPS, RECAP_HEIGHT, RECAP_WIDTH, RecapVideo, recapDurationInFrames } from "./recap-video";
import { StepCard, useHydrated } from "./ui";

/**
 * Step 6 — the recap video, rendered LIVE by Remotion's player from the digest and the
 * audio generated in the earlier steps. Mounted-only: the page is statically exported and
 * the player plays in browsers, not in the prerender.
 */

export function VideoPanel({ digest, headline, onHeadline, voiceoverUri, voiceoverSeconds, musicUri, copy }: {
  digest: Digest | null;
  headline: string;
  onHeadline: (headline: string) => void;
  voiceoverUri?: string;
  voiceoverSeconds?: number;
  musicUri?: string;
  copy: GitpulseCopy;
}) {
  const mounted = useHydrated();
  const c = copy.video;

  if (!digest) return null;

  const statLabels = {
    commits: copy.digest.commits,
    pullRequests: copy.digest.pullRequests,
    contributors: copy.digest.contributors,
    weekOf: copy.digest.weekOf,
  };

  return (
    <StepCard title={c.step} description={c.note}>
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="gitpulse-headline">{c.headlineLabel}</label>
        <Input
          id="gitpulse-headline"
          value={headline}
          onChange={(e) => onHeadline(e.target.value)}
          maxLength={140}
          className="mt-1 h-10"
        />
      </div>
      <div className="flex gap-2 text-xs text-muted-foreground">
        {voiceoverUri && <span className="rounded-full border border-border px-2 py-0.5">{c.withVoiceover}</span>}
        {musicUri && <span className="rounded-full border border-border px-2 py-0.5">{c.withMusic}</span>}
      </div>
      {mounted && (
        <div className="mx-auto w-full max-w-[320px]" data-testid="gitpulse-player">
          <Player
            component={RecapVideo}
            inputProps={{ digest, headline, voiceoverUri, musicUri, statLabels }}
            durationInFrames={recapDurationInFrames(voiceoverSeconds)}
            fps={RECAP_FPS}
            compositionWidth={RECAP_WIDTH}
            compositionHeight={RECAP_HEIGHT}
            style={{ width: "100%", aspectRatio: "9 / 16", borderRadius: 12, overflow: "hidden" }}
            controls
            loop
            acknowledgeRemotionLicense
          />
        </div>
      )}
    </StepCard>
  );
}
