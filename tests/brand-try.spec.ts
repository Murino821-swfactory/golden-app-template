import { test, expect, type Page } from "@playwright/test";
import { config, landingPresentation } from "../lib/prototype-config";
import { uiCopy } from "./ui-copy";

/**
 * "My brand" on the golden demo's control pad (founder, 2026-11-27: the prototype must take a
 * customer's brand from one picture — its palette, typeface, button and image). The visitor drops
 * a picture; the page takes on that brand at once, in this browser only, as every try-it key does
 * (T-460): nothing is sent and nothing is stored.
 *
 * The pictures are drawn in the page with the page's own faces, so the answer is known: a light
 * bakery board set in Outfit Bold, and a dark software page set in Inter SemiBold.
 */

const sections: readonly string[] = config.patterns.landing?.sections ?? [];
const TRY = config.patterns.landing?.tryIt === true && landingPresentation(config) === "editorial" && sections.includes("hero");
const KEY = "[data-try-pad] button[data-try='brand']";
const INPUT = "[data-try-pad] input[data-try-brand-input]";
const HINT = "[data-try-pad] [data-try-hint]";

interface Board {
  background: string;
  ink: string;
  accent: string;
  family: string;
  weight: number;
}

/** Draws a brand board in the page and drops it on the "My brand" input, as a picked file. */
async function dropBoard(page: Page, board: Board) {
  await page.evaluate(
    async ({ board, input }) => {
      await document.fonts.load(`${board.weight} 92px "${board.family}"`);
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = 1400;
      const c = canvas.getContext("2d")!;
      c.fillStyle = `#${board.background}`;
      c.fillRect(0, 0, 900, 1400);
      c.font = `${board.weight} 92px "${board.family}"`;
      c.fillStyle = `#${board.ink}`;
      c.fillText("Fresh bread made", 70, 300);
      c.fillStyle = `#${board.accent}`;
      c.fillText("every morning.", 70, 400);
      c.font = `400 30px "${board.family}"`;
      c.fillStyle = `#${board.ink}`;
      c.fillText("Sourdough, rolls and pastries baked before sunrise.", 70, 490);
      c.fillStyle = `#${board.accent}`;
      c.beginPath();
      c.arc(450, 980, 230, 0, Math.PI * 2);
      c.fill();
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], "brand.png", { type: "image/png" }));
      const field = document.querySelector<HTMLInputElement>(input)!;
      field.files = transfer.files;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { board, input: INPUT }
  );
}

test.describe("\"My brand\" — the visitor's picture on the golden demo", () => {
  test.skip(!TRY, "no try-it control pad in this config");

  const cases: { name: string; board: Board; font: string; appearance: string; button: string }[] = [
    {
      name: "a light board in Outfit Bold",
      board: { background: "FBF8F1", ink: "1B2A41", accent: "2E9E5B", family: "Outfit", weight: 700 },
      font: "outfit",
      appearance: "light",
      button: "glow",
    },
    {
      name: "a dark page in Inter SemiBold",
      board: { background: "0B0705", ink: "F6F5F3", accent: "F85807", family: "Inter", weight: 600 },
      font: "inter",
      appearance: "dark",
      button: "orbit",
    },
  ];

  for (const c of cases) {
    test(`${c.name} becomes the page's brand, in this browser only`, async ({ page }) => {
      await page.goto("./");
      await expect(page.locator(KEY)).toBeVisible();
      await dropBoard(page, c.board);
      await expect(page.locator(HINT)).toHaveText(uiCopy.landing.tryBrandHint!, { timeout: 30_000 });

      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-scheme", "brand");
      await expect(html).toHaveAttribute("data-appearance", c.appearance);
      await expect(html).toHaveAttribute("data-font", c.font);
      await expect(html).toHaveAttribute("data-button", c.button);
      // The page's ground is the board's own colour.
      const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.board.background.slice(i, i + 2), 16));
      expect(ground).toBe(`rgb(${r}, ${g}, ${b})`);
      // The board's object stands in the hero, cut out of its background.
      await expect(page.locator("[data-hero-object][data-frameless] img")).toBeVisible();
      // Nothing is stored: a reload brings the demo back.
      expect(await page.evaluate(() => localStorage.getItem("scheme"))).not.toBe("brand");
    });
  }

  test("a file that is not a picture leaves the page as it was", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator(KEY)).toBeVisible();
    const before = await page.locator("html").getAttribute("data-scheme");
    await page.setInputFiles(INPUT, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a picture") });
    await expect(page.locator(HINT)).toHaveText(uiCopy.landing.tryBrandFailed!);
    await expect(page.locator("html")).toHaveAttribute("data-scheme", before ?? "");
  });
});
