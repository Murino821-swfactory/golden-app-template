"use client";

import { useCallback, useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useContent } from "@/hooks/use-content";
import { Button } from "@/components/ui/button";
import {
  catchTarget,
  createGame,
  emptyStats,
  parseStats,
  recordResult,
  secondsLeft,
  serializeStats,
  startGame,
  STATS_STORAGE_KEY,
  tick,
  type GameState,
  type GameStats,
} from "@/lib/game";

/**
 * The mouse-mechanic preview (OTH-290).
 *
 * A thirty-second, cursor-driven round: orbs appear in the play area and the player catches
 * them by moving the mouse over each one (a click or the keyboard works too, so it is not
 * mouse-only). It is a teaser for the real Unreal Engine 5 + Claude Fable 5.1 build, and it
 * keeps the player's own best scores in localStorage — no account, no network, nothing to
 * break the console-clean smoke gate.
 *
 * Every rule that decides a number is in `lib/game.ts` and pinned by `tests/game.spec.ts`;
 * this component owns only the clock, the pointer events and storage.
 */

type Action = { type: "start" } | { type: "catch" } | { type: "tick"; deltaMs: number };

const rng = () => Math.random();

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "start":
      return startGame(rng);
    case "catch":
      return catchTarget(state, rng);
    case "tick":
      return tick(state, action.deltaMs);
  }
}

/**
 * The history lives in localStorage, outside React, and is read through useSyncExternalStore:
 * the server snapshot is always an empty history, the client re-reads after hydration, and
 * there is no setState inside an effect (and so no cascading render) and no hydration
 * mismatch over a value only the browser knows.
 */
const EMPTY = emptyStats();
let cache: GameStats | null = null;
const listeners = new Set<() => void>();

function readStats(): GameStats {
  if (cache) return cache; // a stable reference between writes, as getSnapshot requires
  try {
    cache = parseStats(window.localStorage.getItem(STATS_STORAGE_KEY));
  } catch {
    cache = EMPTY; // storage can be unavailable (private mode)
  }
  return cache;
}

function writeStats(next: GameStats): void {
  cache = next;
  try {
    window.localStorage.setItem(STATS_STORAGE_KEY, serializeStats(next));
  } catch {
    /* storage can be unavailable; the in-memory cache still updates the UI */
  }
  for (const listener of listeners) listener();
}

function subscribeStats(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function GameSection() {
  const t = useTranslations("game");
  const block = useContent().landing?.game;
  const [state, dispatch] = useReducer(reducer, undefined, createGame);
  const stats = useSyncExternalStore(subscribeStats, readStats, () => EMPTY);
  const prevStatus = useRef(state.status);
  // One catch per orb: a mouse gesture fires both pointerenter and click, so the second is
  // ignored until the next target spawns.
  const caught = useRef(false);

  // Drive the clock with the animation frame while a round runs.
  useEffect(() => {
    if (state.status !== "running") return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      dispatch({ type: "tick", deltaMs: now - last });
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [state.status]);

  // A new target (start, or after a catch) re-arms the one-catch-per-orb guard.
  useEffect(() => {
    caught.current = false;
  }, [state.target]);

  // When a round ends, fold its score into the stored history.
  useEffect(() => {
    if (prevStatus.current === "running" && state.status === "over") {
      writeStats(recordResult(readStats(), state.score));
    }
    prevStatus.current = state.status;
  }, [state.status, state.score]);

  const onCatch = useCallback(() => {
    if (caught.current) return;
    caught.current = true;
    dispatch({ type: "catch" });
  }, []);

  if (!block) return null; // zod requires the copy whenever this section is enabled

  const running = state.status === "running";
  const over = state.status === "over";

  return (
    <section id="game" data-section="game" className="scroll-mt-24 mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight">{block.heading ?? t("statsHeading")}</h2>
        {block.intro && <p className="mt-4 text-muted-foreground">{block.intro}</p>}
        {block.instructions && <p className="mt-2 text-sm text-muted-foreground">{block.instructions}</p>}
      </div>

      {/* HUD — the live round numbers. */}
      {(running || over) && (
        <dl className="mx-auto mt-8 flex max-w-md items-center justify-center gap-8 text-center">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("score")}</dt>
            <dd data-game-score className="text-3xl font-semibold tabular-nums">{state.score}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("time")}</dt>
            <dd className="text-3xl font-semibold tabular-nums">{t("seconds", { count: secondsLeft(state) })}</dd>
          </div>
        </dl>
      )}

      <div
        className="relative mx-auto mt-8 h-72 w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-muted/40 sm:h-96"
        aria-label={t("running")}
      >
        {/* Idle / finished overlay with the primary action. */}
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            {over && <p className="text-lg font-medium">{t("result", { score: state.score })}</p>}
            {!over && <p className="max-w-sm text-sm text-muted-foreground">{t("running")}</p>}
            <Button type="button" size="lg" onClick={() => dispatch({ type: "start" })}>
              {over ? t("restart") : t("start")}
            </Button>
          </div>
        )}

        {/* The target orb. Catching it is a mouse move onto it (pointerenter); a click or the
            keyboard activates it too, so hover is never required. */}
        {running && state.target && (
          <button
            type="button"
            data-game-target
            aria-label={t("targetLabel")}
            onPointerEnter={onCatch}
            onClick={onCatch}
            style={{ left: `${state.target.x * 100}%`, top: `${state.target.y * 100}%` }}
            className="absolute size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-lg outline-none ring-primary/40 transition-transform hover:scale-110 focus-visible:ring-4 motion-reduce:transition-none sm:size-14"
          />
        )}
      </div>

      {/* The player's own history — kept on this device. */}
      <dl className="mx-auto mt-10 grid max-w-xl grid-cols-3 gap-4 text-center">
        {[
          { label: t("best"), value: stats.bestScore },
          { label: t("played"), value: stats.gamesPlayed },
          { label: t("catches"), value: stats.totalCatches },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-4 text-card-foreground">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
