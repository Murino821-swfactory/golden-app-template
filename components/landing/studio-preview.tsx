"use client";

import { useLocale } from "next-intl";
import { landingCopy } from "@/lib/landing/copy";
import { config } from "@/lib/prototype-config";
import { CHANNELS } from "@/lib/studio/channels";
import { studioCopy } from "@/lib/studio/copy";
import { PROJECTS_SNAPSHOT, hostOf, sortProjects } from "@/lib/studio/projects";
import { allEras, recordTotals } from "@/lib/studio/record";
import { projectsContent } from "@/lib/studio/scenarios";
import { cn } from "@/lib/utils";

/**
 * The studio, drawn under the hero headline the way the Indoobit case study ends its hero
 * in the product's dashboard — cut off by the fold, so the page invites a scroll.
 *
 * Everything on it is real: the factory's record totals (`lib/studio/record-data.ts`),
 * the live-projects snapshot `tokenwise.sk/projects` showed on its date, and the five
 * destinations with their own tints. Nothing is invented and nothing is fetched — a
 * landing section never loads Firebase (smoke gate: no console errors).
 */
export function StudioPreview() {
  const locale = useLocale();
  const words = landingCopy(locale);
  const studio = studioCopy(locale);
  const totals = recordTotals(allEras());
  const projects = sortProjects(PROJECTS_SNAPSHOT);
  const caption = projectsContent(projects, studio);
  const figures = [
    { label: words.preview.commits, value: totals.commits.toLocaleString(locale) },
    { label: words.preview.days, value: totals.days.toLocaleString(locale) },
    { label: words.preview.eras, value: totals.eras.toLocaleString(locale) },
  ];
  const tabs = ["projects", "history", "game"] as const;

  return (
    <figure data-studio-preview aria-label={words.hero.previewLabel} className="landing-frame mx-auto w-full max-w-5xl text-left">
      {/* Window chrome: the studio's three scenes and the state of the publish bar. */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-primary" />
          {/* The window's title names the app — the hero's `[data-app-name]` marker. */}
          <span data-app-name className="mr-1 hidden shrink-0 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            {config.appName}
          </span>
          {tabs.map((id, i) => (
            <span
              key={id}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {studio.tabs[id]}
            </span>
          ))}
        </div>
        <span className="shrink-0 rounded-full border border-primary/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-primary">
          {words.preview.ready}
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[0.8fr_1.2fr_1fr]">
        {/* Publish bar first on a phone: it is the promise, and the fold cuts the rest. */}
        <div className="order-first space-y-3 lg:order-none lg:col-start-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{words.preview.publishTo}</p>
          <ul className="flex flex-wrap gap-2">
            {CHANNELS.map((channel, i) => (
              <li
                key={channel.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                  i === 0 ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground"
                )}
              >
                <span aria-hidden className="size-1.5 rounded-full" style={{ background: channel.tint }} />
                {channel.label}
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-border/60 bg-background/60 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{words.preview.caption}</p>
            <p className="mt-1 text-sm font-medium leading-snug">{caption.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{caption.summary}</p>
            <p className="mt-2 truncate text-xs text-primary">{caption.hashtags.join(" ")}</p>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 lg:col-start-1 lg:row-start-1 lg:grid-cols-1">
          <div className="col-span-3 lg:col-span-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{words.preview.record}</p>
          </div>
          {figures.map((figure) => (
            <div key={figure.label} data-preview-figure className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
              <dd className="text-2xl font-semibold tabular-nums text-primary">{figure.value}</dd>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{figure.label}</dt>
            </div>
          ))}
        </dl>

        <div className="lg:col-start-2 lg:row-start-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{words.preview.projects}</p>
          <ul className="mt-2 divide-y divide-border/60 rounded-xl border border-border/60 bg-background/60">
            {projects.slice(0, 4).map((project) => (
              <li key={project.key} data-preview-project className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{project.url ? hostOf(project.url) : project.description}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{studio.projects.likes(project.likeCount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
