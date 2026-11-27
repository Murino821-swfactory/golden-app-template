import { test, expect } from "@playwright/test";
import { cutOut, isTransparent, keyVisualBox, readPalette, rgbToLab, type Pixels } from "../lib/brand-extract";

/**
 * "My brand" (founder, 2026-11-27): the readings behind the golden demo's key, on synthetic
 * pictures whose answer is known — a dark page with an orange object, a light page with a green
 * one, a photo with no page colour, a logo cut out of its background. The typeface is read with
 * the page's own fonts, so it is checked in the browser (brand-try.spec.ts).
 */

function blank(width: number, height: number, hex: string, alpha = 255): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r!;
    data[i + 1] = g!;
    data[i + 2] = b!;
    data[i + 3] = alpha;
  }
  return { data, width, height };
}

function paint(px: Pixels, hex: string, inside: (x: number, y: number) => boolean): void {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let y = 0; y < px.height; y++) {
    for (let x = 0; x < px.width; x++) {
      if (!inside(x, y)) continue;
      const i = (y * px.width + x) * 4;
      px.data[i] = r!;
      px.data[i + 1] = g!;
      px.data[i + 2] = b!;
      px.data[i + 3] = 255;
    }
  }
}

/** A page: its colour, three lines of "text" bars in the ink, and a round object in the accent. */
function page(background: string, ink: string, accent: string): Pixels {
  const px = blank(400, 600, background);
  for (const [top, width] of [[60, 300], [100, 240], [150, 280]] as const) {
    paint(px, ink, (x, y) => y >= top && y < top + 18 && x >= 50 && x < 50 + width && x % 14 < 10);
  }
  paint(px, accent, (x, y) => (x - 200) ** 2 + (y - 400) ** 2 < 90 ** 2);
  return px;
}

function close(hex: string, expected: string, tolerance = 6): boolean {
  return [0, 2, 4].every((i) => Math.abs(parseInt(hex.slice(i, i + 2), 16) - parseInt(expected.slice(i, i + 2), 16)) <= tolerance);
}

test.describe("\"My brand\" — reading a picture", () => {
  test("a dark page gives its own background, light ink and its orange accent", () => {
    const reading = readPalette(page("0B0705", "F6F5F3", "F85807"));
    expect(reading.appearance).toBe("dark");
    expect(close(reading.background, "0B0705")).toBe(true);
    expect(close(reading.ink, "F6F5F3")).toBe(true);
    expect(close(reading.accent ?? "", "F85807")).toBe(true);
    expect(reading.backgroundShare).toBeGreaterThan(0.35);
    expect(reading.colors.slice(0, 3)).toEqual([reading.background, reading.ink, reading.accent]);
  });

  test("a light page gives the light side and its green accent", () => {
    const reading = readPalette(page("FBF8F1", "1B2A41", "2E9E5B"));
    expect(reading.appearance).toBe("light");
    expect(close(reading.background, "FBF8F1")).toBe(true);
    expect(close(reading.accent ?? "", "2E9E5B")).toBe(true);
  });

  test("a photo has no page colour: the page goes clean to one side and keeps only a tint", () => {
    const px = blank(300, 300, "000000");
    for (let y = 0; y < 300; y++) {
      for (let x = 0; x < 300; x++) {
        const i = (y * 300 + x) * 4;
        // a sky-to-water gradient with grain, like a landscape
        px.data[i] = 120 + Math.round(80 * (y / 300)) + ((x * 7 + y * 13) % 23);
        px.data[i + 1] = 150 + Math.round(40 * Math.sin(x / 30)) + ((x * 11) % 17);
        px.data[i + 2] = 190 - Math.round(90 * (y / 300)) + ((y * 5) % 19);
      }
    }
    const reading = readPalette(px);
    expect(reading.backgroundShare).toBeLessThan(0.35);
    const lightness = rgbToLab(
      parseInt(reading.background.slice(0, 2), 16),
      parseInt(reading.background.slice(2, 4), 16),
      parseInt(reading.background.slice(4, 6), 16)
    )[0];
    expect(lightness > 90 || lightness < 12).toBe(true);
  });

  test("the key visual is the object, not the text and not a glow in the corner", () => {
    const px = page("0B0705", "F6F5F3", "F85807");
    // decoration: a bright orange glow in the top right corner
    paint(px, "FF7A1A", (x, y) => (x - 400) ** 2 + y ** 2 < 40 ** 2);
    const box = keyVisualBox(px, readPalette(px).background);
    expect(box).not.toBeNull();
    const [x0, y0, x1, y1] = box!;
    expect(x0).toBeLessThan(200 - 60);
    expect(x1).toBeGreaterThan(200 + 60);
    expect(y0).toBeLessThan(400 - 60);
    expect(y1).toBeGreaterThan(400 + 60);
    expect(x1 - x0).toBe(y1 - y0); // square, as the hero's object takes it
  });

  test("a cut-out has the box's size and fades out at its edge", () => {
    const px = page("0B0705", "F6F5F3", "F85807");
    const out = cutOut(px, [100, 300, 300, 500], "0B0705", true);
    expect([out.width, out.height]).toEqual([200, 200]);
    expect(out.data[3]).toBe(0); // top-left corner
    const centre = (100 * 200 + 100) * 4;
    expect(out.data[centre + 3]).toBeGreaterThan(200); // the object itself stays
  });

  test("a logo cut out of its background is told apart from a picture", () => {
    const logo = blank(200, 80, "000000", 0);
    paint(logo, "F85807", (x, y) => x > 20 && x < 180 && y > 20 && y < 60);
    expect(isTransparent(logo)).toBe(true);
    expect(isTransparent(page("0B0705", "F6F5F3", "F85807"))).toBe(false);
  });
});
