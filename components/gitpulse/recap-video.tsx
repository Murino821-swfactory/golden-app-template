"use client";

import { AbsoluteFill, Audio, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Digest } from "@/lib/gitpulse/types";

/**
 * recap-video.tsx — the Remotion composition behind the studio's recap video: a vertical
 * 1080×1920 weekly recap generated from the digest, with the voiceover and the generative
 * soundtrack layered in when the visitor made them. Rendered LIVE by `@remotion/player`
 * in the browser; the same composition is what a server render farm would take to MP4.
 */

export const RECAP_FPS = 30;
export const RECAP_WIDTH = 1080;
export const RECAP_HEIGHT = 1920;
const MIN_SECONDS = 18;

export interface RecapProps {
  digest: Digest;
  headline: string;
  voiceoverUri?: string;
  musicUri?: string;
  statLabels: { commits: string; pullRequests: string; contributors: string; weekOf: string };
}

/** Long enough for the scenes, and never shorter than the voiceover. */
export function recapDurationInFrames(voiceoverSeconds?: number): number {
  return Math.ceil(Math.max(MIN_SECONDS, (voiceoverSeconds ?? 0) + 1.5) * RECAP_FPS);
}

const BG = "#07100c";
const ACCENT = "#34d399";
const INK = "#e7f5ee";
const MUTED = "#6c8a7c";

const fill: React.CSSProperties = {
  backgroundColor: BG,
  color: INK,
  fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  padding: "140px 96px",
};

function Intro({ digest, weekOfLabel }: { digest: Digest; weekOfLabel: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const pulse = 1 + 0.015 * Math.sin(frame / 7);
  return (
    <AbsoluteFill style={{ ...fill, justifyContent: "center" }}>
      <div style={{ transform: `scale(${enter * pulse})`, transformOrigin: "left center" }}>
        <div style={{ color: ACCENT, fontSize: 44, letterSpacing: 8, fontWeight: 600 }}>GITPULSE · WEEKLY</div>
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05, marginTop: 40, overflowWrap: "anywhere" }}>
          {digest.repo}
        </div>
        <div style={{ color: MUTED, fontSize: 44, marginTop: 32 }}>
          {weekOfLabel} {digest.weekOf}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Counter({ value, label, index }: { value: number; label: string; index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = index * 12;
  const enter = spring({ frame: frame - delay, fps, config: { damping: 15 } });
  const shown = Math.round(interpolate(Math.min(frame - delay, 45), [0, 45], [0, value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }));
  return (
    <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 80}px)` }}>
      <div style={{ fontSize: 150, fontWeight: 800, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>{shown}</div>
      <div style={{ fontSize: 46, color: MUTED, marginTop: -8 }}>{label}</div>
    </div>
  );
}

function Stats({ digest, labels }: { digest: Digest; labels: RecapProps["statLabels"] }) {
  return (
    <AbsoluteFill style={{ ...fill, justifyContent: "center", gap: 90 }}>
      <Counter value={digest.commits} label={labels.commits} index={0} />
      <Counter value={digest.pullRequests} label={labels.pullRequests} index={1} />
      <Counter value={digest.contributors} label={labels.contributors} index={2} />
    </AbsoluteFill>
  );
}

function Highlights({ digest }: { digest: Digest }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = (digest.highlights ?? []).slice(0, 4);
  return (
    <AbsoluteFill style={{ ...fill, justifyContent: "center", gap: 56 }}>
      {items.map((item, i) => {
        const enter = spring({ frame: frame - i * 10, fps, config: { damping: 16 } });
        return (
          <div key={i} style={{ display: "flex", gap: 36, alignItems: "baseline", opacity: enter, transform: `translateX(${(1 - enter) * 120}px)` }}>
            <div style={{ color: ACCENT, fontSize: 52, fontWeight: 800 }}>→</div>
            <div style={{ fontSize: 54, fontWeight: 600, lineHeight: 1.25 }}>{item}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function Outro({ headline }: { headline: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ ...fill, justifyContent: "center" }}>
      <div style={{ opacity: enter, transform: `scale(${0.9 + enter * 0.1})` }}>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.12 }}>{headline}</div>
        <div style={{ color: ACCENT, fontSize: 46, marginTop: 64, fontWeight: 600 }}>GitPulse Studio</div>
      </div>
    </AbsoluteFill>
  );
}

export function RecapVideo({ digest, headline, voiceoverUri, musicUri, statLabels }: RecapProps) {
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const outroStart = durationInFrames - 90;
  const statsEnd = Math.min(210, outroStart);
  const highlightsEnd = outroStart;
  // One fade for the whole piece, so cuts never flash on loop.
  const fade = interpolate(frame, [0, 12, durationInFrames - 12, durationInFrames - 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <AbsoluteFill style={{ opacity: fade }}>
        <Sequence durationInFrames={75}>
          <Intro digest={digest} weekOfLabel={statLabels.weekOf} />
        </Sequence>
        <Sequence from={75} durationInFrames={Math.max(1, statsEnd - 75)}>
          <Stats digest={digest} labels={statLabels} />
        </Sequence>
        <Sequence from={statsEnd} durationInFrames={Math.max(1, highlightsEnd - statsEnd)}>
          <Highlights digest={digest} />
        </Sequence>
        <Sequence from={outroStart}>
          <Outro headline={headline} />
        </Sequence>
      </AbsoluteFill>
      {voiceoverUri && <Audio src={voiceoverUri} />}
      {musicUri && <Audio src={musicUri} volume={voiceoverUri ? 0.3 : 0.6} loop />}
    </AbsoluteFill>
  );
}
