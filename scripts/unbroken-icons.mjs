/**
 * unbroken-icons.mjs — draws the home-screen icons for the unbroken prototype into
 * public/icons/ with nothing but Node (no sharp, no ImageMagick on the build hosts).
 *
 *   node scripts/unbroken-icons.mjs
 *
 * The mark: a ring (the streak) with one gap (the missed day) and a dot sitting in that gap
 * (the shield that covers it) — "one missed day won't break you". Honey on jet black, the
 * prototype's palette. Committed outputs; rerun only when the mark changes.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const INK = [0x17, 0x17, 0x17];
const HONEY = [0xe3, 0xc5, 0x86];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** RGBA pixels → PNG bytes. */
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Coverage (0–1) of the mark at a point in unit space (0,0)–(1,1), evaluated with 4×4
 * supersampling by the caller. `scale` shrinks the mark towards the centre (maskable icons
 * keep their mark inside the inner 80 %).
 */
function mark(u, v, scale) {
  const x = (u - 0.5) / scale;
  const y = (v - 0.5) / scale;
  const r = Math.hypot(x, y);
  const RING = 0.33;
  const THICK = 0.1;
  // The gap sits top-right, 44° wide; the shield dot fills its middle.
  const angle = ((Math.atan2(-y, x) * 180) / Math.PI + 360) % 360;
  const GAP_CENTER = 45;
  const GAP_HALF = 22;
  const inGap = Math.abs(((angle - GAP_CENTER + 540) % 360) - 180) < GAP_HALF;
  const onRing = Math.abs(r - RING) <= THICK / 2 && !inGap;
  const dotX = RING * Math.cos((GAP_CENTER * Math.PI) / 180);
  const dotY = -RING * Math.sin((GAP_CENTER * Math.PI) / 180);
  const onDot = Math.hypot(x - dotX, y - dotY) <= 0.072;
  return onRing || onDot ? 1 : 0;
}

function inRoundedSquare(u, v, radius) {
  const x = Math.abs(u - 0.5);
  const y = Math.abs(v - 0.5);
  const inner = 0.5 - radius;
  if (x <= inner || y <= inner) return x <= 0.5 && y <= 0.5;
  return Math.hypot(x - inner, y - inner) <= radius;
}

function render(size, { corner, scale, transparentCorners }) {
  const out = Buffer.alloc(size * size * 4);
  const SS = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bg = 0;
      let fg = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (px + (sx + 0.5) / SS) / size;
          const v = (py + (sy + 0.5) / SS) / size;
          const inside = transparentCorners ? inRoundedSquare(u, v, corner) : true;
          if (!inside) continue;
          bg++;
          fg += mark(u, v, scale);
        }
      }
      const alpha = bg / (SS * SS);
      const t = bg ? fg / bg : 0;
      const i = (py * size + px) * 4;
      out[i] = Math.round(INK[0] + (HONEY[0] - INK[0]) * t);
      out[i + 1] = Math.round(INK[1] + (HONEY[1] - INK[1]) * t);
      out[i + 2] = Math.round(INK[2] + (HONEY[2] - INK[2]) * t);
      out[i + 3] = Math.round(alpha * 255);
    }
  }
  return png(size, size, out);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", render(192, { corner: 0.2, scale: 1, transparentCorners: true }));
writeFileSync("public/icons/icon-512.png", render(512, { corner: 0.2, scale: 1, transparentCorners: true }));
writeFileSync("public/icons/icon-maskable-512.png", render(512, { corner: 0, scale: 0.72, transparentCorners: false }));
writeFileSync("public/icons/apple-touch-icon.png", render(180, { corner: 0, scale: 1, transparentCorners: false }));
console.log("icons written to public/icons/");
