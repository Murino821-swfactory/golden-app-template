import type { GeneratedText, TextKind } from "./types";

/**
 * share.ts — what the publish buttons really do. X, LinkedIn and Facebook have public web
 * composers, so publishing opens the visitor's OWN composer prefilled with the generated
 * copy — a real publish path with no platform credentials stored anywhere. Instagram,
 * TikTok and YouTube have no prefillable web composer; there the button copies the caption
 * and opens the platform, and the UI says exactly that.
 */

export type ShareMode = "intent" | "copy-open";

export interface SharePlan {
  mode: ShareMode;
  /** The composer (intent) or platform (copy-open) URL to open in a new tab. */
  url: string;
}

/** The generated piece as one block of share text: body, then the hashtag line. */
export function composeShareText(content: GeneratedText): string {
  const tags = content.hashtags.filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
  const parts = [content.title, content.body, tags].map((p) => p.trim()).filter(Boolean);
  return parts.join("\n\n");
}

export function sharePlan(kind: TextKind, text: string, pageUrl: string): SharePlan {
  switch (kind) {
    case "x":
      return { mode: "intent", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}` };
    case "linkedin":
      return { mode: "intent", url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}` };
    case "facebook":
      return { mode: "intent", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}&quote=${encodeURIComponent(text)}` };
    case "instagram":
      return { mode: "copy-open", url: "https://www.instagram.com/" };
    case "tiktok":
      return { mode: "copy-open", url: "https://www.tiktok.com/upload" };
    case "youtube":
      return { mode: "copy-open", url: "https://studio.youtube.com/" };
    default:
      return { mode: "copy-open", url: pageUrl };
  }
}

/**
 * The dataGrid `type` option a generated kind files under, against whatever options this
 * prototype's config declares — tolerant, because the config's option list is owned by the
 * customer (and currently edited on a parallel branch). Unmatched kinds land on the first
 * option rather than failing the record write.
 */
export function recordTypeFor(kind: TextKind, options: readonly string[]): string | null {
  if (options.length === 0) return null;
  const canonical: Partial<Record<TextKind, string[]>> = {
    blog: ["blog"],
    linkedin: ["linkedin"],
    x: ["x", "twitter"],
    instagram: ["instagram"],
    facebook: ["facebook"],
    tiktok: ["tiktok"],
    youtube: ["youtube", "video"],
    "video-script": ["video", "youtube"],
  };
  for (const want of canonical[kind] ?? []) {
    const hit = options.find((o) => o.toLowerCase() === want);
    if (hit) return hit;
  }
  return options[0]!;
}
