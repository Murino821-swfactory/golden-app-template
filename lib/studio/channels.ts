/**
 * channels.ts — where GitPulse Studio publishes, and the words it publishes with.
 *
 * Five destinations, fixed by the owner (tokenwise.sk and its four social profiles).
 * Each one names the image format it wants and how long a caption it takes; the
 * composition below is deterministic, so `tests/studio-logic.spec.ts` can hold it to the
 * limits without a browser. Posting itself happens in `publish.ts`.
 */

export type ChannelId = "site" | "facebook" | "instagram" | "tiktok" | "youtube";
export type AssetFormat = "og" | "square" | "portrait" | "wide";
export type ScenarioId = "projects" | "history" | "game";
export type StudioLocale = "en" | "cs";

export interface Channel {
  id: ChannelId;
  label: string;
  /** The profile as people see it. */
  handle: string;
  /** The profile or site, opened when the share sheet is not the route. */
  url: string;
  /** A share dialog that takes the page address, when the network offers one. */
  shareUrl?: (pageUrl: string) => string;
  format: AssetFormat;
  /** The longest caption the network accepts. */
  captionMax: number;
  /** YouTube wants a title apart from the description. */
  titleMax?: number;
  /** Which lines of the scenario make it into the caption. */
  detailLines: number;
  /** Brand tint for the button dot — no logos, the names carry the meaning. */
  tint: string;
}

export const CHANNELS: readonly Channel[] = [
  { id: "site", label: "tokenwise.sk", handle: "tokenwise.sk", url: "https://tokenwise.sk/", format: "og", captionMax: 5000, detailLines: 5, tint: "#dcf979" },
  {
    id: "facebook",
    label: "Facebook",
    handle: "@tokenwisefactory",
    url: "https://www.facebook.com/tokenwisefactory",
    shareUrl: (pageUrl) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
    format: "og",
    captionMax: 2000,
    detailLines: 5,
    tint: "#1877f2",
  },
  { id: "instagram", label: "Instagram", handle: "@tokenwisefactory", url: "https://www.instagram.com/tokenwisefactory/", format: "square", captionMax: 2200, detailLines: 3, tint: "#e1306c" },
  { id: "tiktok", label: "TikTok", handle: "@tokenwisefactory", url: "https://www.tiktok.com/@tokenwisefactory", format: "portrait", captionMax: 2200, detailLines: 3, tint: "#69c9d0" },
  { id: "youtube", label: "YouTube", handle: "@tokenwisefactory", url: "https://www.youtube.com/@tokenwisefactory", format: "wide", captionMax: 5000, titleMax: 100, detailLines: 5, tint: "#ff0000" },
];

export const CHANNEL_BY_ID: Record<ChannelId, Channel> = Object.fromEntries(CHANNELS.map((c) => [c.id, c])) as Record<ChannelId, Channel>;

/** Pixel sizes the networks recommend for a still. */
export const FORMAT_SIZES: Record<AssetFormat, { width: number; height: number }> = {
  og: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1920 },
  wide: { width: 1280, height: 720 },
};

/** One scenario, ready to be worded for any channel. */
export interface ScenarioContent {
  scenario: ScenarioId;
  title: string;
  summary: string;
  /** Short facts, one per line. */
  lines: string[];
  /** Up to four numbers for the visual. */
  stats: { label: string; value: string }[];
  /** Where the story lives. */
  url: string;
  hashtags: string[];
}

/** Cut at a word boundary so a limit never splits a hashtag or a URL in two. */
export function clampCaption(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, Math.max(0, max - 1));
  const at = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(" "));
  return (at > max * 0.5 ? cut.slice(0, at) : cut).trimEnd() + "…";
}

/** The caption for one channel: title, summary, the facts the channel has room for, the
 * link and the hashtags — within the channel's limit. */
export function captionFor(channel: Channel, content: ScenarioContent): string {
  const lines = content.lines.slice(0, channel.detailLines).map((l) => `• ${l}`);
  const parts = [content.title, "", content.summary];
  if (lines.length) parts.push("", ...lines);
  parts.push("", content.url);
  if (content.hashtags.length) parts.push("", content.hashtags.join(" "));
  return clampCaption(parts.join("\n"), channel.captionMax);
}

/** A video title where the channel wants one apart from the description. */
export function titleFor(channel: Channel, content: ScenarioContent): string {
  return clampCaption(content.title, channel.titleMax ?? 100);
}

/** The Markdown article for the website: the same facts as a post, in prose shape. */
export function articleFor(content: ScenarioContent, labels: { statsHeading: string; factsHeading: string; readMore: string; generatedBy: string }): string {
  const out = [`# ${content.title}`, "", content.summary, ""];
  if (content.stats.length) {
    out.push(`## ${labels.statsHeading}`, "");
    for (const s of content.stats) out.push(`- **${s.value}** ${s.label}`);
    out.push("");
  }
  if (content.lines.length) {
    out.push(`## ${labels.factsHeading}`, "");
    for (const l of content.lines) out.push(`- ${l}`);
    out.push("");
  }
  out.push(`${labels.readMore}: ${content.url}`, "", `_${labels.generatedBy}_`, "");
  return out.join("\n");
}

/** `2026-10-16-projects-instagram.png` — sortable, readable, no spaces. */
export function fileNameFor(channel: Channel, content: ScenarioContent, ext: string, now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return `${day}-${content.scenario}-${channel.id}.${ext}`;
}
