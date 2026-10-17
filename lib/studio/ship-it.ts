/**
 * ship-it.ts — "Ship it", the pipeline mini-game from tokenwise.sk/how-it-works, in two
 * dimensions. Pure state: no canvas and no DOM, so the rules are testable without a browser
 * (`tests/studio-logic.spec.ts`). The scene (`components/studio/game-scene.tsx`) draws
 * whatever this returns.
 *
 * White cubes are tasks, red cubes are defects; both fall from the top of the stage towards
 * the pipeline at the bottom. Tap a task and it drops into the line and rides it node by
 * node until it ships at Prod. Tap a defect and it is squashed. A task that reaches the
 * floor untouched is missed; a defect that reaches it escapes into production.
 *
 * Every ship or squash counts toward the level, and each level makes cubes fall and spawn
 * faster (`speedForLevel`), capped so late levels stay playable on a phone.
 */

export type PacketKind = "task" | "defect";
export type PacketState = "falling" | "riding" | "gone";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Packet {
  id: number;
  kind: PacketKind;
  state: PacketState;
  /** Stage fractions: x 0..1 left→right, y 0..1 top→bottom. A riding task is placed by `rideProgress`. */
  pos: Vec2;
  /** Fractions per second. */
  vel: Vec2;
  /** Seconds since spawn (falling) or since it entered the line (riding). */
  age: number;
  /** 0..1 along the pipeline while riding. */
  rideProgress: number;
  /** Speed multiplier fixed at spawn, so a cube's difficulty never changes mid-fall. */
  speed: number;
  /** Rotation seed — for the renderer only. */
  spin: number;
}

export interface GameScore {
  shipped: number;
  squashed: number;
  missed: number;
  escaped: number;
  /** Current level — climbs with every ship or squash (starts at 1). */
  level: number;
}

export const EMPTY_SCORE: GameScore = { shipped: 0, squashed: 0, missed: 0, escaped: 0, level: 1 };

export type GameEvent =
  | { type: "caught"; id: number; pos: Vec2 }
  | { type: "shipped"; id: number; pos: Vec2 }
  | { type: "squashed"; id: number; pos: Vec2 }
  | { type: "missed"; id: number; pos: Vec2 }
  | { type: "escaped"; id: number; pos: Vec2 };

export interface GameConfig {
  /** Seconds between spawns at level 1. */
  spawnEvery: number;
  /** Seconds a cube takes to fall from the top to the floor at level 1. */
  lifetime: number;
  /** Seconds a caught task takes to ride the whole line. */
  rideSeconds: number;
  /** Share of spawns that are defects (0..1). */
  defectShare: number;
  /** Cubes in the air at once — a cap, not a target. */
  maxFalling: number;
  /** Successful actions (ships + squashes) needed to climb one level. */
  levelEvery: number;
  /** Speed multiplier added for each level above the first. */
  speedStep: number;
  /** Hard cap on the speed multiplier. */
  maxSpeed: number;
  /** y of the pipeline (stage fraction). A cube that reaches it is out of play. */
  floor: number;
  /** x range cubes spawn in and the line spans. */
  lane: [number, number];
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  spawnEvery: 2.0,
  lifetime: 7,
  rideSeconds: 3.6,
  defectShare: 0.3,
  maxFalling: 5,
  levelEvery: 6,
  speedStep: 0.18,
  maxSpeed: 2.4,
  floor: 0.8,
  lane: [0.08, 0.92],
};

/** Cubes start just above the stage so they enter rather than appear. */
const SPAWN_Y = -0.06;

/** The line a caught task rides, left to right. Eight stops so the labels fit a phone. */
export const PIPELINE_STAGES = [
  { id: "linear", label: "Linear", tier: "service" },
  { id: "analyst", label: "Analyst", tier: "sonnet" },
  { id: "developer", label: "Developer", tier: "opus" },
  { id: "reviewer", label: "Reviewer", tier: "opus" },
  { id: "security", label: "Security", tier: "sonnet" },
  { id: "tester", label: "Tester", tier: "sonnet" },
  { id: "approve", label: "Approve", tier: "human" },
  { id: "prod", label: "Prod", tier: "haiku" },
] as const;

export type StageTier = (typeof PIPELINE_STAGES)[number]["tier"];

/** Where each stage sits on the line, evenly spaced across the lane. */
export function stagePositions(config: GameConfig = DEFAULT_GAME_CONFIG): Vec2[] {
  const [x0, x1] = config.lane;
  const n = PIPELINE_STAGES.length;
  return PIPELINE_STAGES.map((_, i) => ({ x: x0 + ((x1 - x0) * i) / (n - 1), y: config.floor }));
}

/** The point at `t` (0..1) along the line. Stops are evenly spaced, so this is a lerp. */
export function ridePoint(t: number, config: GameConfig = DEFAULT_GAME_CONFIG, out: Vec2 = { x: 0, y: 0 }): Vec2 {
  const k = Math.max(0, Math.min(1, t));
  out.x = config.lane[0] + (config.lane[1] - config.lane[0]) * k;
  out.y = config.floor;
  return out;
}

/** Level from the number of successful actions (ships + squashes). Level 1 is the start. */
export function levelFor(successes: number, config: GameConfig = DEFAULT_GAME_CONFIG): number {
  return 1 + Math.floor(Math.max(0, successes) / config.levelEvery);
}

/** Fall + spawn speed multiplier for a level — grows each level, capped at `maxSpeed`. */
export function speedForLevel(level: number, config: GameConfig = DEFAULT_GAME_CONFIG): number {
  return Math.min(config.maxSpeed, 1 + Math.max(0, level - 1) * config.speedStep);
}

export interface ShipItGame {
  readonly packets: readonly Packet[];
  readonly score: GameScore;
  /** Advance by `dt` seconds. Returns what happened this step. */
  step(dt: number): GameEvent[];
  /** A tap landed on this cube. Null when it cannot be caught any more. */
  hit(id: number): GameEvent | null;
  reset(): void;
}

/** `rng` returns [0, 1) — injectable so tests are deterministic. */
export function createShipItGame(config: GameConfig = DEFAULT_GAME_CONFIG, rng: () => number = Math.random): ShipItGame {
  let packets: Packet[] = [];
  let score: GameScore = { ...EMPTY_SCORE };
  let nextId = 1;
  // The first cube appears quickly so the visitor sees the game before scrolling away.
  let spawnClock = config.spawnEvery * 0.6;

  const withLevel = (s: GameScore): GameScore => ({ ...s, level: levelFor(s.shipped + s.squashed, config) });

  const spawn = (speed: number) => {
    const kind: PacketKind = rng() < config.defectShare ? "defect" : "task";
    const [x0, x1] = config.lane;
    packets.push({
      id: nextId++,
      kind,
      state: "falling",
      pos: { x: x0 + rng() * (x1 - x0), y: SPAWN_Y },
      // Straight down at a pace that reaches the floor in `lifetime` seconds, with a little
      // sideways drift; the level's multiplier scales both, never enough to be a reflex test.
      vel: { x: (rng() - 0.5) * 0.06 * speed, y: ((config.floor - SPAWN_Y) / config.lifetime) * speed },
      age: 0,
      rideProgress: 0,
      speed,
      spin: rng() * Math.PI * 2,
    });
  };

  return {
    get packets() {
      return packets;
    },
    get score() {
      return score;
    },

    step(dt) {
      const events: GameEvent[] = [];
      // A backgrounded tab resumes with a huge dt; clamp so nothing teleports or mass-expires.
      const d = Math.max(0, Math.min(dt, 0.1));
      const speed = speedForLevel(score.level, config);

      spawnClock += d;
      if (spawnClock >= config.spawnEvery / speed) {
        spawnClock = 0;
        if (packets.filter((p) => p.state === "falling").length < config.maxFalling) spawn(speed);
      }

      for (const p of packets) {
        p.age += d;
        if (p.state === "falling") {
          p.pos.x = Math.max(0.03, Math.min(0.97, p.pos.x + p.vel.x * d));
          p.pos.y += p.vel.y * d;
          if (p.pos.y >= config.floor) {
            p.state = "gone";
            if (p.kind === "task") {
              score = { ...score, missed: score.missed + 1 };
              events.push({ type: "missed", id: p.id, pos: { ...p.pos } });
            } else {
              score = { ...score, escaped: score.escaped + 1 };
              events.push({ type: "escaped", id: p.id, pos: { ...p.pos } });
            }
          }
        } else if (p.state === "riding") {
          p.rideProgress = Math.min(1, p.age / config.rideSeconds);
          ridePoint(p.rideProgress, config, p.pos);
          if (p.rideProgress >= 1) {
            p.state = "gone";
            score = withLevel({ ...score, shipped: score.shipped + 1 });
            events.push({ type: "shipped", id: p.id, pos: { ...p.pos } });
          }
        }
      }
      packets = packets.filter((p) => p.state !== "gone");
      return events;
    },

    hit(id) {
      const p = packets.find((q) => q.id === id);
      if (!p || p.state !== "falling") return null;
      const pos = { ...p.pos };
      if (p.kind === "defect") {
        p.state = "gone";
        packets = packets.filter((q) => q !== p);
        score = withLevel({ ...score, squashed: score.squashed + 1 });
        return { type: "squashed", id, pos };
      }
      p.state = "riding";
      p.age = 0;
      p.rideProgress = 0;
      ridePoint(0, config, p.pos);
      return { type: "caught", id, pos };
    },

    reset() {
      packets = [];
      score = { ...EMPTY_SCORE };
      spawnClock = config.spawnEvery * 0.6;
    },
  };
}

/** The cube nearest to a tap, within `radius` — all in fractions of the stage WIDTH, so
 * `aspect` (height ÷ width) turns the y distance into the same unit and a tall stage does
 * not make vertical misses easier than horizontal ones. */
export function pickPacket(
  packets: readonly Packet[],
  at: Vec2,
  radius: number,
  aspect = 1
): number | null {
  let best: { id: number; d: number } | null = null;
  for (const p of packets) {
    if (p.state !== "falling") continue;
    const dx = p.pos.x - at.x;
    const dy = (p.pos.y - at.y) * aspect;
    const d = Math.hypot(dx, dy);
    if (d <= radius && (!best || d < best.d)) best = { id: p.id, d };
  }
  return best ? best.id : null;
}
