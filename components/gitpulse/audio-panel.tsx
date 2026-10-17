"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateSpeech } from "@/lib/gitpulse/api";
import type { GitpulseCopy } from "@/lib/gitpulse/copy";
import { generateTrack } from "@/lib/gitpulse/music";
import { getIdToken } from "@/lib/gitpulse/token";
import { MUSIC_MOODS, TTS_VOICES, type Digest, type MusicMood, type TtsVoice, type UiError } from "@/lib/gitpulse/types";
import { CostChip, ErrorLine, PillGroup, StepCard } from "./ui";

/**
 * Steps 4 + 5 — what the video will sound like. The voiceover is a real TTS call; the
 * soundtrack is composed in the browser (lib/gitpulse/music.ts), seeded by repo + week,
 * so it costs nothing and reproduces.
 */

export interface VoiceoverResult { dataUri: string; seconds: number; costUsd: number }
export interface MusicResult { url: string; mood: MusicMood }

const VOICE_LABELS = Object.fromEntries(TTS_VOICES.map((v) => [v, v])) as Record<TtsVoice, TtsVoice>;

export function VoicePanel({ script, onScript, voiceover, onVoiceover, useInVideo, onUseInVideo, copy }: {
  script: string;
  onScript: (script: string) => void;
  voiceover: VoiceoverResult | null;
  onVoiceover: (v: VoiceoverResult) => void;
  useInVideo: boolean;
  onUseInVideo: (use: boolean) => void;
  copy: GitpulseCopy;
}) {
  const [voice, setVoice] = useState<TtsVoice>("Kore");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const c = copy.voice;

  async function generate() {
    const text = script.trim();
    if (text.length < 5 || busy) return;
    setBusy(true);
    setError(null);
    const out = await generateSpeech({ text: text.slice(0, 700), voice }, getIdToken);
    setBusy(false);
    if (out.ok) {
      onVoiceover({ dataUri: out.data.audio.dataUri, seconds: out.data.audio.seconds, costUsd: out.data.costUsd });
      onUseInVideo(true);
    } else setError(out.error);
  }

  return (
    <StepCard title={c.step} description={c.scriptHint}>
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="gitpulse-script">{c.scriptLabel}</label>
        <Textarea
          id="gitpulse-script"
          value={script}
          onChange={(e) => onScript(e.target.value)}
          rows={3}
          maxLength={700}
          className="mt-1 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{c.voiceLabel}</span>
        <PillGroup options={TTS_VOICES} value={voice} onChange={setVoice} labels={VOICE_LABELS} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void generate()} disabled={busy || script.trim().length < 5} className="h-10">
          {busy ? c.generating : c.generate}
        </Button>
        <CostChip label={copy.text.cost} costUsd={voiceover ? voiceover.costUsd : null} />
        {voiceover && <span className="text-xs text-muted-foreground">{voiceover.seconds}{c.seconds}</span>}
      </div>
      <ErrorLine error={error} copy={copy} />
      {voiceover && (
        <div className="space-y-2">
          <audio controls src={voiceover.dataUri} className="w-full" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useInVideo} onChange={(e) => onUseInVideo(e.target.checked)} />
            {c.useInVideo}
          </label>
        </div>
      )}
    </StepCard>
  );
}

export function MusicPanel({ digest, music, onMusic, useInVideo, onUseInVideo, copy }: {
  digest: Digest | null;
  music: MusicResult | null;
  onMusic: (m: MusicResult) => void;
  useInVideo: boolean;
  onUseInVideo: (use: boolean) => void;
  copy: GitpulseCopy;
}) {
  const [mood, setMood] = useState<MusicMood>("upbeat");
  const [busy, setBusy] = useState(false);
  const lastUrl = useRef<string | null>(null);
  const c = copy.music;

  // Object URLs leak unless revoked when replaced or on unmount.
  useEffect(() => {
    lastUrl.current = music?.url ?? null;
    return () => {
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    };
  }, [music]);

  async function generate() {
    if (!digest || busy) return;
    setBusy(true);
    try {
      const track = await generateTrack(`${digest.repo}:${digest.weekOf}`, mood);
      onMusic({ url: URL.createObjectURL(track.blob), mood });
      onUseInVideo(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <StepCard title={c.step} description={c.note}>
      <PillGroup options={MUSIC_MOODS} value={mood} onChange={setMood} labels={c.moods} />
      <Button onClick={() => void generate()} disabled={!digest || busy} className="h-10">
        {busy ? c.generating : c.generate}
      </Button>
      {music && (
        <div className="space-y-2">
          <audio controls src={music.url} className="w-full" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useInVideo} onChange={(e) => onUseInVideo(e.target.checked)} />
            {c.useInVideo}
          </label>
        </div>
      )}
    </StepCard>
  );
}
