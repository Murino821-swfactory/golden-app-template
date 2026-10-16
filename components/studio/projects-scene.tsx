"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { StudioCopy } from "@/lib/studio/copy";
import { PROJECTS_SNAPSHOT, PROJECTS_SNAPSHOT_AS_OF, hostOf, loadLiveProjects, projectsSummary, shortDescription, sortProjects, type LiveProject } from "@/lib/studio/projects";
import { Figure } from "./ui";

type Source = "loading" | "live" | "snapshot";

/** Firestore gets this long before the snapshot is declared the answer. */
const LIVE_TIMEOUT_MS = 8000;

interface Props {
  copy: StudioCopy;
  onChange: (projects: LiveProject[]) => void;
}

/**
 * Scene 1 — every live project, as tokenwise.sk/projects lists them. Opens on the bundled
 * snapshot so the first paint is never empty, then swaps in Firestore's answer.
 */
export function ProjectsScene({ copy, onChange }: Props) {
  const c = copy.projects;
  const [projects, setProjects] = useState<LiveProject[]>(() => sortProjects(PROJECTS_SNAPSHOT));
  // No Firebase (a local or gated build) means no live list — the snapshot is the answer
  // from the first paint, instead of the SDK waiting for a backend never configured. The
  // variable is baked in at build time, so server and client agree.
  const [source, setSource] = useState<Source>(() => (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "loading" : "snapshot"));

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return;
    let cancelled = false;
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), LIVE_TIMEOUT_MS));
    Promise.race([loadLiveProjects(), timeout])
      .then((list) => {
        if (cancelled) return;
        if (list.length > 0) {
          setProjects(sortProjects(list));
          setSource("live");
        } else {
          setSource("snapshot");
        }
      })
      .catch((err: unknown) => {
        // Expected in a local or gated build without Firebase; the snapshot stays.
        console.warn("[studio] live projects unavailable:", err instanceof Error ? err.message : err);
        if (!cancelled) setSource("snapshot");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onChange(projects);
  }, [projects, onChange]);

  const summary = projectsSummary(projects);

  return (
    <div className="space-y-6" data-testid="projects-scene" data-source={source}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{c.heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{c.intro}</p>
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {source === "loading" ? c.loading : source === "live" ? c.live : c.snapshot(PROJECTS_SNAPSHOT_AS_OF)}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label={c.statProjects} value={String(summary.count)} />
        <Figure label={c.statLikes} value={String(summary.likes)} />
        <Figure label={c.statOwners} value={String(summary.owners)} />
        <Figure label={c.statNewest} value={summary.newest?.name ?? "—"} small />
      </dl>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={c.heading}>
        {projects.map((p) => (
          <li key={p.key}>
            <Card className="h-full">
              <CardContent className="flex h-full flex-col gap-2 pt-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="truncate text-base font-semibold" title={p.name}>
                    {p.name}
                  </h3>
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{c.likes(p.likeCount)}</span>
                </div>
                {p.description && <p className="text-sm text-muted-foreground">{shortDescription(p.description)}</p>}
                <p className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
                  {p.creatorName && (
                    <span>
                      {c.createdBy} <span className="text-foreground">{p.creatorName}</span>
                    </span>
                  )}
                  {p.ownerName && (
                    <span>
                      {c.ownedBy} <span className="text-foreground">{p.ownerName}</span>
                    </span>
                  )}
                </p>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {c.visit} · {hostOf(p.url)}
                  </a>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
