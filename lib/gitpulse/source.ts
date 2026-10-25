import { sandboxRoot } from "../records";

/**
 * source.ts — where a content item comes from: a repository, a link, or a file the visitor
 * uploaded from the phone (a video, an image, a sound, a Markdown text).
 *
 * The grid stores one `text` field (`repository`, ≤ 200 characters), so a source is
 * encoded into it: a repository is its plain text — exactly what records written before
 * sources existed hold — a link is its URL, and a file is `<kind>:<uploadId>/<name>`.
 * The bytes live in Firebase Storage under the visitor's own sandbox.
 *
 * The content-type allowlists and size caps are repeated by factory-web `storage.rules`
 * (match /demos/{slug}/users/{uid}/uploads/…): change one, change both. Pure — no Firebase.
 */

export const SOURCE_KINDS = ["repository", "video", "image", "audio", "markdown", "url"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
export type FileKind = Exclude<SourceKind, "repository" | "url">;
export const FILE_KINDS: readonly FileKind[] = ["video", "image", "audio", "markdown"];

export type StoredSource =
  | { kind: "repository"; text: string }
  | { kind: "url"; url: string }
  | { kind: FileKind; uploadId: string; name: string };

const MB = 1024 * 1024;

export const FILE_LIMITS: Record<FileKind, { maxBytes: number; accept: string }> = {
  video: { maxBytes: 100 * MB, accept: "video/*" },
  image: { maxBytes: 20 * MB, accept: "image/*" },
  audio: { maxBytes: 25 * MB, accept: "audio/*" },
  markdown: { maxBytes: 1 * MB, accept: ".md,.markdown,text/markdown" },
};

/**
 * How long the Storage SDK may keep retrying a failing request. It retries a network error
 * (a refused CORS preflight, a dead connection) with doubling sleeps until one exceeds this
 * budget — 60 s ends after ~63 s; the SDK's default 10 min sat at "Uploading 0 %" for ~17 min
 * when the bucket did not exist (2026-10-26). A phone through a short tunnel still makes it.
 */
export const STORAGE_RETRY_MS = { upload: 60_000, operation: 30_000 } as const;

/** Extension → content type. SVG is absent on purpose: it can carry script. */
const BY_EXTENSION: Record<Exclude<FileKind, "markdown">, Record<string, string>> = {
  video: { mp4: "video/mp4", mov: "video/quicktime", m4v: "video/x-m4v", webm: "video/webm", "3gp": "video/3gpp", mkv: "video/x-matroska" },
  image: { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", heic: "image/heic", heif: "image/heif", avif: "image/avif" },
  audio: { mp3: "audio/mpeg", m4a: "audio/x-m4a", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/opus", flac: "audio/flac", amr: "audio/amr", weba: "audio/webm" },
};
/** Types phones report that no extension above maps to. */
const ALIASES: Record<Exclude<FileKind, "markdown">, string[]> = {
  video: [],
  image: [],
  audio: ["audio/mp4", "audio/x-wav", "audio/webm", "audio/3gpp"],
};
const ALLOWED = Object.fromEntries(
  (["video", "image", "audio"] as const).map((kind) => [kind, new Set([...Object.values(BY_EXTENSION[kind]), ...ALIASES[kind]])])
) as Record<Exclude<FileKind, "markdown">, Set<string>>;

const UPLOAD = /^(video|image|audio|markdown):([a-f0-9]{32})\/([A-Za-z0-9._-]{1,80})$/;
const HTTP = /^https?:\/\/\S+$/i;

export function parseSource(stored: unknown): StoredSource | null {
  if (typeof stored !== "string") return null;
  const text = stored.trim();
  if (!text) return null;
  const upload = UPLOAD.exec(text);
  if (upload) return { kind: upload[1] as FileKind, uploadId: upload[2]!, name: upload[3]! };
  if (HTTP.test(text)) return { kind: "url", url: text };
  return { kind: "repository", text };
}

export function encodeSource(source: StoredSource): string {
  switch (source.kind) {
    case "repository":
      return source.text.trim();
    case "url":
      return source.url.trim();
    default:
      return `${source.kind}:${source.uploadId}/${source.name}`;
  }
}

export function isHttpUrl(text: string): boolean {
  if (!HTTP.test(text.trim())) return false;
  try {
    new URL(text.trim());
    return true;
  } catch {
    return false;
  }
}

/** Where an upload's bytes live: the visitor's sandbox, one folder per upload. */
export function sourcePath(slug: string | null, uid: string, uploadId: string, name: string): string {
  return `${sandboxRoot(slug, uid)}/uploads/${uploadId}/${name}`;
}

export function newUploadId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** ASCII letters, digits, `.`, `_` and `-` only, at most 80 characters, extension kept. */
export function safeFileName(name: string): string {
  const ascii = name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const cleaned = ascii.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-{2,}/g, "-").replace(/^[.-]+|[.-]+$/g, "");
  if (!cleaned) return "file";
  if (cleaned.length <= 80) return cleaned;
  const ext = extension(cleaned);
  const suffix = ext && ext.length <= 10 ? `.${ext}` : "";
  return cleaned.slice(0, 80 - suffix.length).replace(/[.-]+$/, "") + suffix;
}

/** The content type an upload is stored with, or null when this tile does not take the file. */
export function contentTypeFor(kind: FileKind, file: { name: string; type: string }): string | null {
  const type = file.type.toLowerCase();
  const ext = extension(file.name);
  if (kind === "markdown") return ext === "md" || ext === "markdown" || type === "text/markdown" ? "text/markdown" : null;
  if (ALLOWED[kind].has(type)) return type;
  // Only a picker that reported nothing is trusted to the extension; a reported type wins.
  if (type && type !== "application/octet-stream") return null;
  return BY_EXTENSION[kind][ext] ?? null;
}

export type FileIssue = "type" | "size" | "empty";

export function fileIssue(kind: FileKind, file: { name: string; type: string; size: number }): FileIssue | null {
  if (!contentTypeFor(kind, file)) return "type";
  if (file.size === 0) return "empty";
  if (file.size > FILE_LIMITS[kind].maxBytes) return "size";
  return null;
}

/** What the grid shows for a source. */
export function sourceLabel(source: StoredSource): string {
  switch (source.kind) {
    case "repository":
      return source.text;
    case "url":
      return source.url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "");
    default:
      return source.name;
  }
}
