import { test, expect } from "@playwright/test";
import { config, contentFor } from "../lib/prototype-config";
import {
  GAME_DURATION_MS,
  TARGET_MIN,
  TARGET_MAX,
  createGame,
  spawnTarget,
  startGame,
  catchTarget,
  tick,
  secondsLeft,
  emptyStats,
  recordResult,
  parseStats,
  serializeStats,
  STATS_STORAGE_KEY,
  type Rng,
} from "../lib/game";

/**
 * The mouse-mechanic preview (OTH-290).
 *
 * The pure half pins every rule that decides a number — the state machine and the stats
 * fold — with an injected, deterministic rng, so a target's landing and a score are exact
 * rather than probabilistic. The browser half checks that the section the config enables
 * actually plays and keeps the console clean, the same gate every other section passes.
 */

/** An rng that hands out a fixed sequence, then repeats its last value — so a test can say
 * exactly where each target lands. */
function sequence(values: number[]): Rng {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

test.describe("game state machine", () => {
  test("a fresh game is idle with a full clock and an empty board", () => {
    expect(createGame()).toEqual({
      status: "idle",
      score: 0,
      timeLeftMs: GAME_DURATION_MS,
      target: null,
    });
  });

  test("spawnTarget keeps the orb inside the safe band, even for extreme rng", () => {
    expect(spawnTarget(sequence([0, 0]))).toEqual({ x: TARGET_MIN, y: TARGET_MIN });
    expect(spawnTarget(sequence([1, 1]))).toEqual({ x: TARGET_MAX, y: TARGET_MAX });
    // rng out of range (or NaN) is clamped, never placing a target off the board.
    for (const rng of [sequence([-5, 9]), sequence([NaN, NaN])]) {
      const t = spawnTarget(rng);
      expect(t.x).toBeGreaterThanOrEqual(TARGET_MIN);
      expect(t.x).toBeLessThanOrEqual(TARGET_MAX);
      expect(t.y).toBeGreaterThanOrEqual(TARGET_MIN);
      expect(t.y).toBeLessThanOrEqual(TARGET_MAX);
    }
  });

  test("starting a round zeroes the score, fills the clock and places a target", () => {
    const state = startGame(sequence([0.5, 0.25]));
    expect(state.status).toBe("running");
    expect(state.score).toBe(0);
    expect(state.timeLeftMs).toBe(GAME_DURATION_MS);
    expect(state.target).not.toBeNull();
  });

  test("a catch scores a point and respawns the target", () => {
    const start = startGame(sequence([0.5, 0.5]));
    const next = catchTarget(start, sequence([0.1, 0.9]));
    expect(next.score).toBe(1);
    expect(next.target).toEqual({
      x: TARGET_MIN + 0.1 * (TARGET_MAX - TARGET_MIN),
      y: TARGET_MIN + 0.9 * (TARGET_MAX - TARGET_MIN),
    });
  });

  test("a catch outside a running round is ignored", () => {
    const idle = createGame();
    expect(catchTarget(idle, sequence([0.5]))).toBe(idle);
    const over = tick(startGame(sequence([0.5])), GAME_DURATION_MS);
    expect(over.status).toBe("over");
    expect(catchTarget(over, sequence([0.5]))).toBe(over);
  });

  test("the clock counts down and ends the round at zero, clearing the board", () => {
    const start = startGame(sequence([0.5]));
    const mid = tick(start, 10_000);
    expect(mid.status).toBe("running");
    expect(mid.timeLeftMs).toBe(GAME_DURATION_MS - 10_000);
    expect(mid.target).not.toBeNull();

    const done = tick(mid, GAME_DURATION_MS);
    expect(done.status).toBe("over");
    expect(done.timeLeftMs).toBe(0);
    expect(done.target).toBeNull();
  });

  test("ticking is a no-op outside a running round and never runs past zero", () => {
    const idle = createGame();
    expect(tick(idle, 5_000)).toBe(idle);
    const start = startGame(sequence([0.5]));
    expect(tick(start, -1_000).timeLeftMs).toBe(GAME_DURATION_MS);
  });

  test("secondsLeft rounds up to the whole second the HUD shows", () => {
    expect(secondsLeft({ status: "running", score: 0, timeLeftMs: 30_000, target: null })).toBe(30);
    expect(secondsLeft({ status: "running", score: 0, timeLeftMs: 1, target: null })).toBe(1);
    expect(secondsLeft({ status: "over", score: 0, timeLeftMs: 0, target: null })).toBe(0);
  });
});

test.describe("player stats", () => {
  test("recording a round keeps the best score and sums catches", () => {
    let stats = emptyStats();
    stats = recordResult(stats, 7);
    expect(stats).toEqual({ bestScore: 7, gamesPlayed: 1, totalCatches: 7 });
    stats = recordResult(stats, 4);
    expect(stats).toEqual({ bestScore: 7, gamesPlayed: 2, totalCatches: 11 });
    stats = recordResult(stats, 10);
    expect(stats).toEqual({ bestScore: 10, gamesPlayed: 3, totalCatches: 21 });
  });

  test("a bad score counts as a played-but-scoreless round, never corrupting totals", () => {
    expect(recordResult(emptyStats(), -3)).toEqual({ bestScore: 0, gamesPlayed: 1, totalCatches: 0 });
    expect(recordResult(emptyStats(), NaN)).toEqual({ bestScore: 0, gamesPlayed: 1, totalCatches: 0 });
  });

  test("parseStats never throws: junk reads as an empty history", () => {
    expect(parseStats(null)).toEqual(emptyStats());
    expect(parseStats("{not json")).toEqual(emptyStats());
    expect(parseStats("42")).toEqual(emptyStats());
    expect(parseStats({ bestScore: -1, gamesPlayed: "x", totalCatches: 3.9 })).toEqual({
      bestScore: 0,
      gamesPlayed: 0,
      totalCatches: 3,
    });
  });

  test("serialize then parse round-trips a history", () => {
    const stats = { bestScore: 12, gamesPlayed: 5, totalCatches: 40 };
    expect(parseStats(serializeStats(stats))).toEqual(stats);
    expect(STATS_STORAGE_KEY).toContain("v1");
  });
});

// ── the section a visitor plays ──

const gameEnabled = Boolean(config.patterns.landing?.sections.includes("game"));

test.describe("the game section, as a visitor sees it", () => {
  test.skip(!gameEnabled, "game section not enabled in this config");

  test("it renders its heading and a start control, with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("Firebase") && !msg.text().includes("firebaseConfig")) {
        errors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");

    const section = page.locator('[data-section="game"]');
    await expect(section).toHaveCount(1);
    const heading = contentFor(config).landing?.game?.heading;
    if (heading) await expect(section.locator("h2")).toHaveText(heading);

    // The board is empty until the round starts, so the idle render is deterministic.
    await expect(section.locator("[data-game-target]")).toHaveCount(0);
    await expect(section.getByRole("button", { name: /.+/ }).first()).toBeVisible();

    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test("starting a round puts a catchable target on the board and it scores", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    const section = page.locator('[data-section="game"]');

    await section.getByRole("button").first().click();
    const target = section.locator("[data-game-target]");
    await expect(target).toHaveCount(1);

    await target.click();
    // Score reads 1 after the first catch; a fresh target is on the board.
    await expect(section.locator("[data-game-score]")).toHaveText(/1/);
    await expect(target).toHaveCount(1);
  });
});
