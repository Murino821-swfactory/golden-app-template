/**
 * game.ts — the pure core of the mouse-mechanic preview (OTH-290).
 *
 * "New game" is a world built in Unreal Engine 5 with characters written by Claude
 * Fable 5.1. The full build is not a browser game, so the landing page carries a small
 * PREVIEW instead: a timed, cursor-driven round that lets a visitor feel the mouse
 * mechanic before they download the real client, and records their own best scores.
 *
 * Everything that decides a number lives here, as pure functions, so the rules can be
 * pinned by `tests/game.spec.ts` without a browser. The React section in
 * `components/sections/game.tsx` only owns the clock, the pointer events and localStorage.
 *
 * Randomness is injected (`Rng`), never read from `Math.random` in this module: a test
 * passes a deterministic sequence and asserts exactly where a target lands.
 */

/** A round lasts thirty seconds — long enough to build a score, short enough to replay. */
export const GAME_DURATION_MS = 30_000;

/** Targets stay inside this inner band (as a fraction of the play area) so the whole orb
 * is always on screen and clickable, never clipped by an edge. */
export const TARGET_MIN = 0.08;
export const TARGET_MAX = 0.92;

export type GameStatus = "idle" | "running" | "over";

export interface Target {
  /** Horizontal position as a 0..1 fraction of the play area's width. */
  x: number;
  /** Vertical position as a 0..1 fraction of the play area's height. */
  y: number;
}

export interface GameState {
  status: GameStatus;
  score: number;
  timeLeftMs: number;
  target: Target | null;
}

/** A source of randomness in the half-open range [0, 1), e.g. `Math.random`. */
export type Rng = () => number;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** A fresh, unstarted game: the clock is full and nothing is on the board yet. */
export function createGame(): GameState {
  return { status: "idle", score: 0, timeLeftMs: GAME_DURATION_MS, target: null };
}

/** Place a target within the safe inner band. Pure given `rng`. */
export function spawnTarget(rng: Rng): Target {
  const place = () => TARGET_MIN + clamp01(rng()) * (TARGET_MAX - TARGET_MIN);
  return { x: place(), y: place() };
}

/** Begin a round: a full clock, a zeroed score and the first target. */
export function startGame(rng: Rng): GameState {
  return { status: "running", score: 0, timeLeftMs: GAME_DURATION_MS, target: spawnTarget(rng) };
}

/** Catching the target scores a point and respawns it — but only while the round runs,
 * so a stray click on a finished board can never inflate a score. */
export function catchTarget(state: GameState, rng: Rng): GameState {
  if (state.status !== "running") return state;
  return { ...state, score: state.score + 1, target: spawnTarget(rng) };
}

/** Advance the clock by `deltaMs` (never negative). At zero the round is over and the
 * board is cleared; ticking a non-running game is a no-op. */
export function tick(state: GameState, deltaMs: number): GameState {
  if (state.status !== "running") return state;
  const timeLeftMs = Math.max(0, state.timeLeftMs - Math.max(0, deltaMs));
  if (timeLeftMs === 0) return { ...state, status: "over", timeLeftMs: 0, target: null };
  return { ...state, timeLeftMs };
}

/** Whole seconds left, rounded up — the number the HUD shows. */
export function secondsLeft(state: GameState): number {
  return Math.ceil(Math.max(0, state.timeLeftMs) / 1000);
}

/** Where the player's own history is kept. Versioned so a future shape change never has to
 * read a stale record. */
export const STATS_STORAGE_KEY = "newgame.preview.stats.v1";

export interface GameStats {
  bestScore: number;
  gamesPlayed: number;
  totalCatches: number;
}

export function emptyStats(): GameStats {
  return { bestScore: 0, gamesPlayed: 0, totalCatches: 0 };
}

/** Fold a finished round's score into the running totals. Pure; a negative or non-finite
 * score counts as zero rather than corrupting the history. */
export function recordResult(stats: GameStats, score: number): GameStats {
  const safe = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;
  return {
    bestScore: Math.max(stats.bestScore, safe),
    gamesPlayed: stats.gamesPlayed + 1,
    totalCatches: stats.totalCatches + safe,
  };
}

/** Read stats from untrusted storage without ever throwing: malformed JSON, the wrong
 * type or a missing field all read as a clean, empty history. */
export function parseStats(raw: unknown): GameStats {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return emptyStats();
    }
  }
  if (!value || typeof value !== "object") return emptyStats();
  const record = value as Record<string, unknown>;
  const count = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  return {
    bestScore: count(record.bestScore),
    gamesPlayed: count(record.gamesPlayed),
    totalCatches: count(record.totalCatches),
  };
}

export function serializeStats(stats: GameStats): string {
  return JSON.stringify(stats);
}
