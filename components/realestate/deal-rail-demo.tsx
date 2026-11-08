"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocale } from "next-intl";
import { WORKSPACE_COPY, workspaceLocale } from "@/lib/realestate/copy";
import { DEAL_RAIL_DEMO_COPY, railStations } from "@/lib/realestate/deal-rail-demo";

/**
 * The landing's deal rail demo (T-384, from the T-344 v3 redesign): the workspace's own sale rail. A light runs
 * along it station by station and ticks each station's checklist, ending at the keys; tap a station to read its
 * checklist. Stations, items and hints are the Deals screen's own words. No icons and no `h2`, so the features
 * contract holds.
 */
export function DealRailDemo() {
  const locale = workspaceLocale(useLocale());
  const copy = WORKSPACE_COPY[locale];
  const demo = DEAL_RAIL_DEMO_COPY[locale === "sk" ? "sk" : "en"];
  const stations = railStations();
  const last = stations.length - 1;
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(last);
  const [ticked, setTicked] = useState(Number.POSITIVE_INFINITY);
  const [done, setDone] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        setDone(false);
        let t = 300;
        stations.forEach((station, i) => {
          timers.push(window.setTimeout(() => { setAt(i); setTicked(0); }, t));
          station.items.forEach((_, k) => timers.push(window.setTimeout(() => setTicked(k + 1), t + 350 + k * 380)));
          t += 450 + station.items.length * 380 + 400;
        });
        timers.push(window.setTimeout(() => setDone(true), t));
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
    };
    // The stations are a constant of the workspace; the light runs once, on first sight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = stations[at]!;
  return (
    <div ref={ref} data-deal-rail-demo className="editorial-card mt-4 rounded-3xl p-6 sm:p-8" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="editorial-eyebrow">{demo.kicker}</span>
        <p className="text-xs text-muted-foreground">{copy.deals.railHint}</p>
      </div>
      <h3 className="mt-4 text-xl font-medium tracking-tight">{copy.deals.rail}</h3>
      <ol className="editorial-rail mt-6" style={{ "--rail": at / last } as CSSProperties}>
        {stations.map((station, i) => (
          <li key={station.stage}>
            <button
              type="button"
              data-state={i < at || (i === at && done) ? "done" : i === at ? "current" : "ahead"}
              onClick={() => {
                setAt(i);
                setTicked(Number.POSITIVE_INFINITY);
                setDone(true);
              }}
              className="editorial-station"
            >
              <i>{i + 1}</i>
              <span>{copy.stageShort[station.stage]}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="editorial-checklist mt-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
          {copy.stage[current.stage]} · {copy.deals.checklist}
        </p>
        <ul>
          {current.items.map((key, k) => (
            <li key={key} data-done={k < ticked || undefined}>
              {copy.checklist[key]}
            </li>
          ))}
        </ul>
      </div>
      <p data-rail-done={done && at === last ? "" : undefined} className="editorial-rail-done mt-4 text-sm">
        {done && at === last ? demo.done : " "}
      </p>
    </div>
  );
}
