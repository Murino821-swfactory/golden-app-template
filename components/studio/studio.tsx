"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { useRecords } from "@/hooks/use-records";
import { localePath } from "@/lib/locale-routing";
import type { Channel, ScenarioContent, ScenarioId } from "@/lib/studio/channels";
import { studioCopy } from "@/lib/studio/copy";
import type { LiveProject } from "@/lib/studio/projects";
import { useBrowserValue } from "@/lib/studio/client-store";
import { appendPublishLog, usePublishLog, type PublishLogEntry, type PublishOutcome } from "@/lib/studio/publish";
import { gameContent, projectsContent, recordContent, repoContent } from "@/lib/studio/scenarios";
import type { GameScore } from "@/lib/studio/ship-it";
import { cn } from "@/lib/utils";
import { GameScene, type GameClip } from "./game-scene";
import { HistoryScene, type HistoryState } from "./history-scene";
import { ProjectsScene } from "./projects-scene";
import { PublishBar } from "./publish-bar";

const TABS: ScenarioId[] = ["projects", "history", "game"];

/** Until the browser says otherwise — the published address of this page. */
const FALLBACK_PAGE_URL = "https://apps.tokenwise.sk/newapp/gitpulse-studio/studio";

/** The grid's `type` option each channel files under (prototype.config.json → dataGrid). */
const QUEUE_TYPE: Record<Channel["id"], string> = {
  site: "Blog",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

/**
 * The studio: three scenes, one publish bar. Every scene is mounted once and hidden when
 * another is on screen, so the projects stay loaded, the repository stays read and the
 * game keeps its score while the visitor switches; only the game's loop pauses.
 */
export function Studio() {
  const locale = useLocale();
  const copy = studioCopy(locale);
  const { user } = useAuth();
  const { addRecord } = useRecords();
  const [tab, setTab] = useState<ScenarioId>("projects");
  const [contents, setContents] = useState<Partial<Record<ScenarioId, ScenarioContent>>>({});
  const [clip, setClip] = useState<GameClip | null>(null);
  // The page's own address goes into the game's caption; the log is this browser's.
  const pageUrl = useBrowserValue(() => window.location.origin + window.location.pathname, FALLBACK_PAGE_URL);
  const log = usePublishLog();
  const [queued, setQueued] = useState(false);

  const onProjects = useCallback((projects: LiveProject[]) => {
    setContents((prev) => ({ ...prev, projects: projectsContent(projects, copy) }));
  }, [copy]);

  const onHistory = useCallback((state: HistoryState) => {
    const content = state.mode === "github" && state.weeks.length > 0 ? repoContent(state.repo, state.weeks, copy) : recordContent(state.eras, copy);
    setContents((prev) => ({ ...prev, history: content }));
  }, [copy]);

  const onScore = useCallback((score: GameScore, best: number) => {
    setContents((prev) => ({ ...prev, game: gameContent(score, best, pageUrl, copy) }));
  }, [copy, pageUrl]);

  const onPublished = useCallback(
    async (channel: Channel, content: ScenarioContent, outcome: PublishOutcome) => {
      const entry: PublishLogEntry = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        at: new Date().toISOString(),
        channel: channel.id,
        scenario: content.scenario,
        title: content.title,
        outcome,
      };
      appendPublishLog(entry);
      setQueued(false);
      if (!user || outcome === "failed" || outcome === "cancelled") return;
      const today = new Date().toISOString().slice(0, 10);
      try {
        await addRecord({
          title: content.title.slice(0, 200),
          week: today,
          repository: content.url.replace(/^https?:\/\//, "").slice(0, 200),
          type: QUEUE_TYPE[channel.id],
          status: "Published",
          publishedAt: today,
        });
        setQueued(true);
      } catch (err) {
        console.warn("[studio] content queue write failed:", err);
      }
    },
    [user, addRecord]
  );

  const content = contents[tab] ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">{copy.kicker}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{copy.intro}</p>
      </header>

      <div role="tablist" aria-label={copy.title} className="flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card p-1">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {copy.tabs[id]}
          </button>
        ))}
      </div>

      <section id="panel-projects" role="tabpanel" aria-labelledby="tab-projects" hidden={tab !== "projects"}>
        <ProjectsScene copy={copy} onChange={onProjects} />
      </section>
      <section id="panel-history" role="tabpanel" aria-labelledby="tab-history" hidden={tab !== "history"}>
        <HistoryScene copy={copy} onChange={onHistory} />
      </section>
      <section id="panel-game" role="tabpanel" aria-labelledby="tab-game" hidden={tab !== "game"}>
        <GameScene copy={copy} active={tab === "game"} onScore={onScore} onClip={setClip} />
      </section>

      <PublishBar copy={copy} content={content} clip={tab === "game" ? clip : null} pageUrl={pageUrl} onPublished={onPublished} />

      <section aria-labelledby="log-heading" className="space-y-2">
        <h2 id="log-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.publish.log}
        </h2>
        {user ? (
          <p className="text-xs text-muted-foreground">
            {queued ? `${copy.publish.queueSaved} ` : ""}
            <Link href={localePath(locale, "/dashboard")} className="text-primary underline-offset-4 hover:underline">
              {copy.publish.queueOpen}
            </Link>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            <Link href={localePath(locale, "/login")} className="text-primary underline-offset-4 hover:underline">
              {copy.publish.queueSignIn}
            </Link>
          </p>
        )}
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.publish.logEmpty}</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card text-sm" data-testid="publish-log">
            {log.slice(0, 10).map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2">
                <span className="text-xs tabular-nums text-muted-foreground">{e.at.slice(0, 16).replace("T", " ")}</span>
                <span className="font-medium">{copy.tabs[e.scenario]}</span>
                <span className="text-muted-foreground">→ {e.channel === "site" ? "tokenwise.sk" : e.channel}</span>
                <span className="w-full truncate text-xs text-muted-foreground sm:w-auto sm:flex-1">{e.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
