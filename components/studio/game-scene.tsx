"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { StudioCopy } from "@/lib/studio/copy";
import { createStoredValue, useBrowserValue } from "@/lib/studio/client-store";
import { cardTheme } from "@/lib/studio/render-card";
import {
  DEFAULT_GAME_CONFIG,
  EMPTY_SCORE,
  PIPELINE_STAGES,
  createShipItGame,
  pickPacket,
  stagePositions,
  type GameEvent,
  type GameScore,
  type StageTier,
  type Vec2,
} from "@/lib/studio/ship-it";
import { Figure } from "./ui";

export interface GameClip {
  blob: Blob;
  ext: string;
}

interface Props {
  copy: StudioCopy;
  /** The loop only runs while the scene is on screen. */
  active: boolean;
  onScore: (score: GameScore, bestLevel: number) => void;
  onClip: (clip: GameClip | null) => void;
}

/** Personal best, kept in this browser so the HUD doubles as a one-player leaderboard. */
const BEST_KEY = "gitpulse.ship-it-best.v1";
const CLIP_SECONDS = 15;

const STAGE_BG = "#0b0f0e";
const GRID = "rgba(255,255,255,0.05)";
const MUTED = "#8a948f";
const TASK = "#f0e8dc";
const DEFECT = "#ff6b6b";
const TIER_COLORS: Record<StageTier, string> = {
  sonnet: "#6cce46",
  opus: "#dcf979",
  haiku: "#87b5bb",
  human: "#fbbf24",
  service: "#5a7a76",
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const bestLevel = createStoredValue<number>(
  BEST_KEY,
  1,
  (raw) => (Number(raw) > 0 ? Math.floor(Number(raw)) : 1),
  (v) => String(v)
);

const recorderAvailable = () => pickMime() !== null && typeof HTMLCanvasElement.prototype.captureStream === "function";

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["video/mp4", "video/webm;codecs=vp9", "video/webm"]) if (MediaRecorder.isTypeSupported(m)) return m;
  return null;
}

/**
 * Scene 3 — "Ship it". The rules live in `lib/studio/ship-it.ts`; this draws them on a
 * 2D canvas, takes taps, keeps the score and the personal best, and can record fifteen
 * seconds of play into a clip for TikTok or YouTube.
 */
export function GameScene({ copy, active, onScore, onClip }: Props) {
  const c = copy.game;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(createShipItGame(DEFAULT_GAME_CONFIG));
  const particles = useRef<Particle[]>([]);
  const accentRef = useRef("#dcf979");
  const activeRef = useRef(active);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [score, setScore] = useState<GameScore>(EMPTY_SCORE);
  const best = bestLevel.use();
  const canRecord = useBrowserValue(recorderAvailable, false);
  const [played, setPlayed] = useState(false);
  const [recording, setRecording] = useState<number | null>(null);
  const [clipReady, setClipReady] = useState(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // The page's accent is browser-only; a ref, read by the draw loop.
  useEffect(() => {
    accentRef.current = cardTheme().accent;
  }, []);

  const report = useCallback(
    (next: GameScore) => {
      setScore({ ...next });
      const raised = Math.max(bestLevel.read(), next.level);
      if (raised !== bestLevel.read()) bestLevel.set(raised);
      onScore(next, raised);
    },
    [onScore]
  );

  // A card before the first tap: the parent only hears about the game through events.
  useEffect(() => {
    onScore(gameRef.current.score, bestLevel.read());
  }, [onScore]);

  const burst = useCallback((at: Vec2, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 0.08 + Math.random() * 0.22;
      particles.current.push({ x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 0.3, color });
    }
  }, []);

  const handle = useCallback(
    (events: GameEvent[]) => {
      if (events.length === 0) return;
      for (const ev of events) {
        if (ev.type === "caught") burst(ev.pos, accentRef.current, 6);
        else if (ev.type === "shipped") burst(ev.pos, accentRef.current, 18);
        else if (ev.type === "squashed") burst(ev.pos, DEFECT, 14);
        else burst(ev.pos, MUTED, 5);
      }
      report(gameRef.current.score);
    },
    [burst, report]
  );

  // Size the canvas to its box, at device resolution.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // The loop: step the rules, then draw. Paused while the tab is hidden or the scene is not.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const cfg = DEFAULT_GAME_CONFIG;
    const stages = stagePositions(cfg);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const px = (f: number) => f * w;
      const py = (f: number) => f * h;
      const cube = Math.max(16 * dpr, Math.min(34 * dpr, w * 0.045));
      const accent = accentRef.current;

      ctx.fillStyle = STAGE_BG;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      const grid = Math.max(24 * dpr, w / 16);
      for (let x = grid; x < w; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = grid; y < h; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Production below the line.
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(0, py(cfg.floor), w, h - py(cfg.floor));

      // The line and its stages.
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12 * dpr;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(px(stages[0].x), py(cfg.floor));
      ctx.lineTo(px(stages[stages.length - 1].x), py(cfg.floor));
      ctx.stroke();
      ctx.restore();
      const r = Math.max(4 * dpr, Math.min(9 * dpr, w * 0.014));
      const labelSize = Math.max(9 * dpr, Math.min(12 * dpr, w * 0.02));
      ctx.font = `500 ${labelSize}px "Inter", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      PIPELINE_STAGES.forEach((stage, i) => {
        const color = TIER_COLORS[stage.tier];
        const x = px(stages[i].x);
        const y = py(cfg.floor);
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10 * dpr;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = MUTED;
        ctx.fillText(stage.label, x, y + r + 6 * dpr);
      });

      // Cubes.
      for (const p of gameRef.current.packets) {
        const x = px(p.pos.x);
        const y = py(p.pos.y);
        const riding = p.state === "riding";
        const size = riding ? cube * 0.8 : cube;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(riding ? 0 : p.spin + p.age * 0.9);
        if (riding) {
          ctx.shadowColor = accent;
          ctx.shadowBlur = 16 * dpr;
        }
        if (p.kind === "defect") {
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = DEFECT;
          ctx.fillRect(-size / 2, -size / 2, size, size);
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillRect(-size / 2, -size / 2, size, size * 0.3);
        } else {
          ctx.fillStyle = riding ? accent : TASK;
          ctx.fillRect(-size / 2, -size / 2, size, size);
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.fillRect(-size / 2, size * 0.2, size, size * 0.3);
        }
        ctx.restore();
      }

      // Bursts.
      for (const q of particles.current) {
        ctx.globalAlpha = Math.max(0, q.life);
        ctx.fillStyle = q.color;
        ctx.fillRect(px(q.x) - 2 * dpr, py(q.y) - 2 * dpr, 4 * dpr, 4 * dpr);
      }
      ctx.globalAlpha = 1;
    };

    const frame = (t: number) => {
      const dt = Math.max(0, (t - last) / 1000);
      last = t;
      if (activeRef.current && !document.hidden) {
        handle(gameRef.current.step(dt));
        const d = Math.min(dt, 0.1);
        for (const q of particles.current) {
          q.x += q.vx * d;
          q.y += q.vy * d + 0.15 * d;
          q.life -= d * 1.6;
        }
        particles.current = particles.current.filter((q) => q.life > 0);
      }
      draw();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [handle]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const at = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    const cubeFrac = Math.max(16, Math.min(34, rect.width * 0.045)) / rect.width;
    const id = pickPacket(gameRef.current.packets, at, cubeFrac * 1.7, rect.height / rect.width);
    if (id === null) return;
    const ev = gameRef.current.hit(id);
    if (ev) {
      setPlayed(true);
      handle([ev]);
    }
  };

  const reset = () => {
    gameRef.current.reset();
    particles.current = [];
    setPlayed(false);
    report(gameRef.current.score);
  };

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const startRecording = () => {
    const canvas = canvasRef.current;
    const mime = pickMime();
    if (!canvas || !mime || recorderRef.current) return;
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: mime });
    const chunks: Blob[] = [];
    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };
    rec.onstop = () => {
      recorderRef.current = null;
      setRecording(null);
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mime.split(";")[0] });
      onClip({ blob, ext: mime.startsWith("video/mp4") ? "mp4" : "webm" });
      setClipReady(true);
    };
    recorderRef.current = rec;
    setClipReady(false);
    onClip(null);
    rec.start(1000);
    const startedAt = Date.now();
    setRecording(CLIP_SECONDS);
    const tick = window.setInterval(() => {
      const left = CLIP_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      setRecording(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(tick);
        stopRecording();
      }
    }, 250);
  };

  useEffect(() => () => stopRecording(), [stopRecording]);

  return (
    <div className="space-y-4" data-testid="game-scene">
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{c.heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{c.intro}</p>
      </div>

      <div ref={wrapRef} className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-border/60 bg-black sm:aspect-[16/9]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={c.stageLabel}
          data-testid="game-canvas"
          onPointerDown={onPointerDown}
          className="h-full w-full touch-none select-none"
        />
        {!played && (
          <p className="pointer-events-none absolute inset-x-0 top-4 text-center text-sm font-medium text-white/80 drop-shadow">{c.hint}</p>
        )}
        {recording !== null && (
          <span className="absolute right-3 top-3 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white" aria-live="polite">
            ● {c.recording(recording)}
          </span>
        )}
        <div className="pointer-events-none absolute bottom-2 left-3 flex gap-3 text-[11px] text-white/70">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2.5 bg-[#f0e8dc]" /> {c.legendTask}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2.5 rotate-45 bg-[#ff6b6b]" /> {c.legendDefect}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6" data-testid="game-hud">
        <Figure label={c.level} value={String(score.level)} accent />
        <Figure label={c.best} value={`Lv ${best}`} small />
        <Figure label={c.shipped} value={String(score.shipped)} />
        <Figure label={c.squashed} value={String(score.squashed)} />
        <Figure label={c.missed} value={String(score.missed)} />
        <Figure label={c.escaped} value={String(score.escaped)} />
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={reset}>
          {c.reset}
        </Button>
        {canRecord ? (
          recording === null ? (
            <Button type="button" variant="secondary" onClick={startRecording}>
              {c.record}
            </Button>
          ) : (
            <Button type="button" variant="destructive" onClick={stopRecording}>
              {c.stop}
            </Button>
          )
        ) : (
          <span className="text-xs text-muted-foreground">{c.noRecorder}</span>
        )}
        {clipReady && recording === null && <span className="text-xs text-muted-foreground">{c.clipReady}</span>}
      </div>
    </div>
  );
}
