import { test, expect } from "@playwright/test";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { config, landingPresentation, prototypeConfigSchema } from "../lib/prototype-config";
import {
  FILM_BUDGET_BYTES,
  FILM_SMALL_QUERY,
  HERO_ASSETS,
  HERO_FILMS,
  HERO_STILLS,
  STILL_BUDGET_BYTES,
  heroAsset,
  heroFilm,
  heroFilmFiles,
  heroFilmHold,
  heroPictureFiles,
  nextHeroAsset,
  type HeroAssetName,
} from "../lib/hero-film";
import { CARD_LOOPS, MOTION_SMALL_QUERY, changeCardLoop, initialCardLoop, motionLoop, nextCardLoop, type CardLoopName } from "../lib/editorial";
import en from "../messages/en.json";

/**
 * The hero film (T-460, 2026-11-17, after the cinematic landings of wismeo and PropCheck): real
 * footage behind the editorial hero instead of the light loop. The founder's goal for the golden
 * demo — the page a visitor from a social network lands on — is that it reads as THEIR new page
 * and that they can change it with their own hands: the picture ("Change image" walks the asset
 * database — the films and, since 2026-11-25, ten still scenes of other businesses) and the words
 * ("Change texts" makes the headline and the subheadline editable in place). Both are local to
 * the visitor's browser: no request, no cost, nothing saved.
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

  test("the asset database: one record per picture — a unique file name, a kind and what it shows", () => {
    const names = HERO_ASSETS.map((asset) => asset.name);
    expect(new Set(names).size).toBe(names.length);
    for (const asset of HERO_ASSETS) {
      // The name is the file name under public/film/, so it stays a plain slug.
      expect(asset.name, asset.name).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(["film", "still"], asset.name).toContain(asset.kind);
      expect(asset.scene.length, asset.name).toBeGreaterThan(20);
      expect(heroAsset(asset.name)).toBe(asset);
    }
    // The films a config may name are the database's films; the stills are everything else.
    expect(HERO_ASSETS.filter((asset) => asset.kind === "film").map((asset) => asset.name)).toEqual([...HERO_FILMS]);
    expect(HERO_ASSETS.filter((asset) => asset.kind === "still").map((asset) => asset.name)).toEqual([...HERO_STILLS]);
    expect(HERO_STILLS.length).toBeGreaterThanOrEqual(10);
  });

  test("\"Change image\" walks the whole database, films and stills, and comes back round", () => {
    const seen = new Set<string>();
    let name: HeroAssetName = HERO_ASSETS[0].name;
    for (let i = 0; i < HERO_ASSETS.length; i++) {
      seen.add(name);
      name = nextHeroAsset(name);
    }
    expect(seen.size).toBe(HERO_ASSETS.length);
    expect(name).toBe(HERO_ASSETS[0].name);
    // A visitor meets the still scenes before the factory's other footage: the first press shows one.
    expect(heroAsset(nextHeroAsset(HERO_FILMS[0])).kind).toBe("still");
  });

  test("a still's files: the wide picture and its phone cut, under the build's base path", () => {
    expect(heroPictureFiles("", HERO_STILLS[0])).toEqual({
      poster: `/film/${HERO_STILLS[0]}.webp`,
      posterSmall: `/film/${HERO_STILLS[0]}-sm.webp`,
    });
    expect(heroPictureFiles("/newapp/x", "tower-dusk")).toEqual({ poster: "/newapp/x/film/tower-dusk.webp", posterSmall: "/newapp/x/film/tower-dusk-sm.webp" });
  });

  test("every still ships as two WebP pictures inside the budget", () => {
    for (const name of HERO_STILLS) {
      const files = heroPictureFiles("", name);
      const size = (path: string) => {
        const file = resolve(__dirname, "../public", `.${path}`);
        expect(existsSync(file), path).toBe(true);
        return statSync(file).size;
      };
      const [poster, posterSmall] = [size(files.poster), size(files.posterSmall)];
      expect(poster + posterSmall, name).toBeLessThanOrEqual(STILL_BUDGET_BYTES);
      // A phone never pays for the desktop picture.
      expect(posterSmall, name).toBeLessThan(poster);
      expect(posterSmall, name).toBeLessThan(80_000);
      // A still is a picture only: no film ships under its name.
      expect(existsSync(resolve(__dirname, "../public/film", `${name}.mp4`)), name).toBe(false);
    }
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

  test("every feature card has a picture of its own: the first starts on the stage's device, the others plain, and cards changed together never wear their neighbour's loop", () => {
    expect(initialCardLoop(0)).toBe("stage-slab");
    for (let i = 1; i < 6; i++) expect(initialCardLoop(i)).toBeNull();
    // A card that wears a loop walks the library exactly as the first card always did.
    for (const loop of CARD_LOOPS) for (let i = 0; i < 6; i++) expect(changeCardLoop(loop, i)).toBe(nextCardLoop(loop));
    // "Change image" under the heading changes every card at once: after any number of presses
    // every card wears a loop of the library and none wears the loop of the card before it.
    let row: (CardLoopName | null)[] = Array.from({ length: 6 }, (_, i) => initialCardLoop(i));
    for (let press = 1; press <= CARD_LOOPS.length * 2; press++) {
      row = row.map((loop, i) => changeCardLoop(loop, i));
      for (let i = 0; i < row.length; i++) {
        expect(CARD_LOOPS, `press ${press}, card ${i + 1}`).toContain(row[i]);
        if (i > 0) expect(row[i], `press ${press}, card ${i + 1}`).not.toBe(row[i - 1]);
      }
    }
    // A plain card pressed on its own comes round to every loop of the library.
    const seen = new Set<string>();
    let own = initialCardLoop(2);
    for (let i = 0; i < CARD_LOOPS.length; i++) {
      own = changeCardLoop(own, 2);
      seen.add(own);
    }
    expect(seen.size).toBe(CARD_LOOPS.length);
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
    // A config opens on a film; the still scenes are only what "Change image" shows a visitor.
    expect(prototypeConfigSchema.safeParse(landing({ film: HERO_STILLS[0] })).success).toBe(false);
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
    // Nor a key on any card: only the first card wears a picture, the stage's device.
    await expect(page.locator("button[data-try]")).toHaveCount(0);
    const lights = page.locator("[data-bento] [data-card-light]");
    await expect(lights).toHaveCount(sections.includes("features") ? 1 : 0);
    if (sections.includes("features")) await expect(lights).toHaveAttribute("data-loop", CARD_LOOPS[0]);
  });

  test("features: the same two buttons — the cards' pictures change and every text can be retyped", async ({ page }) => {
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
    // "Change image": the first card wears the next loop of the library (and every other card
    // its own — the next test).
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
    const cards = features.locator("[data-bento] > li");
    const count = await cards.count();
    await expect(cards.locator("h3[contenteditable='plaintext-only']")).toHaveCount(count);
    await expect(cards.locator("p[contenteditable='plaintext-only']")).toHaveCount(count);
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

  test("features: every card has its own \"Change image\" key — a plain card gains a picture, the button under the heading changes them all", async ({ page }) => {
    test.skip(!TRY || !sections.includes("features"), "no try-it buttons over features in this config");
    const api: string[] = [];
    page.on("request", (req) => {
      if (new URL(req.url()).pathname.includes("/api/")) api.push(req.url());
    });
    await page.goto("./");
    const features = page.locator('[data-section="features"]');
    const cards = features.locator("[data-bento] > li");
    const count = await cards.count();
    test.skip(count < 2, "a single card: the button under the heading already changes it");
    const light = (i: number) => cards.nth(i).locator("[data-card-light]");
    const key = (i: number) => cards.nth(i).locator("button[data-try='image']");

    // One key in every card, a touch target, each saying which card it changes.
    const keys = cards.locator("button[data-try='image']");
    await expect(keys).toHaveCount(count);
    for (let i = 0; i < count; i++) await expect(key(i)).toHaveCount(1);
    for (const height of await keys.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) expect(height).toBeGreaterThanOrEqual(44);
    const names = await keys.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));
    expect(new Set(names).size).toBe(count);
    for (const name of names) expect(name.length).toBeGreaterThan(0);

    // At rest the page is the one every prototype shows: the device in the first card only.
    await expect(light(0)).toHaveAttribute("data-loop", CARD_LOOPS[0]);
    for (let i = 1; i < count; i++) await expect(light(i)).toHaveCount(0);

    // The last card's own key: that card gains a picture — drawn like the first card's (inside
    // the card, under its words, screened onto the palette) — and no other card changes.
    const last = count - 1;
    let own = changeCardLoop(initialCardLoop(last), last);
    await key(last).click();
    await expect(light(last)).toHaveCount(1);
    await expect(light(last)).toHaveAttribute("data-loop", own);
    await expect(light(last)).toHaveAttribute("aria-hidden", "true");
    const small = await page.evaluate((query) => window.matchMedia(query).matches, MOTION_SMALL_QUERY);
    const file = motionLoop(BASE, own).sources[0]!;
    await expect(light(last).locator("video source").first()).toHaveAttribute("src", small ? file.small : file.src);
    expect(await light(last).evaluate((el) => getComputedStyle(el).mixBlendMode)).toBe("screen");
    expect(await cards.nth(last).evaluate((el) => getComputedStyle(el).isolation)).toBe("isolate");
    await expect(light(0)).toHaveAttribute("data-loop", CARD_LOOPS[0]);
    for (let i = 1; i < last; i++) await expect(light(i)).toHaveCount(0);
    // Pressed again it walks on through the library.
    own = changeCardLoop(own, last);
    await key(last).click();
    await expect(light(last)).toHaveAttribute("data-loop", own);

    // The button under the heading changes every card at once.
    await features.locator("[data-try-bar] button[data-try='image']").click();
    for (let i = 0; i < count; i++) {
      await expect(light(i)).toHaveCount(1);
      await expect(light(i)).toHaveAttribute("data-loop", changeCardLoop(i === last ? own : initialCardLoop(i), i));
    }

    // And the words of the last card can be retyped like the first card's.
    const texts = features.locator("[data-try-bar] button[data-try='texts']");
    await texts.click();
    const words = cards.nth(last).locator("p");
    await expect(words).toHaveAttribute("contenteditable", "plaintext-only");
    await words.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Baked before six");
    // While the texts are edited every text of the page is a line (tests/try-texts.spec.ts) — but
    // a card's key stays a key, like the two under the heading: it is not typed into, it acts.
    await expect(cards.locator("button[data-try='image'][contenteditable], button[data-try='image'] [contenteditable]")).toHaveCount(0);
    const worn = await light(0).getAttribute("data-loop");
    await key(0).click();
    await expect(light(0)).not.toHaveAttribute("data-loop", worn!);
    await expect(key(0)).toHaveText(await key(1).innerText());
    await texts.click();
    await expect(words).not.toHaveAttribute("contenteditable", /.+/);
    await expect(words).toHaveText("Baked before six");

    // Keys, not links, and no icon on them: the section's svgs are counted. Nothing left the browser.
    await expect(cards.locator("a")).toHaveCount(0);
    await expect(cards.locator("button svg")).toHaveCount(0);
    await expect(features.locator("h2")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
    expect(api).toEqual([]);
  });

  test("the control pad: picture, words, colour and the action's look as touch keys in the product frame, beside the device switch", async ({ page }, info) => {
    test.skip(!TRY, "no try-it buttons in this config");
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    const frame = hero.locator("[data-hero-frame]");
    test.skip((await frame.count()) === 0, "this hero has no product frame: the buttons stay under its action");
    const pad = frame.locator("[data-hero-try] [data-try-pad]");
    await expect(pad).toHaveCount(1);
    // One control panel: nothing left under the hero's action, and the device switch in the same frame.
    await expect(hero.locator(".editorial-hero-copy [data-try-bar]")).toHaveCount(0);
    if (info.project.name !== "mobile") await expect(frame.locator("[data-device-tabs]")).toBeVisible();
    const keys = pad.locator("button");
    expect(await keys.evaluateAll((els) => els.map((el) => el.getAttribute("data-try")))).toEqual(
      // The fourth key — the look of the page's action — came on 2026-11-25 (tests/button-style.spec.ts).
      FILM === null ? ["texts", "colour", "button"] : ["image", "texts", "colour", "button"]
    );
    for (const box of await keys.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);
    // In reach before any scroll: the pad starts above the fold.
    if (FILM !== null) expect((await pad.boundingBox())!.y).toBeLessThan(page.viewportSize()!.height - 24);
    // The colour key steps the page's palette — the header's own "Change colour".
    const before = await page.locator("html").getAttribute("data-scheme");
    await pad.locator("button[data-try='colour']").click();
    await expect(page.locator("html")).not.toHaveAttribute("data-scheme", before!);
    // Keys, not links: the frame carries none and the hero keeps its one action.
    await expect(frame.locator("a")).toHaveCount(0);
    await expect(hero.locator("a")).toHaveCount(1);
  });

  test("\"Change image\" shows the next asset of the database — a still scene is a picture, never a film", async ({ page }) => {
    test.skip(!TRY || FILM === null, "no try-it buttons over a film in this config");
    const api: string[] = [];
    const films: string[] = [];
    page.on("request", (req) => {
      const path = new URL(req.url()).pathname;
      if (path.includes("/api/")) api.push(req.url());
      if (path.endsWith(".mp4")) films.push(path);
    });
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    const picture = hero.locator("[data-hero-film]");
    const button = hero.locator("[data-hero-try] button[data-try='image']");
    await expect(button).toBeVisible();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(picture).toHaveAttribute("data-hero-kind", "film");
    // Where the headline is laid out, whatever the scroll (a tap on a phone may bring the key into view).
    const laidOut = () => hero.locator("h1").evaluate((el: HTMLElement) => [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight]);
    const before = await laidOut();
    const veil = () => picture.evaluate((el) => getComputedStyle(el, "::after").backgroundImage);
    const filmVeil = await veil();
    await button.click();
    const next = nextHeroAsset(FILM!);
    expect(heroAsset(next).kind).toBe("still");
    await expect(picture).toHaveCount(1);
    await expect(picture).toHaveAttribute("data-hero-film", next);
    await expect(picture).toHaveAttribute("data-hero-kind", "still");
    await expect(picture).toHaveAttribute("aria-hidden", "true");
    // The same two cuts as a film's first frame — a phone gets its own — and no video at all.
    const files = heroPictureFiles(BASE, next);
    await expect(picture.locator("picture source")).toHaveAttribute("srcset", files.posterSmall);
    await expect(picture.locator("picture source")).toHaveAttribute("media", FILM_SMALL_QUERY);
    await expect(picture.locator("picture img")).toHaveAttribute("src", files.poster);
    await expect(picture.locator("picture img")).toHaveAttribute("alt", "");
    await expect(picture.locator("video")).toHaveCount(0);
    await expect.poll(() => picture.locator("picture img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const small = await page.evaluate((query) => window.matchMedia(query).matches, FILM_SMALL_QUERY);
    expect(await picture.locator("picture img").evaluate((img: HTMLImageElement) => new URL(img.currentSrc).pathname)).toBe(small ? files.posterSmall : files.poster);
    // It lies where the film lay — under the words, across the first screen — and nothing moves.
    expect(await picture.evaluate((el) => getComputedStyle(el).zIndex)).toBe("-1");
    expect((await picture.boundingBox())!.width).toBeGreaterThanOrEqual(page.viewportSize()!.width - 1);
    expect(await laidOut()).toEqual(before);
    expect(await hero.locator("h1").evaluate((el) => getComputedStyle(el).textShadow)).not.toBe("none");
    // A still is brighter and busier than the factory's night footage: it wears its own, denser veil
    // behind the copy — still a veil of the page's background, so it follows "Change colour".
    expect(await veil()).toContain("linear-gradient");
    expect(await veil()).not.toBe(filmVeil);
    // The line under the keys says what the visitor is looking at: a scene, not the factory's footage.
    await expect(hero.locator("[data-hero-try] [data-try-hint]")).toHaveText(en.landing.tryStillHint);
    // The hero keeps its one link; the buttons are buttons; the only film fetched is the opening one.
    await expect(hero.locator("a")).toHaveCount(1);
    expect(api).toEqual([]);
    expect(films.every((path) => path.includes(`/film/${FILM}`))).toBe(true);
  });

  test("\"Change image\" walks the whole database on the page: every picture loads, and a film plays again", async ({ page }) => {
    test.skip(!TRY || FILM === null, "no try-it buttons over a film in this config");
    test.slow();
    const failed: string[] = [];
    page.on("response", (res) => {
      if (new URL(res.url()).pathname.includes("/film/") && res.status() >= 400) failed.push(res.url());
    });
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    const picture = hero.locator("[data-hero-film]");
    const button = hero.locator("[data-hero-try] button[data-try='image']");
    let name: HeroAssetName = FILM!;
    for (let i = 0; i < HERO_ASSETS.length; i++) {
      await button.click();
      name = nextHeroAsset(name);
      const { kind } = heroAsset(name);
      await expect(picture).toHaveAttribute("data-hero-film", name);
      await expect(picture).toHaveAttribute("data-hero-kind", kind);
      await expect.poll(() => picture.locator("picture img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { message: name }).toBe(true);
      await expect(picture.locator("video")).toHaveCount(kind === "film" ? 1 : 0);
      await expect(hero.locator("[data-hero-try] [data-try-hint]")).toHaveText(kind === "film" ? en.landing.tryImageHint : en.landing.tryStillHint);
    }
    // Round the whole database and back on the film the page opened with — which plays again.
    expect(name).toBe(FILM);
    await expect.poll(() => picture.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime > 0)).toBe(true);
    expect(failed).toEqual([]);
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
