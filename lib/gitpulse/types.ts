/**
 * types.ts — the client's copy of the `/api/gitpulse/*` contract (factory-web
 * `functions/src/gitpulse/types.ts`) — change both. Plus the studio's own client-side
 * shapes (digest sources, moods, channels) that never leave the browser.
 */

export type GitpulseLocale = "en" | "cs";

export const TEXT_KINDS = ["blog", "linkedin", "x", "instagram", "facebook", "tiktok", "youtube", "video-script"] as const;
export type TextKind = (typeof TEXT_KINDS)[number];

export interface Digest {
  repo: string;
  weekOf: string;
  commits: number;
  pullRequests: number;
  contributors: number;
  additions?: number;
  deletions?: number;
  languages?: string[];
  highlights?: string[];
}

export interface GeneratedText {
  title: string;
  body: string;
  hashtags: string[];
}

export const IMAGE_STYLES = ["abstract-tech", "gradient", "editorial", "neon"] as const;
export type ImageStyle = (typeof IMAGE_STYLES)[number];

export const IMAGE_ASPECTS = ["1:1", "16:9", "9:16", "4:5"] as const;
export type ImageAspect = (typeof IMAGE_ASPECTS)[number];

export const TTS_VOICES = ["Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede"] as const;
export type TtsVoice = (typeof TTS_VOICES)[number];

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}

export type UiError = "auth" | "invalid" | "quota-user" | "quota-global" | "rate" | "model" | "internal" | "network";

export type ApiOutcome<T> = { ok: true; data: T } | { ok: false; error: UiError };

export interface TextResponse { content: GeneratedText; costUsd: number }
export interface ImageResponse { image: { dataUri: string; contentType: string }; costUsd: number }
export interface SpeechResponse { audio: { dataUri: string; seconds: number }; costUsd: number }
export interface AssistantResponse { reply: string; costUsd: number }

/** Generative-soundtrack moods (lib/gitpulse/music.ts — rendered in the browser, €0). */
export const MUSIC_MOODS = ["calm", "upbeat", "epic"] as const;
export type MusicMood = (typeof MUSIC_MOODS)[number];
