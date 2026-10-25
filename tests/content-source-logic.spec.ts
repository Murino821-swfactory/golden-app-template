import { test, expect } from "@playwright/test";
import {
  FILE_KINDS,
  FILE_LIMITS,
  SOURCE_KINDS,
  STORAGE_RETRY_MS,
  contentTypeFor,
  encodeSource,
  fileIssue,
  newUploadId,
  parseSource,
  safeFileName,
  sourceLabel,
  sourcePath,
} from "../lib/gitpulse/source";
import { gitpulseCopy } from "../lib/gitpulse/copy";

/** Pure logic of a content item's source — no browser, no network (the records-logic pattern). */

const id = "0123456789abcdef0123456789abcdef";

test("the six sources, in the order the picker shows them", () => {
  expect(SOURCE_KINDS).toEqual(["repository", "video", "image", "audio", "markdown", "url"]);
  expect(FILE_KINDS).toEqual(["video", "image", "audio", "markdown"]);
});

test("a stored source round-trips through the one text field the grid stores", () => {
  for (const source of [
    { kind: "repository", text: "acme/app" },
    { kind: "url", url: "https://example.com/post?id=1" },
    { kind: "video", uploadId: id, name: "launch.mp4" },
    { kind: "image", uploadId: id, name: "card.png" },
    { kind: "audio", uploadId: id, name: "voice.m4a" },
    { kind: "markdown", uploadId: id, name: "notes.md" },
  ] as const) {
    const stored = encodeSource(source);
    expect(stored.length).toBeLessThanOrEqual(200); // TEXT_MAX of a `text` field
    expect(parseSource(stored)).toEqual(source);
  }
});

test("records written before sources existed stay repositories", () => {
  // The publish bar stores the page it shared without its scheme (use-publish-receipt.ts).
  expect(parseSource("tokenwise.sk/projects")).toEqual({ kind: "repository", text: "tokenwise.sk/projects" });
  expect(parseSource("  acme/app ")).toEqual({ kind: "repository", text: "acme/app" });
  expect(parseSource("")).toBeNull();
  expect(parseSource(undefined)).toBeNull();
  expect(parseSource(42)).toBeNull();
  // Only the exact upload shape is a file — anything else someone typed is their text.
  expect(parseSource("video:not-an-id/clip.mp4")).toEqual({ kind: "repository", text: "video:not-an-id/clip.mp4" });
  expect(parseSource("ftp://example.com/file")).toEqual({ kind: "repository", text: "ftp://example.com/file" });
});

test("a file lives in the visitor's own sandbox, one folder per upload", () => {
  expect(sourcePath("gitpulse-studio", "uid-1", id, "launch.mp4")).toBe(
    `demos/gitpulse-studio/users/uid-1/uploads/${id}/launch.mp4`
  );
  expect(sourcePath(null, "uid-1", id, "a.md")).toBe(`users/uid-1/uploads/${id}/a.md`);
});

test("upload ids are 32 hex characters and do not repeat", () => {
  const a = newUploadId();
  expect(a).toMatch(/^[a-f0-9]{32}$/);
  expect(newUploadId()).not.toBe(a);
});

test("file names are safe in a path and keep their extension", () => {
  expect(safeFileName("IMG 0042.MOV")).toBe("IMG-0042.MOV");
  expect(safeFileName("../../etc/passwd")).toBe("etc-passwd");
  expect(safeFileName("Návrh článku.md")).toBe("Navrh-clanku.md");
  expect(safeFileName("")).toBe("file");
  const long = safeFileName(`${"a".repeat(150)}.webm`);
  expect(long.length).toBeLessThanOrEqual(80);
  expect(long.endsWith(".webm")).toBe(true);
});

test("content types come from an allowlist the storage rules repeat", () => {
  expect(contentTypeFor("video", { name: "IMG_0042.MOV", type: "video/quicktime" })).toBe("video/quicktime");
  expect(contentTypeFor("video", { name: "clip.mp4", type: "" })).toBe("video/mp4"); // pickers that report no type
  expect(contentTypeFor("image", { name: "photo.heic", type: "image/heic" })).toBe("image/heic");
  expect(contentTypeFor("image", { name: "logo.svg", type: "image/svg+xml" })).toBeNull(); // scriptable
  expect(contentTypeFor("audio", { name: "voice.m4a", type: "audio/x-m4a" })).toBe("audio/x-m4a");
  expect(contentTypeFor("audio", { name: "memo.mp3", type: "" })).toBe("audio/mpeg");
  // Android reports .md as text/plain or application/octet-stream.
  expect(contentTypeFor("markdown", { name: "README.md", type: "application/octet-stream" })).toBe("text/markdown");
  expect(contentTypeFor("markdown", { name: "notes.txt", type: "text/plain" })).toBeNull();
  // A file picked under the wrong tile is refused, not relabelled.
  expect(contentTypeFor("image", { name: "clip.mp4", type: "video/mp4" })).toBeNull();
});

test("a file is refused for its type or its size, before any upload", () => {
  const mb = 1024 * 1024;
  expect(FILE_LIMITS.video.maxBytes).toBe(100 * mb);
  expect(FILE_LIMITS.image.maxBytes).toBe(20 * mb);
  expect(FILE_LIMITS.audio.maxBytes).toBe(25 * mb);
  expect(FILE_LIMITS.markdown.maxBytes).toBe(1 * mb);
  expect(fileIssue("video", { name: "a.mp4", type: "video/mp4", size: 100 * mb })).toBeNull();
  expect(fileIssue("video", { name: "a.mp4", type: "video/mp4", size: 100 * mb + 1 })).toBe("size");
  expect(fileIssue("video", { name: "a.mp4", type: "video/mp4", size: 0 })).toBe("empty");
  expect(fileIssue("image", { name: "a.svg", type: "image/svg+xml", size: 10 })).toBe("type");
});

test("an unreachable bucket fails the save within about a minute, not the SDK's ten", () => {
  // The SDK retries a network error (a refused CORS preflight, a dead connection) with
  // doubling sleeps until one exceeds the budget: 60 s → ~63 s; its default 10 min → ~17 min.
  expect(STORAGE_RETRY_MS.upload).toBe(60_000);
  expect(STORAGE_RETRY_MS.operation).toBe(30_000);
});

test("the grid shows what the source is, not how it is stored", () => {
  expect(sourceLabel({ kind: "repository", text: "acme/app" })).toBe("acme/app");
  expect(sourceLabel({ kind: "url", url: "https://www.example.com/blog/post/" })).toBe("example.com/blog/post");
  expect(sourceLabel({ kind: "video", uploadId: id, name: "launch.mp4" })).toBe("launch.mp4");
});

test("the picker speaks both of the prototype's languages", () => {
  for (const locale of ["en", "cs"]) {
    const copy = gitpulseCopy(locale).source;
    for (const kind of SOURCE_KINDS) expect(copy.kinds[kind].length).toBeGreaterThan(0);
    for (const kind of FILE_KINDS) expect(copy.choose[kind].length).toBeGreaterThan(0);
  }
  expect(gitpulseCopy("cs").source.kinds.audio).not.toBe(gitpulseCopy("en").source.kinds.audio);
});
