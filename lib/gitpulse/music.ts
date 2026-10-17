import type { MusicMood } from "./types";

/**
 * music.ts — the studio's generative soundtrack. A seeded procedural arrangement (pad,
 * bass, plucked pentatonic arpeggio, soft hats) rendered OFFLINE in the visitor's browser
 * with OfflineAudioContext and encoded as a WAV blob, so the recap video gets music that
 * is genuinely generated from the week's data — same repo and week, same track — at €0
 * and with nothing to license. A production music API (Lyria, Suno) would slot in behind
 * the same {mood, seed} → WAV contract.
 */

export interface GeneratedTrack {
  blob: Blob;
  seconds: number;
}

/** Deterministic PRNG, so a digest always sounds like itself. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = (h ^= h >>> 16) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MINOR_PENTATONIC = [0, 3, 5, 7, 10];

interface MoodSpec {
  bpm: number;
  /** Semitone of the tonic relative to A3 (220 Hz). */
  tonic: number;
  /** Chord roots per bar, as scale degrees of the pentatonic set. */
  progression: number[];
  padCutoffHz: number;
  arpProbability: number;
  hats: boolean;
}

const MOODS: Record<MusicMood, MoodSpec> = {
  calm: { bpm: 72, tonic: 0, progression: [0, 3, 1, 2], padCutoffHz: 900, arpProbability: 0.45, hats: false },
  upbeat: { bpm: 108, tonic: 5, progression: [0, 2, 3, 4], padCutoffHz: 1600, arpProbability: 0.8, hats: true },
  epic: { bpm: 88, tonic: -4, progression: [0, 1, 3, 2], padCutoffHz: 1200, arpProbability: 0.6, hats: true },
};

function noteHz(semitoneFromA3: number): number {
  return 220 * Math.pow(2, semitoneFromA3 / 12);
}

function scaleNote(spec: MoodSpec, degree: number, octave = 0): number {
  const idx = ((degree % MINOR_PENTATONIC.length) + MINOR_PENTATONIC.length) % MINOR_PENTATONIC.length;
  return noteHz(spec.tonic + MINOR_PENTATONIC[idx]! + 12 * (octave + Math.floor(degree / MINOR_PENTATONIC.length)));
}

function pluck(ctx: OfflineAudioContext, out: AudioNode, hz: number, at: number, gain: number, release: number) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = hz;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(gain, at + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, at + release);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + release + 0.05);
}

/** Renders `seconds` of soundtrack for (seed, mood). Browser-only — needs Web Audio. */
export async function generateTrack(seed: string, mood: MusicMood, seconds = 18): Promise<GeneratedTrack> {
  const spec = MOODS[mood];
  const rand = seededRandom(`${seed}:${mood}`);
  const rate = 44_100;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(0.9, 0.6);
  master.gain.setValueAtTime(0.9, Math.max(0.6, seconds - 1.6));
  master.gain.linearRampToValueAtTime(0, seconds - 0.05);
  master.connect(ctx.destination);

  const padBus = ctx.createBiquadFilter();
  padBus.type = "lowpass";
  padBus.frequency.value = spec.padCutoffHz;
  padBus.connect(master);

  const beat = 60 / spec.bpm;
  const bar = beat * 4;

  for (let barIndex = 0; barIndex * bar < seconds; barIndex++) {
    const at = barIndex * bar;
    const end = Math.min(at + bar, seconds);
    const root = spec.progression[barIndex % spec.progression.length]!;

    // Pad: a slow triad with a detuned twin on the other channel's side of the stereo field.
    for (const [offset, level] of [[0, 0.1], [2, 0.07], [4, 0.055]] as const) {
      for (const detune of [-4, 4]) {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = scaleNote(spec, root + offset);
        osc.detune.value = detune;
        const pan = ctx.createStereoPanner();
        pan.pan.value = detune / 10;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, at);
        env.gain.linearRampToValueAtTime(level, at + bar * 0.35);
        env.gain.linearRampToValueAtTime(0.0001, end + 0.2);
        osc.connect(env).connect(pan).connect(padBus);
        osc.start(at);
        osc.stop(end + 0.3);
      }
    }

    // Bass: the root an octave down, one soft note per bar.
    const bass = ctx.createOscillator();
    bass.type = "sine";
    bass.frequency.value = scaleNote(spec, root, -1);
    const bassEnv = ctx.createGain();
    bassEnv.gain.setValueAtTime(0, at);
    bassEnv.gain.linearRampToValueAtTime(0.16, at + 0.08);
    bassEnv.gain.exponentialRampToValueAtTime(0.0001, end);
    bass.connect(bassEnv).connect(master);
    bass.start(at);
    bass.stop(end + 0.05);

    // Arpeggio: pentatonic plucks on eighth steps, density and register from the mood.
    for (let step = 0; step < 8; step++) {
      const t = at + step * (beat / 2);
      if (t >= seconds - 0.2 || rand() > spec.arpProbability) continue;
      const degree = root + Math.floor(rand() * 5) + (rand() < 0.3 ? 5 : 0);
      pluck(ctx, master, scaleNote(spec, degree, 1), t, 0.05 + rand() * 0.05, 0.35 + rand() * 0.4);
    }

    // Hats: filtered noise on the offbeats for the moving moods.
    if (spec.hats) {
      for (let step = 0; step < 4; step++) {
        const t = at + (step + 0.5) * beat;
        if (t >= seconds - 0.2) continue;
        const noise = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, Math.ceil(rate * 0.05), rate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (rand() * 2 - 1) * Math.exp(-i / (rate * 0.012));
        noise.buffer = buf;
        const band = ctx.createBiquadFilter();
        band.type = "bandpass";
        band.frequency.value = 8_000;
        band.Q.value = 1.2;
        const env = ctx.createGain();
        env.gain.value = 0.035;
        noise.connect(band).connect(env).connect(master);
        noise.start(t);
      }
    }
  }

  const rendered = await ctx.startRendering();
  return { blob: audioBufferToWavBlob(rendered), seconds };
}

/** 16-bit PCM WAV, channels interleaved — what both <audio> and Remotion's <Audio> play. */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytesPerFrame = channels * 2;
  const data = new DataView(new ArrayBuffer(44 + frames * bytesPerFrame));
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) data.setUint8(offset + i, text.charCodeAt(i));
  };
  writeAscii(0, "RIFF");
  data.setUint32(4, 36 + frames * bytesPerFrame, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, channels, true);
  data.setUint32(24, buffer.sampleRate, true);
  data.setUint32(28, buffer.sampleRate * bytesPerFrame, true);
  data.setUint16(32, bytesPerFrame, true);
  data.setUint16(34, 16, true);
  writeAscii(36, "data");
  data.setUint32(40, frames * bytesPerFrame, true);
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (let ch = 0; ch < channels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[frame]!));
      data.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([data.buffer], { type: "audio/wav" });
}
