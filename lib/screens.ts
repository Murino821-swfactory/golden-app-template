/**
 * The prototype's own screens (PR D, 2026-10-26): pictures of its pages the pipeline takes
 * after publishing and stores beside the export as `<slug>/_preview/screens/*.webp` with a
 * `_preview/screens.json` index (sw-factory PR B). The export is immutable — its SHA is
 * checked before and after the browser gate — so the pictures can never be part of it; the
 * page fetches the index at runtime instead.
 *
 * `public/_preview/screens.json` ships as `{"screens":[]}` so the harness sandbox, this
 * repo's CI and local dev get a 200 and the smoke gate's "no console errors" holds. A
 * republish re-uploads that static file and the pipeline overwrites it with the real index.
 * Any failure — network, 404, broken JSON — is "no screens": the strip keeps the product's
 * words, and nothing louder than `warn` reaches the console.
 */

export interface Screen {
  /** Same-origin path, base path included. */
  src: string;
  alt: string;
}

/** A same-origin path, never a URL somewhere else: the index is data, not instructions. */
function isSafeSrc(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

export function parseScreens(body: unknown): Screen[] {
  if (typeof body !== "object" || body === null) return [];
  const list = (body as { screens?: unknown }).screens;
  if (!Array.isArray(list)) return [];
  const screens: Screen[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const { src, alt } = item as { src?: unknown; alt?: unknown };
    if (!isSafeSrc(src)) continue;
    screens.push({ src, alt: typeof alt === "string" ? alt : "" });
  }
  return screens;
}

export async function fetchScreens(basePath: string): Promise<Screen[]> {
  try {
    const res = await fetch(`${basePath}/_preview/screens.json`, { cache: "no-cache" });
    if (!res.ok) return [];
    return parseScreens(await res.json());
  } catch (err) {
    console.warn("[screens] index unavailable:", err);
    return [];
  }
}
