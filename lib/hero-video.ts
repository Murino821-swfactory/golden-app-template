/**
 * A looping hero video, shipped with this demo branch (GitPulse Studio, 2026-10-17).
 *
 * Veo 3.1 Fast image-to-video from the live AI hero still, first frame = last frame so the
 * 8 s clip loops without a seam; muted (the generated audio is stripped). Cost $0.96 is
 * booked on the prototype's `usage.byAgent.heroVideo`. Files live in `public/hero-video/`,
 * so the URLs carry the export's base path themselves.
 *
 * Playback degrades to the poster: `servePrototype` answers without Range support, which
 * iOS Safari needs for MP4, and visitors who ask for reduced motion never get autoplay.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const dir = `${BASE_PATH}/hero-video`;

export interface HeroVideoSource {
  src: string;
  type: string;
  media?: string;
}

export interface HeroVideo {
  poster: string;
  sources: HeroVideoSource[];
}

export const HERO_VIDEO: HeroVideo | null = {
  poster: `${dir}/hero-poster.webp`,
  sources: [
    { src: `${dir}/hero-720.mp4`, type: "video/mp4", media: "(max-width: 768px)" },
    { src: `${dir}/hero-1080.webm`, type: "video/webm" },
    { src: `${dir}/hero-1080.mp4`, type: "video/mp4" },
  ],
};
