"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocale } from "next-intl";
import { CHANNELS_DEMO_COPY, channelPreviews } from "@/lib/studio/channels-demo";

/**
 * The landing's channels demo (T-384, from the T-344 v3 redesign): this week's live-projects story as the studio
 * makes it — the card takes each network's image size, the caption is the one the studio writes, with its length
 * against the network's limit. It steps through the networks on first sight; a tap picks one. No icons and no
 * `h2`, so the features contract holds.
 */
export function ChannelsDemo() {
  const locale = useLocale() === "cs" ? "cs" : "en";
  const demo = CHANNELS_DEMO_COPY[locale];
  const previews = channelPreviews(locale);
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    let stopped = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        let i = 0;
        const step = () => {
          if (stopped) return;
          i += 1;
          if (i >= previews.length) return;
          setAt(i);
          timer = window.setTimeout(step, 1800);
        };
        timer = window.setTimeout(step, 1600);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    const stop = () => {
      stopped = true;
      window.clearTimeout(timer);
    };
    el.addEventListener("pointerdown", stop, { once: true });
    return () => {
      observer.disconnect();
      stop();
    };
  }, [previews.length]);

  const p = previews[at]!;
  return (
    <div ref={ref} data-channels-demo className="editorial-card mt-4 grid gap-5 rounded-3xl p-6 sm:p-8 lg:grid-cols-[1fr_1fr] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="editorial-eyebrow">{demo.kicker}</span>
          <p className="text-xs text-muted-foreground">{demo.hint}</p>
        </div>
        <div className="editorial-nets mt-5" role="group">
          {previews.map((c, i) => (
            <button key={c.id} type="button" aria-pressed={i === at} onClick={() => setAt(i)} className="editorial-net">
              {c.label}
            </button>
          ))}
        </div>
        <p data-channel-size className="mt-4 text-xs text-muted-foreground tabular-nums">
          {p.label} · {p.width} × {p.height}
        </p>
        <pre data-channel-caption className="editorial-caption mt-2">{p.caption}</pre>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">{demo.chars(p.caption.length, p.captionMax)}</p>
      </div>
      <div className="editorial-post-stage">
        <div data-channel-card className="editorial-post" style={{ "--ar": `${p.width} / ${p.height}`, "--pw": p.width / p.height < 1 ? "62%" : "100%" } as CSSProperties}>
          <h3 className="text-base font-medium leading-snug sm:text-lg">{p.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.summary}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {p.stats.slice(0, p.width / p.height < 1 ? 2 : 4).map((s) => (
              <div key={s.label} className="min-w-0">
                <dt className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{s.label}</dt>
                <dd className="truncate text-sm font-medium tabular-nums text-primary">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
