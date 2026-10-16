/**
 * publish.ts — what a publish button does.
 *
 * None of the five networks lets a browser post on a profile's behalf without a server and
 * a token, and a static prototype holds neither (Golden Security: no secrets in code). So
 * "publish" is the honest version of one click: the visual in the network's size and the
 * caption within its limit, handed to the phone's share sheet — where Instagram, TikTok
 * and YouTube appear as targets — or, on a desktop, saved and copied while the profile
 * opens in a new tab. Every publish is logged in this browser; a signed-in owner also
 * gets it in the content queue (`components/studio/studio.tsx`).
 *
 * The browser calls live behind `PublishEnv` so the decision is testable without one.
 */
import { fileNameFor, titleFor, type Channel, type ScenarioContent } from "./channels";
import { createStoredValue } from "./client-store";

export type PublishOutcome = "shared" | "cancelled" | "opened" | "downloaded" | "failed";

export interface PublishInput {
  channel: Channel;
  content: ScenarioContent;
  caption: string;
  /** The card in the channel's format, or null while it is still rendering. */
  image: Blob | null;
  /** A recorded clip, when the scenario has one (the game). */
  video?: { blob: Blob; ext: string } | null;
  /** A Markdown article, for the website. */
  article?: string | null;
  /** The address the post points at — the share dialogs take it. */
  pageUrl: string;
}

export interface PublishEnv {
  /** Whether the share sheet is the right route here: a phone that can share files. */
  preferShare(files: File[]): boolean;
  share(data: { files: File[]; title: string; text: string }): Promise<void>;
  copy(text: string): Promise<void>;
  download(file: File): void;
  /** True when a tab opened; false when the browser blocked it. */
  open(url: string): boolean;
}

export function browserEnv(): PublishEnv {
  return {
    preferShare(files) {
      if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
      const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
      return Boolean(coarse) && navigator.canShare({ files });
    },
    share: (data) => navigator.share(data),
    async copy(text) {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    },
    download(file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
    open(url) {
      const tab = window.open(url, "_blank", "noopener,noreferrer");
      return tab !== null;
    },
  };
}

/** The files one publish carries, named so a folder of them sorts by day and channel. */
export function filesFor(input: PublishInput, now = new Date()): File[] {
  const files: File[] = [];
  if (input.image) files.push(new File([input.image], fileNameFor(input.channel, input.content, "png", now), { type: "image/png" }));
  if (input.video && (input.channel.id === "tiktok" || input.channel.id === "youtube")) {
    files.push(new File([input.video.blob], fileNameFor(input.channel, input.content, input.video.ext, now), { type: input.video.blob.type || "video/webm" }));
  }
  if (input.article && input.channel.id === "site") {
    files.push(new File([input.article], fileNameFor(input.channel, input.content, "md", now), { type: "text/markdown" }));
  }
  return files;
}

/** Where the desktop route sends the visitor: a share dialog when the network has one. */
export function destinationFor(channel: Channel, pageUrl: string): string {
  return channel.shareUrl ? channel.shareUrl(pageUrl) : channel.url;
}

export async function publish(input: PublishInput, env: PublishEnv = browserEnv()): Promise<PublishOutcome> {
  const files = filesFor(input);
  if (files.length === 0) return "failed";
  const title = titleFor(input.channel, input.content);

  if (env.preferShare(files)) {
    try {
      await env.share({ files, title, text: input.caption });
      return "shared";
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return "cancelled";
      // Fall through to the desktop route — the share sheet refused the files.
    }
  }

  // The tab first, synchronously: a popup opened after an `await` loses the click's
  // activation and the browser blocks it.
  const opened = env.open(destinationFor(input.channel, input.pageUrl));
  for (const file of files) env.download(file);
  try {
    await env.copy(input.channel.id === "site" && input.article ? input.article : input.caption);
  } catch {
    /* clipboard refused — the caption is still on screen to copy by hand */
  }
  return opened ? "opened" : "downloaded";
}

/* ── The log ─────────────────────────────────────────────────────────────────────── */

export interface PublishLogEntry {
  id: string;
  /** ISO timestamp. */
  at: string;
  channel: Channel["id"];
  scenario: ScenarioContent["scenario"];
  title: string;
  outcome: PublishOutcome;
}

export const PUBLISH_LOG_KEY = "gitpulse.publish-log.v1";
export const PUBLISH_LOG_LIMIT = 50;
const EMPTY_LOG: PublishLogEntry[] = [];

export function parseLog(raw: string | null): PublishLogEntry[] {
  if (!raw) return EMPTY_LOG;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e): e is PublishLogEntry => typeof e?.id === "string" && typeof e?.at === "string") : EMPTY_LOG;
  } catch {
    return EMPTY_LOG;
  }
}

/** Newest first, capped — the log is a receipt, not an archive. */
export function withEntry(log: readonly PublishLogEntry[], entry: PublishLogEntry): PublishLogEntry[] {
  return [entry, ...log.filter((e) => e.id !== entry.id)].slice(0, PUBLISH_LOG_LIMIT);
}

/** This browser's receipts. `usePublishLog()` renders them; `appendPublishLog` adds one. */
export const publishLog = createStoredValue<PublishLogEntry[]>(PUBLISH_LOG_KEY, EMPTY_LOG, parseLog, (log) => JSON.stringify(log));

export const usePublishLog = publishLog.use;

export function appendPublishLog(entry: PublishLogEntry): PublishLogEntry[] {
  const next = withEntry(publishLog.read(), entry);
  publishLog.set(next);
  return next;
}
