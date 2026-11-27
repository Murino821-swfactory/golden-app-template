/**
 * "Insert my brand" — what a visitor's own picture says about their brand, read in their
 * browser (the golden demo's "My brand" key, founder 2026-11-27). The demo's rule holds
 * (T-460): no request, no cost, nothing saved — so everything here is plain arithmetic on
 * pixels, and the only thing that needs a browser is drawing the candidate typefaces.
 *
 * Four readings, each of which lands on a mechanism the template already has:
 *   - the palette (background, ink, accent, a second accent) → `cssBlocksForBrand`, the same
 *     deterministic rule and the same WCAG AA gate as the thirty built-in palettes;
 *   - the side (dark or light) from the background's lightness;
 *   - the typeface and weight of the picture's headline, matched glyph by glyph against the
 *     ten faces the page already ships (no text recognition needed);
 *   - the key visual: the largest distinct, coloured object, cut out of a graphic or a
 *     screenshot; a photo is used whole.
 *
 * Pure except `matchFont`'s renderer, which the caller supplies (a canvas in the browser), so
 * the readings are testable on synthetic pixels.
 */

export interface Pixels {
  /** RGBA, row by row, as `ImageData.data`. */
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export type Box = [x0: number, y0: number, x1: number, y1: number];

// ── Colour arithmetic ────────────────────────────────────────────────────────────────────

const LINEAR = new Float32Array(256).map((_, c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
});

function labF(t: number): number {
  return t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
}

/** CIE Lab (D65) of an sRGB colour: L 0..100, a and b roughly -128..127. */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = LINEAR[r]!;
  const G = LINEAR[g]!;
  const B = LINEAR[b]!;
  const x = labF((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047);
  const y = labF(0.2126729 * R + 0.7151522 * G + 0.072175 * B);
  const z = labF((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function toHex(rgb: readonly number[]): string {
  return rgb
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function fromHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Per-channel median of the listed pixels (indices into `data` / 4), by histogram. */
function medianRgb(data: Uint8ClampedArray, pixels: ArrayLike<number>, count = pixels.length): [number, number, number] {
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  for (let k = 0; k < count; k++) {
    const i = pixels[k]! * 4;
    hist[0]![data[i]!]!++;
    hist[1]![data[i + 1]!]!++;
    hist[2]![data[i + 2]!]!++;
  }
  const half = count / 2;
  return hist.map((h) => {
    let seen = 0;
    for (let v = 0; v < 256; v++) {
      seen += h[v]!;
      if (seen >= half) return v;
    }
    return 255;
  }) as [number, number, number];
}

// ── The palette ──────────────────────────────────────────────────────────────────────────

export interface PaletteReading {
  /** Hex without `#`: background, ink, then the accents — what `theme.brand.colors` takes. */
  colors: string[];
  appearance: "dark" | "light";
  background: string;
  ink: string;
  accent?: string;
  accent2?: string;
  /** The background's share of the picture: low for a photo, high for a graphic or a page. */
  backgroundShare: number;
}

const K = 8;

/**
 * The background is the largest cluster by area; the ink, the neutral pixels at the far end of
 * lightness from it; the accent, the solid core of the most frequent strong hue (its text and
 * strokes, not the glow round them) and the second accent the next hue, or the same hue's
 * deeper shade. Order-free and deterministic: the same picture always gives the same colours.
 */
export function readPalette(px: Pixels): PaletteReading {
  const { data, width, height } = px;
  const step = Math.max(1, Math.ceil(Math.sqrt((width * height) / 60_000)));
  const idx: number[] = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const p = y * width + x;
      if (data[p * 4 + 3]! >= 128) idx.push(p);
    }
  }
  const n = idx.length;
  if (n === 0) throw new Error("The picture has no opaque pixels.");
  const L = new Float32Array(n);
  const A = new Float32Array(n);
  const B = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const i = idx[k]! * 4;
    const [l, a, b] = rgbToLab(data[i]!, data[i + 1]!, data[i + 2]!);
    L[k] = l;
    A[k] = a;
    B[k] = b;
  }
  const C = new Float32Array(n).map((_, k) => Math.hypot(A[k]!, B[k]!));
  const H = new Float32Array(n).map((_, k) => ((Math.atan2(B[k]!, A[k]!) * 180) / Math.PI + 360) % 360);

  // k-means in Lab, seeded at lightness quantiles so the result never depends on chance.
  const order = Array.from({ length: n }, (_, k) => k).sort((p, q) => L[p]! - L[q]!);
  const centres = Array.from({ length: K }, (_, c) => {
    const k = order[Math.min(n - 1, Math.floor(((c + 0.5) / K) * n))]!;
    return [L[k]!, A[k]!, B[k]!];
  });
  const label = new Uint8Array(n);
  for (let iter = 0; iter < 12; iter++) {
    const sum = Array.from({ length: K }, () => [0, 0, 0, 0]);
    for (let k = 0; k < n; k++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < K; c++) {
        const ce = centres[c]!;
        const d = (L[k]! - ce[0]!) ** 2 + (A[k]! - ce[1]!) ** 2 + (B[k]! - ce[2]!) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      label[k] = best;
      const s = sum[best]!;
      s[0]! += L[k]!;
      s[1]! += A[k]!;
      s[2]! += B[k]!;
      s[3]!++;
    }
    for (let c = 0; c < K; c++) {
      const s = sum[c]!;
      if (s[3]! > 0) centres[c] = [s[0]! / s[3]!, s[1]! / s[3]!, s[2]! / s[3]!];
    }
  }
  const counts = new Uint32Array(K);
  for (let k = 0; k < n; k++) counts[label[k]!]!++;
  let bgK = 0;
  for (let c = 1; c < K; c++) if (counts[c]! > counts[bgK]!) bgK = c;
  const bgMembers = idx.filter((_, k) => label[k] === bgK);
  const background = medianRgb(data, bgMembers);
  const bgLab = rgbToLab(...background);
  const dark = bgLab[0] < 50;
  // How much of the picture IS the background: a page or a graphic stands on one flat colour,
  // a photo does not. Measured directly, not as the cluster's size — k-means may split a dark
  // page into several near-black clusters.
  let flat = 0;
  for (let k = 0; k < n; k++) {
    if (Math.hypot(L[k]! - bgLab[0], A[k]! - bgLab[1], B[k]! - bgLab[2]) < 10) flat++;
  }

  const backgroundShare = flat / n;
  // A photo has no page colour of its own: its largest patch is sky or water, and a page painted
  // that colour reads as dirty. The page goes to the photo's side — dark or light by its overall
  // lightness — and keeps only a tint of that patch; the photo gives the accents.
  const photo = backgroundShare < 0.35;
  let pageRgb: readonly number[] = background;
  let pageDark = dark;
  if (photo) {
    let sumL = 0;
    for (let k = 0; k < n; k++) sumL += L[k]!;
    pageDark = sumL / n < 55;
    const target = pageDark ? 0 : 255;
    const t = pageDark ? 0.88 : 0.93;
    pageRgb = background.map((v) => v * (1 - t) + target * t);
  }

  const inkMembers = photo ? [] : idx.filter((_, k) => C[k]! < 12 && (dark ? L[k]! > 85 : L[k]! < 25));
  const ink = inkMembers.length > 50 ? medianRgb(data, inkMembers) : pageDark ? [245, 245, 244] : [20, 20, 20];

  // Strong hues, in twelve bins of 30 degrees; the two most frequent are the brand's accents.
  const accents: { core: string; deep?: string }[] = [];
  const strong: number[] = [];
  for (let k = 0; k < n; k++) if (C[k]! > 35) strong.push(k);
  if (strong.length > 50) {
    const bins = new Uint32Array(12);
    for (const k of strong) bins[Math.floor(H[k]! / 30) % 12]!++;
    const ranked = Array.from({ length: 12 }, (_, b) => b).sort((p, q) => bins[q]! - bins[p]!);
    for (const bin of ranked.slice(0, 2)) {
      if (bins[bin]! < 50 || bins[bin]! < 0.15 * bins[ranked[0]!]!) continue;
      const centre = bin * 30 + 15;
      const inHue = strong.filter((k) => Math.abs(((H[k]! - centre + 540) % 360) - 180) <= 30);
      let core = inHue.filter((k) => L[k]! > 45 && L[k]! < 80);
      if (core.length < 30) core = inHue;
      const chromas = core.map((k) => C[k]!).sort((p, q) => p - q);
      const threshold = chromas[Math.floor(0.8 * (chromas.length - 1))]!;
      const coreRgb = medianRgb(data, core.filter((k) => C[k]! >= threshold).map((k) => idx[k]!));
      const deep = inHue.filter((k) => L[k]! > 25 && L[k]! <= 50).map((k) => idx[k]!);
      accents.push({ core: toHex(coreRgb), deep: deep.length > 30 ? toHex(medianRgb(data, deep)) : undefined });
    }
  }

  // A muted photo may have no strong hue: its most colourful cluster stands in.
  if (photo && accents.length === 0) {
    let richest = -1;
    let richestC = 15;
    for (let c = 0; c < K; c++) {
      const chroma = Math.hypot(centres[c]![1]!, centres[c]![2]!);
      if (counts[c]! > 0.02 * n && chroma > richestC) {
        richestC = chroma;
        richest = c;
      }
    }
    if (richest >= 0) accents.push({ core: toHex(medianRgb(data, idx.filter((_, k) => label[k] === richest))) });
  }

  const colors = [toHex(pageRgb), toHex(ink)];
  const accent = accents[0]?.core;
  const accent2 = accents[1]?.core ?? accents[0]?.deep;
  if (accent) colors.push(accent);
  if (accent2) colors.push(accent2);
  return {
    colors,
    appearance: pageDark ? "dark" : "light",
    background: colors[0]!,
    ink: colors[1]!,
    accent,
    accent2,
    backgroundShare,
  };
}

// ── The headline's typeface ──────────────────────────────────────────────────────────────

/** Glyph masks are compared on this grid. */
export const GRID = 20;

export interface GlyphShape {
  /** Coverage on a GRID × GRID grid stretched over the glyph's box, 0..1. */
  mask: Float32Array;
  /** Width over height of the glyph's box. */
  aspect: number;
  /** Height relative to its line's tall letters (ascenders, capitals). */
  relH: number;
}

interface Component {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  area: number;
  label: number;
}

function find(parent: Int32Array, a: number): number {
  while (parent[a] !== a) {
    parent[a] = parent[parent[a]!]!;
    a = parent[a]!;
  }
  return a;
}

/** Coverage of a binary region, box-filtered onto the GRID. */
function toGrid(bits: Uint8Array, w: number, h: number): Float32Array {
  const out = new Float32Array(GRID * GRID);
  const counts = new Float32Array(GRID * GRID);
  for (let y = 0; y < h; y++) {
    const gy = Math.min(GRID - 1, Math.floor((y * GRID) / h));
    for (let x = 0; x < w; x++) {
      const gx = Math.min(GRID - 1, Math.floor((x * GRID) / w));
      out[gy * GRID + gx]! += bits[y * w + x]!;
      counts[gy * GRID + gx]!++;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = counts[i]! > 0 ? out[i]! / counts[i]! : 0;
  return out;
}

function percentile(values: number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]!;
}

/**
 * The glyphs of the picture's headline: everything far from the background colour, split into
 * connected shapes, grouped into lines of similar letters, and the line (with its twin, for a
 * headline set on two lines) that is big and long — a logo is big but short, body text long
 * but small. Null when the picture has no line of text to read.
 */
export function readHeadline(px: Pixels, background: string): GlyphShape[] | null {
  const { data, width: W, height: H } = px;
  const bg = rgbToLab(...fromHex(background));
  const ink = new Uint8Array(W * H);
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    if (data[i + 3]! < 128) continue;
    const [l, a, b] = rgbToLab(data[i]!, data[i + 1]!, data[i + 2]!);
    if (Math.hypot(l - bg[0], a - bg[1], b - bg[2]) > 40) ink[p] = 1;
  }

  // Connected shapes (8-neighbourhood), two passes with union-find.
  const labels = new Int32Array(W * H);
  const parent = new Int32Array(Math.floor((W * H) / 2) + 2);
  let next = 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!ink[p]) continue;
      const around = [
        x > 0 ? labels[p - 1]! : 0,
        y > 0 && x > 0 ? labels[p - W - 1]! : 0,
        y > 0 ? labels[p - W]! : 0,
        y > 0 && x < W - 1 ? labels[p - W + 1]! : 0,
      ].filter((l) => l > 0);
      if (around.length === 0) {
        if (next >= parent.length) return null; // pathological noise: no text to read
        parent[next] = next;
        labels[p] = next++;
      } else {
        const root = Math.min(...around.map((l) => find(parent, l)));
        labels[p] = root;
        for (const l of around) {
          const r = find(parent, l);
          if (r !== root) parent[r] = root;
        }
      }
    }
  }
  const stats = new Map<number, Component>();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!labels[p]) continue;
      const root = find(parent, labels[p]!);
      labels[p] = root;
      const c = stats.get(root);
      if (c) {
        if (x < c.x0) c.x0 = x;
        if (x > c.x1) c.x1 = x;
        if (y > c.y1) c.y1 = y;
        c.area++;
      } else stats.set(root, { x0: x, y0: y, x1: x, y1: y, area: 1, label: root });
    }
  }
  const comps = [...stats.values()].filter((c) => {
    const w = c.x1 - c.x0 + 1;
    const h = c.y1 - c.y0 + 1;
    const fill = c.area / (w * h);
    return h >= 10 && h <= 0.2 * H && w <= 3 * h && c.area >= 15 && fill >= 0.08 && fill <= 0.95;
  });
  if (comps.length < 5 || comps.length > 5000) return null;

  // Lines: shapes that overlap vertically and stand close side by side.
  const lineOf = new Int32Array(comps.length).map((_, i) => i);
  const root = (i: number): number => {
    while (lineOf[i] !== i) {
      lineOf[i] = lineOf[lineOf[i]!]!;
      i = lineOf[i]!;
    }
    return i;
  };
  for (let i = 0; i < comps.length; i++) {
    const a = comps[i]!;
    const ha = a.y1 - a.y0 + 1;
    for (let j = i + 1; j < comps.length; j++) {
      const b = comps[j]!;
      const hb = b.y1 - b.y0 + 1;
      if (Math.max(ha, hb) > 2.5 * Math.min(ha, hb)) continue;
      const overlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (overlap < 0.5 * Math.min(ha, hb)) continue;
      const gap = Math.max(b.x0 - a.x1, a.x0 - b.x1);
      if (gap > 0.9 * Math.max(ha, hb)) continue;
      lineOf[root(j)] = root(i);
    }
  }
  const lines = new Map<number, Component[]>();
  comps.forEach((c, i) => {
    const r = root(i);
    lines.set(r, [...(lines.get(r) ?? []), c]);
  });
  const ranked = [...lines.values()]
    .filter((members) => members.length >= 5)
    .map((members) => {
      const heights = members.map((c) => c.y1 - c.y0 + 1);
      const median = percentile(heights, 0.5);
      return {
        members,
        median,
        top: Math.min(...members.map((c) => c.y0)),
        bottom: Math.max(...members.map((c) => c.y1)),
        score: median * Math.min(members.length, 20),
      };
    })
    .sort((p, q) => q.score - p.score);
  const head = ranked[0];
  if (!head) return null;
  const chosen = [head];
  for (const other of ranked.slice(1)) {
    const ratio = other.median / head.median;
    const distance = Math.max(other.top - head.bottom, head.top - other.bottom);
    if (ratio > 0.75 && ratio < 1.33 && distance < 1.5 * head.median) {
      chosen.push(other);
      break;
    }
  }

  const glyphs: GlyphShape[] = [];
  for (const line of chosen) {
    const heights = line.members.map((c) => c.y1 - c.y0 + 1);
    const tall = percentile(heights, 0.9);
    const medianArea = percentile(
      line.members.map((c) => c.area),
      0.5
    );
    for (const c of line.members) {
      const w = c.x1 - c.x0 + 1;
      const h = c.y1 - c.y0 + 1;
      if (c.area < 0.25 * medianArea || w > 2.2 * tall) continue; // dots, stops, joined letters
      const bits = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) bits[y * w + x] = labels[(c.y0 + y) * W + c.x0 + x] === c.label ? 1 : 0;
      }
      glyphs.push({ mask: toGrid(bits, w, h), aspect: w / h, relH: h / tall });
    }
  }
  return glyphs.length >= 5 ? glyphs : null;
}

/** The shape of one glyph of a binary bitmap (a rendered character): its box, on the GRID. */
export function shapeOfBitmap(bits: Uint8Array, width: number, height: number): Omit<GlyphShape, "relH"> & { height: number } | null {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!bits[y * width + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const crop = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) crop[y * w + x] = bits[(y0 + y) * width + x0 + x]!;
  return { mask: toGrid(crop, w, h), aspect: w / h, height: h };
}

export interface FontCandidate {
  id: string;
  weights: readonly number[];
}

/** Draws one character of a face at a weight and returns its glyph shape. Browser: a canvas. */
export type GlyphRenderer = (fontId: string, weight: number, char: string) => (Omit<GlyphShape, "relH"> & { height: number }) | null;

export interface FontMatch {
  font: string;
  weight: number;
  /** Mean best match of the headline's glyphs, about 0..1. */
  score: number;
  runnerUp?: { font: string; weight: number; score: number };
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function similarity(g: GlyphShape, c: GlyphShape): number {
  let lo = 0;
  let hi = 0;
  for (let i = 0; i < g.mask.length; i++) {
    lo += Math.min(g.mask[i]!, c.mask[i]!);
    hi += Math.max(g.mask[i]!, c.mask[i]!);
  }
  const iou = hi > 0 ? lo / hi : 0;
  return iou - 0.3 * Math.abs(Math.log(g.aspect / c.aspect)) - 0.6 * Math.abs(g.relH - c.relH);
}

/**
 * Which of the page's faces, at which weight, the headline is set in: every glyph of the
 * headline finds its best-matching character in each face (no need to know what it says), and
 * the face whose characters match best wins. The worst fifth of the glyphs is dropped, so a
 * letter split or joined by the picture's own effects does not decide it.
 */
export function matchFont(glyphs: readonly GlyphShape[], candidates: readonly FontCandidate[], render: GlyphRenderer): FontMatch | null {
  const results: { font: string; weight: number; score: number }[] = [];
  for (const candidate of candidates) {
    for (const weight of candidate.weights) {
      const tall = render(candidate.id, weight, "d")?.height;
      if (!tall) continue;
      const alphabet: GlyphShape[] = [];
      for (const ch of ALPHABET) {
        const shape = render(candidate.id, weight, ch);
        if (shape) alphabet.push({ mask: shape.mask, aspect: shape.aspect, relH: shape.height / tall });
      }
      const best = glyphs
        .map((g) => Math.max(...alphabet.map((c) => similarity(g, c))))
        .sort((a, b) => b - a);
      const kept = best.slice(0, Math.max(1, Math.ceil(best.length * 0.8)));
      results.push({ font: candidate.id, weight, score: kept.reduce((s, v) => s + v, 0) / kept.length });
    }
  }
  results.sort((a, b) => b.score - a.score);
  const top = results[0];
  if (!top) return null;
  const runnerUp = results.find((r) => r.font !== top.font);
  return { ...top, runnerUp };
}

// ── The key visual ───────────────────────────────────────────────────────────────────────

/**
 * Where the picture's main object is: the densest region of pixels that are both far from the
 * background and coloured, after a wide blur, grown from its peak. A square box with a margin,
 * or null when nothing stands out (then the picture is used whole).
 */
export function keyVisualBox(px: Pixels, background: string): Box | null {
  const { data, width: W, height: H } = px;
  const cell = Math.max(1, Math.ceil(Math.max(W, H) / 240));
  const gw = Math.ceil(W / cell);
  const gh = Math.ceil(H / cell);
  const bg = rgbToLab(...fromHex(background));
  const raw = new Float32Array(gw * gh);
  const n = new Float32Array(gw * gh);
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4;
      if (data[i + 3]! < 128) continue;
      const [l, a, b] = rgbToLab(data[i]!, data[i + 1]!, data[i + 2]!);
      const far = Math.min(1, Math.max(0, (Math.hypot(l - bg[0], a - bg[1], b - bg[2]) - 25) / 60));
      const colour = Math.min(1, Math.max(0, (Math.hypot(a, b) - 15) / 50));
      const g = Math.floor(y / cell) * gw + Math.floor(x / cell);
      raw[g]! += far * (0.25 + 0.75 * colour);
      n[g]!++;
    }
  }
  // A key visual stands inside the page; light along an edge or in a corner is decoration.
  const margin = 0.08 * Math.min(gw, gh);
  const weighted = new Float32Array(gw * gh);
  for (let g = 0; g < raw.length; g++) {
    raw[g] = n[g]! > 0 ? raw[g]! / n[g]! : 0;
    const gx = g % gw;
    const gy = Math.floor(g / gw);
    const edge = Math.min(gx, gw - 1 - gx, gy, gh - 1 - gy);
    weighted[g] = raw[g]! * Math.min(1, Math.max(0.15, edge / margin));
  }
  const r = Math.max(2, Math.round(0.05 * Math.max(gw, gh)));
  let blurred: Float32Array = weighted;
  for (let pass = 0; pass < 3; pass++) blurred = boxBlur(blurred, gw, gh, r);
  let top = 0;
  for (let g = 0; g < blurred.length; g++) top = Math.max(top, blurred[g]!);
  if (top < 0.05) return null;

  // Every region above a third of the peak; the one with the most mass is the object.
  const region = new Int32Array(gw * gh).fill(-1);
  let best: number[] | null = null;
  let bestMass = 0;
  for (let start = 0; start < blurred.length; start++) {
    if (region[start] !== -1 || blurred[start]! < 0.35 * top) continue;
    const cells: number[] = [];
    const stack = [start];
    region[start] = start;
    let mass = 0;
    while (stack.length) {
      const g = stack.pop()!;
      cells.push(g);
      mass += blurred[g]!;
      const gx = g % gw;
      const gy = Math.floor(g / gw);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const ng = ny * gw + nx;
        if (region[ng] === -1 && blurred[ng]! >= 0.35 * top) {
          region[ng] = start;
          stack.push(ng);
        }
      }
    }
    if (mass > bestMass) {
      bestMass = mass;
      best = cells;
    }
  }
  if (!best || best.length < 0.015 * gw * gh) return null;

  // The extent holding 94 % of the object's own (unblurred) mass, so a trailing glow does not
  // stretch the box.
  const spread = (coord: (g: number) => number): [number, number] => {
    const items = best!.map((g) => [coord(g), raw[g]!] as const).sort((p, q) => p[0] - q[0]);
    const total = items.reduce((t, [, w]) => t + w, 0);
    let seen = 0;
    let lo = items[0]![0];
    let hi = items[items.length - 1]![0];
    let loSet = false;
    for (const [c, w] of items) {
      seen += w;
      if (!loSet && seen >= 0.03 * total) {
        lo = c;
        loSet = true;
      }
      if (seen >= 0.97 * total) {
        hi = c;
        break;
      }
    }
    return [lo, hi];
  };
  const [gx0, gx1] = spread((g) => g % gw);
  const [gy0, gy1] = spread((g) => Math.floor(g / gw));
  const bx0 = gx0 * cell;
  const by0 = gy0 * cell;
  const bx1 = Math.min(W, (gx1 + 1) * cell);
  const by1 = Math.min(H, (gy1 + 1) * cell);
  // Square, with a margin, inside the picture.
  const side = Math.min(Math.max(bx1 - bx0, by1 - by0) * 1.12, W, H);
  const cx = (bx0 + bx1) / 2;
  const cy = (by0 + by1) / 2;
  const left = Math.round(Math.min(Math.max(0, cx - side / 2), W - side));
  const upper = Math.round(Math.min(Math.max(0, cy - side / 2), H - side));
  return [left, upper, Math.round(left + side), Math.round(upper + side)];
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) {
        sum += src[y * w + k]!;
        count++;
      }
      tmp[y * w + x] = sum / count;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) {
        sum += tmp[k * w + x]!;
        count++;
      }
      out[y * w + x] = sum / count;
    }
  }
  return out;
}

/**
 * The object inside `box`, lifted off its background: on a dark page light is the object
 * (brightness is coverage, as a render on black), on a light page whatever differs from the
 * background is. The edge fades out so no crop line shows on any page colour.
 */
export function cutOut(px: Pixels, box: Box, background: string, dark: boolean): Pixels {
  const [x0, y0, x1, y1] = box;
  const w = x1 - x0;
  const h = y1 - y0;
  const out = new Uint8ClampedArray(w * h * 4);
  const bgRgb = fromHex(background);
  const bgMax = Math.max(...bgRgb) / 255;
  const bg = rgbToLab(...bgRgb);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * px.width + x0 + x) * 4;
      const o = (y * w + x) * 4;
      const r = px.data[i]!;
      const g = px.data[i + 1]!;
      const b = px.data[i + 2]!;
      let alpha: number;
      let rgb: [number, number, number] = [r, g, b];
      if (dark) {
        const a = Math.max(r, g, b) / 255;
        alpha = Math.min(1, Math.max(0, (a - bgMax - 0.02) / (1 - bgMax - 0.02)));
        if (alpha > 0.001) rgb = [r, g, b].map((v) => Math.min(255, v / Math.max(a, 0.001))) as [number, number, number];
      } else {
        const [l, la, lb] = rgbToLab(r, g, b);
        alpha = Math.min(1, Math.max(0, (Math.hypot(l - bg[0], la - bg[1], lb - bg[2]) - 6) / 30));
      }
      const dx = (x - w / 2) / (w / 2);
      const dy = (y - h / 2) / (h / 2);
      const edge = Math.min(1, Math.max(0, (1 - Math.hypot(dx, dy * 1.05)) / 0.22));
      alpha *= edge * edge * (3 - 2 * edge);
      out[o] = rgb[0];
      out[o + 1] = rgb[1];
      out[o + 2] = rgb[2];
      out[o + 3] = Math.round(alpha * 255);
    }
  }
  return { data: out, width: w, height: h };
}

/** True when a picture is mostly see-through — a logo cut out of its background. */
export function isTransparent(px: Pixels): boolean {
  let clear = 0;
  let total = 0;
  for (let i = 3; i < px.data.length; i += 16) {
    total++;
    if (px.data[i]! < 16) clear++;
  }
  return total > 0 && clear / total > 0.1;
}
