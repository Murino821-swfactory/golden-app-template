"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { COPY } from "@/lib/checkin-copy";
import { PILLARS, toggle, type CheckinLog } from "@/lib/checkin-engine";
import { DEMO_TODAY, demoLog, demoState } from "@/lib/checkin-demo";

/**
 * The landing's check-in demo (T-384, from the T-344 v3 redesign), run by the app's own engine: thirteen past days
 * with day 10 missed — the shield earned at day 7 covers it — and today's five pillars for the visitor to tick.
 * Every pillar turns a lamp up; a full day adds a perfect day's XP and extends the streak. The past days switch on
 * one by one on first sight. No icons and no `h2`, so the features contract holds.
 */
export function CheckinDemo() {
  const copy = COPY.en;
  const ref = useRef<HTMLDivElement>(null);
  const [log, setLog] = useState<CheckinLog>(demoLog);
  const [shown, setShown] = useState(Number.POSITIVE_INFINITY);
  const state = demoState(log);
  const today = log[DEMO_TODAY]?.done ?? [];
  const lamp = today.length / PILLARS.length;

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        setShown(0);
        for (let i = 1; i <= 14; i++) timers.push(window.setTimeout(() => setShown(i), 200 + i * 220));
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <div ref={ref} data-checkin-demo className="editorial-card editorial-checkin mt-4 grid gap-5 rounded-3xl p-6 sm:p-8 lg:grid-cols-2" style={{ "--lamp": lamp } as CSSProperties}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="editorial-eyebrow">Demo</span>
          <p className="text-xs text-muted-foreground">Tap your five pillars for today.</p>
        </div>
        <div className="mt-5 grid gap-2" role="group" aria-label="Today's pillars">
          {PILLARS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={today.includes(p.id)}
              onClick={() => setLog((l) => toggle(l, DEMO_TODAY, p.id))}
              className="editorial-pillar"
            >
              {copy.pillars[p.id]}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-1.5 text-xs text-muted-foreground">
          <span data-checkin-level>
            {copy.levelTitle} {state.level.number} · {copy.levelName[state.level.id]} · {state.xp} XP
          </span>
          <span className="editorial-xp" aria-hidden>
            <i style={{ width: `${Math.round(state.level.progress * 100)}%` }} />
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">Your streak</h3>
        <ol className="editorial-streak mt-3" aria-label={`${state.streak.current} days`}>
          {state.days.map((d, i) => (
            <li key={d.day} data-kind={d.kind} data-shown={i < shown || undefined}>
              {i + 1}
            </li>
          ))}
        </ol>
        <p data-checkin-streak className="mt-4 text-sm">
          <b className="text-primary">{state.streak.current}</b> days in a row
          {state.streak.protectedDays.length > 0 ? ` · ${copy.shieldCovered("day 10")}` : ""}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{copy.shieldsHint}</p>
      </div>
    </div>
  );
}
