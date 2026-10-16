"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StudioCopy } from "@/lib/studio/copy";
import {
  GitHubError,
  RECORD_SOURCE,
  allEras,
  commitsOf,
  daysOf,
  fetchRepoCommits,
  groupByWeek,
  isRepoSlug,
  readCachedCommits,
  recordTotals,
  sortErasByCommits,
  writeCachedCommits,
  type Era,
  type WeekDigest,
} from "@/lib/studio/record";
import { cn } from "@/lib/utils";
import { Figure, Segmented } from "./ui";

export type HistoryMode = "record" | "github";

export interface HistoryState {
  mode: HistoryMode;
  eras: Era[];
  repo: string;
  weeks: WeekDigest[];
}

interface Props {
  copy: StudioCopy;
  onChange: (state: HistoryState) => void;
}

/** The public repository the field starts with — the factory's template, which is public. */
const DEFAULT_REPO = "Murino821-swfactory/golden-app-template";

/**
 * Scene 2 — a git history sorted by commits. The bundled record (fifteen eras) is the
 * default and needs no network; a public GitHub repository is read on a click only, so the
 * page never spends the visitor's sixty anonymous requests an hour by itself.
 */
export function HistoryScene({ copy, onChange }: Props) {
  const c = copy.history;
  const [mode, setMode] = useState<HistoryMode>("record");
  const [order, setOrder] = useState<"commits" | "time">("commits");
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [loadedRepo, setLoadedRepo] = useState("");
  const [weeks, setWeeks] = useState<WeekDigest[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eras = allEras();
  const shown = order === "commits" ? sortErasByCommits(eras) : eras;
  const totals = recordTotals(eras);

  useEffect(() => {
    onChange({ mode, eras, repo: loadedRepo, weeks });
    // `eras` is a fresh array each render but its contents are constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loadedRepo, weeks, onChange]);

  async function load() {
    const slug = repo.trim();
    setError(null);
    setNote(null);
    if (!isRepoSlug(slug)) {
      setError(c.errors.invalid);
      return;
    }
    const cached = readCachedCommits(slug);
    if (cached) {
      setWeeks(groupByWeek(cached));
      setLoadedRepo(slug);
      setNote(c.cached);
      if (cached.length === 0) setError(c.noCommits);
      return;
    }
    setBusy(true);
    try {
      const commits = await fetchRepoCommits(slug);
      writeCachedCommits(slug, commits);
      setWeeks(groupByWeek(commits));
      setLoadedRepo(slug);
      if (commits.length === 0) setError(c.noCommits);
    } catch (err) {
      const reason = err instanceof GitHubError ? err.reason : "unavailable";
      setError(c.errors[reason] ?? c.errors.unavailable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="history-scene" data-mode={mode}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{c.heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{c.intro}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label={c.heading}
          value={mode}
          onChange={setMode}
          options={[
            { id: "record", label: c.record },
            { id: "github", label: c.github },
          ]}
        />
        {mode === "record" && (
          <Segmented
            label={c.byCommits}
            value={order}
            onChange={setOrder}
            options={[
              { id: "commits", label: c.byCommits },
              { id: "time", label: c.byTime },
            ]}
          />
        )}
      </div>

      {mode === "record" ? (
        <>
          <dl className="grid grid-cols-3 gap-3">
            <Figure label="commits" value={String(totals.commits)} />
            <Figure label={c.days(totals.days).replace(/^\d+\s*/, "")} value={String(totals.days)} />
            <Figure label={c.era} value={String(totals.eras)} />
          </dl>
          <p className="text-xs text-muted-foreground">{c.recordSource(RECORD_SOURCE.repos.join(" + "), RECORD_SOURCE.asOf)}</p>
          <ol className="space-y-2" aria-label={c.record}>
            {shown.map((era, i) => {
              const commits = commitsOf(era);
              const width = Math.max(4, Math.round((commits / (commitsOf(sortErasByCommits(eras)[0]) || 1)) * 100));
              return (
                <li key={era.numeral} className="rounded-lg border border-border/60 bg-card p-3" data-testid="era" data-commits={commits}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                      <span className="mr-2 text-muted-foreground">
                        {order === "commits" ? `#${i + 1}` : era.numeral}
                      </span>
                      {era.title}
                    </h3>
                    <span className="shrink-0 text-sm tabular-nums text-primary">{c.commits(commits)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {era.dates} · {c.days(daysOf(era))} · {era.tagline}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className={cn("h-full rounded-full", era.kind === "human" ? "bg-amber-400" : "bg-primary")} style={{ width: `${width}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">{c.repoLabel}</span>
              <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder={c.repoPlaceholder} spellCheck={false} autoCapitalize="none" />
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? c.loading : c.load}
            </Button>
          </form>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {note && !error && <p className="text-xs text-muted-foreground">{note}</p>}
          {weeks.length > 0 && (
            <ol className="space-y-2" aria-label={loadedRepo}>
              {weeks.map((w, i) => (
                <li key={w.weekStart} className="rounded-lg border border-border/60 bg-card p-3" data-testid="week" data-commits={w.commits}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                      <span className="mr-2 text-muted-foreground">#{i + 1}</span>
                      {c.weekOf(w.weekStart)}
                    </h3>
                    <span className="shrink-0 text-sm tabular-nums text-primary">{c.commits(w.commits)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.authors(w.authors.length)}</p>
                  <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {w.messages.slice(0, 3).map((m, j) => (
                      <li key={j} className="truncate">
                        · {m}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
