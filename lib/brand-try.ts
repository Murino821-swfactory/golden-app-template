"use client";
/**
 * The golden demo's "My brand" key (founder, 2026-11-27): the visitor drops their own picture
 * — a screenshot of their website, a brand board, a photo — and, if they have one, their logo
 * on a transparent background; the page takes on their brand at once. The demo's rule holds
 * (T-460): it all happens in this browser — no request, no cost, nothing saved. A reload brings
 * the demo back.
 *
 * What lands where: the palette → `cssBlocksForBrand` as the `brand` scheme (the thirty
 * palettes' own rule and AA gate); the side → `html[data-appearance]`; the headline's face →
 * `html[data-font]` and its weight → `--brand-display-weight`; the emphasis in the accent; the
 * action's look → `html[data-button]`; the key visual and the logo → the hero, through
 * `useBrandTry`. The header's own switches keep working on top of it.
 */
import { useSyncExternalStore } from "react";
import { FONT_FAMILIES, cssBlocksForBrand } from "@tokenwise/shared-ui";
import {
  cutOut,
  isTransparent,
  keyVisualBox,
  matchFont,
  readHeadline,
  readPalette,
  shapeOfBitmap,
  type FontCandidate,
  type FontMatch,
  type PaletteReading,
  type Pixels,
} from "@/lib/brand-extract";

export interface BrandTry {
  colors: string[];
  appearance: "dark" | "light";
  font: { id: string; name: string; weight: number } | null;
  image: { url: string; frameless: boolean } | null;
  logo: { url: string } | null;
}

// ── The store the hero reads (outside React: the DOM changes with it) ───────────────────

let current: BrandTry | null = null;
const listeners = new Set<() => void>();

export const brandTry = {
  get: (): BrandTry | null => current,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

function publish(next: BrandTry): void {
  if (current) {
    // The previous try's pictures are no longer shown anywhere: free them.
    for (const url of [current.image?.url, current.logo?.url]) {
      if (url && url !== next.image?.url && url !== next.logo?.url) URL.revokeObjectURL(url);
    }
  }
  current = next;
  for (const listener of listeners) listener();
}

/** The brand the visitor dropped on this page, or null. */
export function useBrandTry(): BrandTry | null {
  return useSyncExternalStore(brandTry.subscribe, brandTry.get, () => null);
}

// ── Reading the files ────────────────────────────────────────────────────────────────────

/** Accepted pictures, and the largest a visitor may drop. */
export const BRAND_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
const MAX_BYTES = 15 * 1024 * 1024;
/** Pictures are read at this size at most: enough for a headline's letters, quick to scan. */
const READ_EDGE = 1400;

async function loadImage(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return { image, url };
}

function pixelsOf(image: HTMLImageElement): Pixels {
  const width0 = image.naturalWidth || 800;
  const height0 = image.naturalHeight || 800;
  const scale = Math.min(1, READ_EDGE / Math.max(width0, height0));
  const width = Math.max(1, Math.round(width0 * scale));
  const height = Math.max(1, Math.round(height0 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, width, height);
  return { data: context.getImageData(0, 0, width, height).data, width, height };
}

async function urlOfPixels(px: Pixels): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = px.width;
  canvas.height = px.height;
  canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(px.data), px.width, px.height), 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The cut-out could not be drawn.");
  return URL.createObjectURL(blob);
}

/** The page's ten faces, at the weights each one has. */
function candidates(): FontCandidate[] {
  return FONT_FAMILIES.map((family) => ({
    id: family.id,
    weights: Array.isArray(family.weights)
      ? (family.weights as readonly number[])
      : [300, 400, 500, 600, 700].filter((w) => {
          const range = family.weights as { min: number; max: number };
          return w >= range.min && w <= range.max;
        }),
  }));
}

async function readFont(px: Pixels, palette: PaletteReading): Promise<FontMatch | null> {
  const glyphs = readHeadline(px, palette.background);
  if (!glyphs) return null;
  const list = candidates();
  const names = new Map<string, string>(FONT_FAMILIES.map((family) => [family.id, family.name]));
  await Promise.all(
    list.flatMap((c) => c.weights.map((w) => document.fonts.load(`${w} 100px "${names.get(c.id)}"`).catch(() => [])))
  );
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  const match = matchFont(glyphs, list, (id, weight, char) => {
    context.clearRect(0, 0, size, size);
    context.font = `${weight} 100px "${names.get(id)}"`;
    context.fillStyle = "#fff";
    context.fillText(char, 30, 120);
    const data = context.getImageData(0, 0, size, size).data;
    const bits = new Uint8Array(size * size);
    for (let i = 0; i < bits.length; i++) bits[i] = data[i * 4 + 3]! > 127 ? 1 : 0;
    return shapeOfBitmap(bits, size, size);
  });
  // Below this the headline did not look like any of the ten: keep the page's face.
  return match && match.score >= 0.6 ? match : null;
}

/** The palette as CSS, dropping the second accent and then the first if the brand would not
 * pass the AA gate — a demo never shows a page it would refuse to ship. */
function brandCss(colors: string[]): { css: string; colors: string[] } {
  for (let keep = colors.length; keep >= 2; keep--) {
    try {
      const used = colors.slice(0, keep);
      return { css: cssBlocksForBrand(used), colors: used };
    } catch {
      // try with fewer accents
    }
  }
  throw new Error("This picture's colours cannot be made readable.");
}

/**
 * Reads the dropped files and puts the brand on the page. One picture and/or one logo (a file
 * that is mostly transparent). Rejects with an Error for a file it cannot use.
 */
export async function insertBrand(files: readonly File[]): Promise<BrandTry> {
  const usable = files.filter((f) => BRAND_ACCEPT.split(",").includes(f.type) && f.size <= MAX_BYTES).slice(0, 2);
  if (usable.length === 0) throw new Error("No usable picture.");

  const loaded = await Promise.all(usable.map(loadImage));
  const read = loaded.map(({ image, url }, i) => {
    const px = pixelsOf(image);
    const svg = usable[i]!.type === "image/svg+xml";
    return { px, url, logo: svg || isTransparent(px) };
  });
  const picture = read.find((r) => !r.logo) ?? null;
  const logo = read.find((r) => r.logo) ?? null;
  for (const r of read) if (r !== picture && r !== logo) URL.revokeObjectURL(r.url);

  let palette: PaletteReading;
  if (picture) {
    palette = readPalette(picture.px);
  } else {
    // A logo alone: its colours are the accents; the page goes to whichever side it reads on.
    const fromLogo = readPalette(logo!.px);
    const light = isLightMark(logo!.px);
    const accents = [fromLogo.accent, fromLogo.accent2].filter(Boolean) as string[];
    palette = light
      ? { ...fromLogo, appearance: "dark", background: "0B0B0C", ink: "F5F5F5", colors: ["0B0B0C", "F5F5F5", ...accents] }
      : { ...fromLogo, appearance: "light", background: "FAFAF9", ink: "111111", colors: ["FAFAF9", "111111", ...accents] };
  }
  const { css, colors } = brandCss(palette.colors);

  const font = picture ? await readFont(picture.px, palette) : null;

  let image: BrandTry["image"] = null;
  if (picture) {
    // A page or a graphic stands on one flat colour: its key visual is cut out. A photo is shown whole.
    const box = palette.backgroundShare >= 0.35 ? keyVisualBox(picture.px, palette.background) : null;
    if (box) {
      image = { url: await urlOfPixels(cutOut(picture.px, box, palette.background, palette.appearance === "dark")), frameless: true };
      URL.revokeObjectURL(picture.url);
    } else {
      image = { url: picture.url, frameless: false };
    }
  }

  apply(css, palette, font, colors.length > 2);
  const names = new Map<string, string>(FONT_FAMILIES.map((family) => [family.id, family.name]));
  const next: BrandTry = {
    colors,
    appearance: palette.appearance,
    font: font ? { id: font.font, name: names.get(font.font) ?? font.font, weight: font.weight } : null,
    image,
    logo: logo ? { url: logo.url } : null,
  };
  publish(next);
  return next;
}

/** A logo drawn mostly in light ink needs a dark page under it. */
function isLightMark(px: Pixels): boolean {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < px.data.length; i += 4) {
    if (px.data[i + 3]! < 128) continue;
    sum += 0.2126 * px.data[i]! + 0.7152 * px.data[i + 1]! + 0.0722 * px.data[i + 2]!;
    count++;
  }
  return count > 0 && sum / count > 170;
}

/** Writes the brand onto the document, exactly where the header's switches write — but keeps it
 * out of localStorage: the demo saves nothing, and a stored `brand` scheme would point at CSS
 * that is gone after a reload. The switches' events still fire, so their icons follow. */
function apply(css: string, palette: PaletteReading, font: FontMatch | null, accented: boolean): void {
  const html = document.documentElement;
  let style = document.getElementById("brand-try-css");
  if (!style) {
    style = document.createElement("style");
    style.id = "brand-try-css";
    document.head.appendChild(style);
  }
  style.textContent = css;
  html.dataset.scheme = "brand";
  html.dataset.appearance = palette.appearance;
  html.classList.toggle("dark", palette.appearance === "dark");
  html.dataset.button = palette.appearance === "dark" ? "orbit" : "glow";
  if (font) {
    html.dataset.font = font.font;
    html.dataset.brandDisplay = "";
    html.style.setProperty("--brand-display-weight", String(font.weight));
  }
  if (accented) html.dataset.brandEmphasis = "accent";
  for (const event of ["scheme-change", "appearance-change", "button-change", "font-change"]) {
    window.dispatchEvent(new Event(event));
  }
}
