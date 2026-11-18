import { test, expect } from "@playwright/test";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { config, landingPresentation, prototypeConfigSchema } from "../lib/prototype-config";
import { FILM_BUDGET_BYTES, FILM_SMALL_QUERY, HERO_FILMS, heroFilm, heroFilmFiles, heroFilmHold, nextHeroFilm, type HeroFilmName } from "../lib/hero-film";
import { CARD_LOOPS, nextCardLoop } from "../lib/editorial";

/**
 * The hero film (T-460, 2026-11-17, after the cinematic landings of wismeo and PropCheck): real
 * footage behind the editorial hero instead of the light loop. The founder's goal for the golden
 * demo — the page a visitor from a social network lands on — is that it reads as THEIR new page
 * and that they can change it with their own hands: the picture ("Change image" walks the film
 * library) and the words ("Change texts" makes the headline and the subheadline editable in
 * place). Both are local to the visitor's browser: no request, no cost, nothing saved.
 */

const sections: readonly string[] = config.patterns.landing?.sections ?? [];
const editorial = landingPresentation(config) === "editorial";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const FILM = heroFilm(config.patterns.landing?.film);
const TRY = config.patterns.landing?.tryIt === true;
const SRC = "/newapp/test/hero-image/AAAAAAAAAAAAAAAAAAAA.jpg";
const PIXEL = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64"
);

test.describe("hero film — pure rules", () => {
  test("a config names a film from the library, or none", () => {
    expect(HERO_FILMS.length).toBeGreaterThanOrEqual(5);
    for (const name of HERO_FILMS) expect(heroFilm(name)).toBe(name);
    expect(heroFilm(undefined)).toBeNull();
    expect(heroFilm("stage-field")).toBeNull();
    expect(heroFilm("no-such-film")).toBeNull();
  });

  test("a film's files live under the build's base path: the film, its phone cut and a poster for each", () => {
    expect(heroFilmFiles("", "tower-dusk")).toEqual({
      src: "/film/tower-dusk.mp4",
      small: "/film/tower-dusk-sm.mp4",
      poster: "/film/tower-dusk.webp",
      posterSmall: "/film/tower-dusk-sm.webp",
    });
    expect(heroFilmFiles("/newapp/x", "tower-night").small).toBe("/newapp/x/film/tower-night-sm.mp4");
    expect(FILM_SMALL_QUERY).toBe("(max-width: 639px)");
  });

  test("\"Change image\" walks the library and comes back round", () => {
    const seen = new Set<string>();
    let name: HeroFilmName = HERO_FILMS[0];
    for (let i = 0; i < HERO_FILMS.length; i++) {
      seen.add(name);
      name = nextHeroFilm(name);
    }
    expect(seen.size).toBe(HERO_FILMS.length);
    expect(name).toBe(HERO_FILMS[0]);
  });

  test("every film is told in two parts: it names the second it rests at until the first scroll, for both cuts", () => {
    for (const name of HERO_FILMS) {
      for (const small of [false, true]) {
        expect(heroFilmHold(name, small), `${name} ${small ? "phone" : "wide"}`).toBeGreaterThan(1.5);
        expect(heroFilmHold(name, small), `${name} ${small ? "phone" : "wide"}`).toBeLessThan(4.6);
      }
    }
  });

  test("the first feature card's loops: the stage's device first, then the library, round and round", () => {
    expect(CARD_LOOPS[0]).toBe("stage-slab");
    let loop: (typeof CARD_LOOPS)[number] = CARD_LOOPS[0];
    const seen = new Set<string>();
    for (let i = 0; i < CARD_LOOPS.length; i++) {
      seen.add(loop);
      loop = nextCardLoop(loop);
    }
    expect(seen.size).toBe(CARD_LOOPS.length);
    expect(loop).toBe("stage-slab");
  });

  test("every film ships encoded and inside the budget", () => {
    for (const name of HERO_FILMS) {
      const files = heroFilmFiles("", name);
      const size = (path: string) => {
        const file = resolve(__dirname, "../public", `.${path}`);
        expect(existsSync(file), path).toBe(true);
        return statSync(file).size;
      };
      const [src, small, poster, posterSmall] = [size(files.src), size(files.small), size(files.poster), size(files.posterSmall)];
      expect(src + small + poster + posterSmall, name).toBeLessThanOrEqual(FILM_BUDGET_BYTES);
      // A phone never pays for the desktop cut.
      expect(small, name).toBeLessThan(src);
      expect(posterSmall, name).toBeLessThan(60_000);
      expect(poster, name).toBeLessThan(60_000);
    }
  });

  test("schema: landing.film takes a library name only, landing.tryIt a boolean", () => {
    // The shipped config with its landing slice swapped: only the two keys differ between cases.
    const rest = Object.fromEntries(Object.entries(config.patterns.landing!).filter(([key]) => key !== "film" && key !== "tryIt"));
    const landing = (extra: object) => ({ ...config, patterns: { ...config.patterns, landing: { ...rest, ...extra } } });
    expect(prototypeConfigSchema.safeParse(landing({ film: "tower-dusk", tryIt: true })).success).toBe(true);
    expect(prototypeConfigSchema.safeParse(landing({})).success).toBe(true);
    expect(prototypeConfigSchema.safeParse(landing({ film: "my-own.mp4" })).success).toBe(false);
    expect(prototypeConfigSchema.safeParse(landing({ tryIt: "yes" })).success).toBe(false);
  });
});

test.describe("hero film — the page", () => {
  test.skip(!editorial || !sections.includes("hero"), "no editorial hero in this config");

  test("without a film the hero keeps its light loop", async ({ page }) => {
    test.skip(FILM !== null, "this config names a film");
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    await expect(hero.locator("[data-hero-film]")).toHaveCount(0);
    await expect(hero.locator("[data-hero-light]")).toHaveCount(1);
  });

  test("the film owns the hero: real footage under the words, decoration only, played once", async ({ page }) => {
    test.skip(FILM === null, "this config names no film");
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    const film = hero.locator("[data-hero-film]");
    await expect(film).toHaveCount(1);
    await expect(film).toHaveAttribute("data-hero-film", FILM!);
    await expect(film).toHaveAttribute("aria-hidden", "true");
    // The film replaces the light loop — one light behind the headline, never two.
    await expect(hero.locator("[data-hero-light]")).toHaveCount(0);
    const files = heroFilmFiles(BASE, FILM!);
    const small = await page.evaluate((query) => window.matchMedia(query).matches, FILM_SMALL_QUERY);
    // The poster is in the static HTML for both screens, so the first paint is the film's first frame.
    await expect(film.locator("picture source")).toHaveAttribute("srcset", files.posterSmall);
    await expect(film.locator("picture source")).toHaveAttribute("media", FILM_SMALL_QUERY);
    await expect(film.locator("picture img")).toHaveAttribute("src", files.poster);
    await expect(film.locator("picture img")).toHaveAttribute("alt", "");
    // The video's file is chosen once the screen is known: a phone gets the phone cut.
    const video = film.locator("video");
    await expect(video.locator("source")).toHaveCount(1);
    await expect(video.locator("source")).toHaveAttribute("src", small ? files.small : files.src);
    await expect(video.locator("source")).toHaveAttribute("type", "video/mp4");
    expect(await video.evaluate((v: HTMLVideoElement) => [v.muted, v.loop, v.playsInline, v.controls])).toEqual([true, false, true, false]);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime > 0)).toBe(true);
    await expect(film).toHaveAttribute("data-film-on", "");
    // Under the words, never over them; the hero keeps its one action and the page its width.
    expect(await film.evaluate((el) => getComputedStyle(el).zIndex)).toBe("-1");
    await expect(film.locator("a, button")).toHaveCount(0);
    expect(await hero.locator("h1").evaluate((el) => getComputedStyle(el).textShadow)).not.toBe("none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  });

  test("the film fills the first screen and stops at the fold", async ({ page }) => {
    test.skip(FILM === null, "this config names no film");
    await page.goto("./");
    const film = page.locator('[data-section="hero"] [data-hero-film]');
    const viewport = page.viewportSize()!;
    const box = (await film.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(box.y + box.height).toBeGreaterThanOrEqual(viewport.height * 0.9);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  });

  test("the film is told in two parts: it rests where the story pauses, and the first scroll plays the rest", async ({ page }) => {
    test.skip(FILM === null, "this config names no film");
    await page.goto("./");
    const film = page.locator('[data-section="hero"] [data-hero-film]');
    const video = film.locator("video");
    const small = await page.evaluate((query) => window.matchMedia(query).matches, FILM_SMALL_QUERY);
    const hold = heroFilmHold(FILM!, small);
    await expect(film).toHaveAttribute("data-film-part", "1");
    // Part one: it plays, then stops on the frame where the story pauses — not at its end.
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused && v.currentTime > 0), { timeout: 15_000 }).toBe(true);
    const rest = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
    expect(rest).toBeGreaterThanOrEqual(hold - 0.05);
    expect(rest).toBeLessThan(hold + 0.4);
    expect(await video.evaluate((v: HTMLVideoElement) => v.ended)).toBe(false);
    await page.waitForTimeout(600);
    expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBe(rest);
    // Part two: the visitor's first scroll plays the rest, to the last frame.
    await page.evaluate(() => window.scrollTo(0, 60));
    await expect(film).toHaveAttribute("data-film-part", "2");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15_000 }).toBeGreaterThan(rest + 0.4);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.ended), { timeout: 15_000 }).toBe(true);
  });

  test("reduced motion keeps the poster and never downloads the film", async ({ page }) => {
    test.skip(FILM === null, "this config names no film");
    const fetched: string[] = [];
    page.on("request", (req) => {
      if (/\/film\/[^/]+\.mp4$/.test(new URL(req.url()).pathname)) fetched.push(req.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    const film = page.locator('[data-section="hero"] [data-hero-film]');
    await expect(film.locator("picture img")).toBeVisible();
    await page.waitForTimeout(800);
    expect(await film.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    expect(fetched).toEqual([]);
    await expect(film).not.toHaveAttribute("data-film-on", "");
  });

  test("an AI image owns the hero — no film beside it, and the copy does not move", async ({ page }) => {
    test.skip(FILM === null, "this config names no film");
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    const before = await hero.locator("h1").boundingBox();
    await page.route("**/hero-image.json", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visible: true, src: SRC }) })
    );
    await page.route("**/hero-image/*.jpg", (route) => route.fulfill({ status: 200, contentType: "image/jpeg", body: PIXEL }));
    await page.reload();
    await expect(hero.locator("[data-hero-image]")).toHaveCount(1);
    await expect(hero.locator("[data-hero-film]")).toHaveCount(0);
    expect(await hero.locator("h1").boundingBox()).toEqual(before);
  });
});

test("the export carries the film library only for a config that shows it", async ({ request }) => {
  // `scripts/prune-film.mjs` (npm postbuild): a customer's prototype never ships footage it cannot show.
  const res = await request.get(`film/${HERO_FILMS[0]}-sm.mp4`);
  expect(res.status()).toBe(FILM !== null || TRY ? 200 : 404);
});

test.describe("hero film — the visitor changes the page with their own hands", () => {
  test.skip(!editorial || !sections.includes("hero"), "no editorial hero in this config");

  test("a customer's page offers no such buttons unless the config asks for them", async ({ page }) => {
    test.skip(TRY, "this config turns the try-it buttons on");
    await page.goto("./");
    await expect(page.locator("[data-hero-try]")).toHaveCount(0);
    await expect(page.locator("[data-try-bar]")).toHaveCount(0);
  });

  test("features: the same two buttons — the first card's picture changes and every text can be retyped", async ({ page }) => {
    test.skip(!TRY || !sections.includes("features"), "no try-it buttons over features in this config");
    const api: string[] = [];
    page.on("request", (req) => {
      if (new URL(req.url()).pathname.includes("/api/")) api.push(req.url());
    });
    await page.goto("./");
    const features = page.locator('[data-section="features"]');
    const bar = features.locator("[data-try-bar]");
    const card = features.locator("[data-bento] > li").first();
    const light = card.locator("[data-card-light]");
    await expect(light).toHaveAttribute("data-loop", CARD_LOOPS[0]);
    // "Change image": the first card wears the next loop of the library.
    await bar.locator("button[data-try='image']").click();
    await expect(light).toHaveAttribute("data-loop", CARD_LOOPS[1]);
    await expect(light).toHaveCount(1);
    // "Change texts": the heading and every card's title and description become editable lines.
    const texts = bar.locator("button[data-try='texts']");
    expect((await texts.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await texts.click();
    await expect(features.locator("h2")).toHaveAttribute("contenteditable", "plaintext-only");
    const title = card.locator("h3");
    await expect(title).toHaveAttribute("contenteditable", "plaintext-only");
    await expect(card.locator("p")).toHaveAttribute("contenteditable", "plaintext-only");
    await title.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Open every day");
    await texts.click();
    await expect(title).not.toHaveAttribute("contenteditable", /.+/);
    await expect(title).toHaveText("Open every day");
    // The section's contract holds: one heading, and no svg beyond the configured icons.
    await expect(features.locator("h2")).toHaveCount(1);
    await expect(features.locator("[data-try-bar] svg")).toHaveCount(0);
    expect(api).toEqual([]);
  });

  test("\"Change image\" swaps the film for the next one in the library — no request beyond the film itself", async ({ page }) => {
    test.skip(!TRY || FILM === null, "no try-it buttons over a film in this config");
    const api: string[] = [];
    page.on("request", (req) => {
      if (new URL(req.url()).pathname.includes("/api/")) api.push(req.url());
    });
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    const film = hero.locator("[data-hero-film]");
    const button = hero.locator("[data-hero-try] button[data-try='image']");
    await expect(button).toBeVisible();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await button.click();
    const next = nextHeroFilm(FILM!);
    await expect(film).toHaveAttribute("data-hero-film", next);
    await expect(film.locator("picture img")).toHaveAttribute("src", heroFilmFiles(BASE, next).poster);
    await expect.poll(() => film.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime > 0)).toBe(true);
    // The hero keeps its one link; the buttons are buttons.
    await expect(hero.locator("a")).toHaveCount(1);
    expect(api).toEqual([]);
  });

  test("\"Change texts\" lets the visitor type their own headline in place — and nothing leaves the browser", async ({ page }) => {
    test.skip(!TRY, "no try-it buttons in this config");
    const api: string[] = [];
    page.on("request", (req) => {
      if (new URL(req.url()).pathname.includes("/api/")) api.push(req.url());
    });
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    const h1 = hero.locator("h1");
    const button = hero.locator("[data-hero-try] button[data-try='texts']");
    await expect(h1).not.toHaveAttribute("contenteditable", /.+/);
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(h1).toHaveAttribute("contenteditable", "plaintext-only");
    await expect(h1).toBeFocused();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Fresh bread in Trnava");
    await expect(h1).toHaveText("Fresh bread in Trnava");
    await expect(hero.locator("[data-hero-try] [data-try-hint]")).not.toBeEmpty();
    // A second press closes the editing and keeps what the visitor wrote.
    await button.click();
    await expect(h1).not.toHaveAttribute("contenteditable", /.+/);
    await expect(h1).toHaveText("Fresh bread in Trnava");
    await expect(hero.locator("a")).toHaveCount(1);
    expect(api).toEqual([]);
  });
});
