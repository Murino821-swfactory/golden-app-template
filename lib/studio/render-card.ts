/**
 * render-card.ts — the visual that goes out with a post: a branded card drawn on a canvas
 * in the size the network wants (`FORMAT_SIZES`). No image library, no server — the
 * browser renders a PNG in a few milliseconds, which is what lets the publish buttons act
 * inside the click that pressed them.
 *
 * `drawCard` is a pure function of a 2D context, so the game's score card, the projects
 * card and the history card are all the same drawing with different words.
 */
import { FORMAT_SIZES, type AssetFormat } from "./channels";

export interface CardSpec {
  eyebrow: string;
  title: string;
  stats: { label: string; value: string }[];
  lines: string[];
  /** Bottom-left: the site. */
  footer: string;
  /** Bottom-left, muted: the profile. */
  handle: string;
}

export interface CardTheme {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  accent: string;
  task: string;
  defect: string;
}

/** tokenwise.sk's own dark palette; the accent follows the prototype's colour scheme. */
export const DEFAULT_CARD_THEME: CardTheme = {
  bg: "#0b0f0e",
  panel: "#141b19",
  ink: "#f0e8dc",
  muted: "#8a948f",
  accent: "#dcf979",
  task: "#f0e8dc",
  defect: "#ff6b6b",
};

const FONT = '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif';

/**
 * The accent the page is wearing: `--primary` from the root, when the canvas can paint it
 * (oklch needs a 2023 browser), else the default. A card should match the prototype's
 * palette, not fight it.
 */
export function cardTheme(root: HTMLElement | null = typeof document === "undefined" ? null : document.documentElement): CardTheme {
  if (!root) return DEFAULT_CARD_THEME;
  const raw = getComputedStyle(root).getPropertyValue("--primary").trim();
  if (!raw) return DEFAULT_CARD_THEME;
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return DEFAULT_CARD_THEME;
  probe.fillStyle = "#000000";
  probe.fillStyle = raw;
  // An unparseable colour leaves the previous value in place.
  const accepted = probe.fillStyle !== "#000000";
  return accepted ? { ...DEFAULT_CARD_THEME, accent: raw } : DEFAULT_CARD_THEME;
}

/** Greedy word wrap; the last allowed line gets an ellipsis if text remains. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && (words.join(" ") !== lines.join(" "))) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A small cube, the game's motif: a square with a lighter top face. */
function cube(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(-0.25);
  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-size / 2, -size / 2, size, size * 0.28);
  ctx.restore();
}

export function drawCard(ctx: CanvasRenderingContext2D, spec: CardSpec, width: number, height: number, theme: CardTheme = DEFAULT_CARD_THEME): void {
  const portrait = height > width * 1.2;
  const unit = Math.min(width, height);
  const pad = Math.round(unit * 0.075);
  const bar = Math.round(width * 0.012);
  const textX = pad + bar + Math.round(pad * 0.5);
  const textW = width - textX - pad;

  // Ground and a faint grid.
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  const grid = Math.round(unit / 18);
  for (let x = grid; x < width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = grid; y < height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  // Cubes falling in the top-right corner — the game, as a brand mark.
  const cubes: [number, number, number, boolean][] = [
    [0.86, 0.12, 0.05, false],
    [0.93, 0.22, 0.034, true],
    [0.8, 0.26, 0.028, false],
    [0.9, 0.36, 0.04, false],
  ];
  for (const [cx, cy, cs, defect] of cubes) {
    cube(ctx, width * cx, height * (portrait ? cy * 0.6 : cy), unit * cs, defect ? theme.defect : theme.task, defect ? 0.9 : 0.55);
  }

  // Accent bar.
  ctx.fillStyle = theme.accent;
  ctx.fillRect(pad, pad, bar, height - pad * 2);

  // Eyebrow.
  let y = pad + Math.round(unit * 0.02);
  const eyebrowSize = Math.round(unit * 0.03);
  ctx.font = `600 ${eyebrowSize}px ${FONT}`;
  ctx.fillStyle = theme.accent;
  ctx.textBaseline = "top";
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Math.round(eyebrowSize * 0.18)}px`;
  ctx.fillText(spec.eyebrow.toUpperCase(), textX, y);
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  y += Math.round(eyebrowSize * 2.2);

  // Title.
  const titleSize = Math.round(portrait ? width * 0.085 : width * 0.062);
  ctx.font = `800 ${titleSize}px ${FONT}`;
  ctx.fillStyle = theme.ink;
  const titleLines = wrapText(ctx, spec.title, textW - (portrait ? 0 : width * 0.18), portrait ? 4 : 3);
  for (const line of titleLines) {
    ctx.fillText(line, textX, y);
    y += Math.round(titleSize * 1.1);
  }
  y += Math.round(unit * 0.04);

  // Stats: a row (or a 2×2 grid in portrait).
  const stats = spec.stats.slice(0, 4);
  if (stats.length) {
    const cols = portrait ? 2 : stats.length;
    const gap = Math.round(unit * 0.02);
    const boxW = Math.floor((textW - gap * (cols - 1)) / cols);
    const valueSize = Math.round(unit * (portrait ? 0.075 : 0.07));
    const labelSize = Math.round(unit * 0.026);
    const boxH = Math.round(valueSize * 1.2 + labelSize * 2.6);
    stats.forEach((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = textX + col * (boxW + gap);
      const by = y + row * (boxH + gap);
      ctx.fillStyle = theme.panel;
      roundRect(ctx, bx, by, boxW, boxH, Math.round(unit * 0.012));
      ctx.fill();
      ctx.font = `800 ${valueSize}px ${FONT}`;
      ctx.fillStyle = theme.accent;
      let value = s.value;
      while (value.length > 1 && ctx.measureText(value).width > boxW - gap * 2) value = value.slice(0, -1);
      ctx.fillText(value, bx + gap, by + Math.round(labelSize * 0.6));
      ctx.font = `500 ${labelSize}px ${FONT}`;
      ctx.fillStyle = theme.muted;
      const [label] = wrapText(ctx, s.label, boxW - gap * 2, 1);
      ctx.fillText(label ?? "", bx + gap, by + Math.round(valueSize * 1.2 + labelSize * 0.8));
    });
    y += Math.ceil(stats.length / cols) * (boxH + gap) + Math.round(unit * 0.03);
  }

  // Lines.
  const lineSize = Math.round(unit * (portrait ? 0.03 : 0.03));
  const footerTop = height - pad - Math.round(unit * 0.07);
  ctx.font = `500 ${lineSize}px ${FONT}`;
  const maxLines = portrait ? 8 : 5;
  for (const line of spec.lines.slice(0, maxLines)) {
    if (y + lineSize * 1.5 > footerTop) break;
    ctx.fillStyle = theme.accent;
    ctx.fillText("▸", textX, y);
    ctx.fillStyle = theme.ink;
    const wrapped = wrapText(ctx, line, textW - lineSize * 1.4, 2);
    for (const w of wrapped) {
      if (y + lineSize * 1.5 > footerTop) break;
      ctx.fillText(w, textX + Math.round(lineSize * 1.3), y);
      y += Math.round(lineSize * 1.5);
    }
    y += Math.round(lineSize * 0.35);
  }

  // Footer.
  const footSize = Math.round(unit * 0.034);
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${footSize}px ${FONT}`;
  ctx.fillStyle = theme.ink;
  ctx.fillText(spec.footer, textX, height - pad);
  const footW = ctx.measureText(spec.footer).width;
  ctx.font = `500 ${Math.round(footSize * 0.8)}px ${FONT}`;
  ctx.fillStyle = theme.muted;
  ctx.fillText(spec.handle, textX + footW + Math.round(footSize * 0.5), height - pad);
  ctx.textAlign = "right";
  ctx.fillText("GitPulse Studio", width - pad, height - pad);
  ctx.textAlign = "left";
}

/** The card as a PNG in the channel's size. Waits for the page's fonts first. */
export async function renderCard(spec: CardSpec, format: AssetFormat, theme: CardTheme = DEFAULT_CARD_THEME): Promise<Blob> {
  const { width, height } = FORMAT_SIZES[format];
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {
      /* fonts are a nicety; the card draws with the fallback */
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  drawCard(ctx, spec, width, height, theme);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))), "image/png");
  });
}
