"use client";

import { useMemo, useState, type DragEvent } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { useActionLabels, useCopy, useLookups, useWorkspace } from "@/hooks/use-workspace";
import { useSelected } from "@/hooks/use-selected";
import { addApplication, moveApplication } from "@/lib/recruiting/actions";
import { STAGES, fullName, type Application, type Stage } from "@/lib/recruiting/model";
import { daysInCurrentStage, isOpenJob, isStale } from "@/lib/recruiting/metrics";
import { cn } from "@/lib/utils";
import { ApplicationDrawer } from "./application-drawer";
import { ActionMenu, Avatar, Checkbox, Dot, Drawer, EmptyState, Field, PageHeader, PrimaryButton, STAGE_TONE, SecondaryButton, Select, scoreTone } from "./ui";
import { useNow } from "./shared";

function Card({ app, showJob, stale, onOpen, onMove }: { app: Application; showJob: boolean; stale: boolean; onOpen: () => void; onMove: (stage: Stage) => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const lookups = useLookups(ws);
  const now = useNow();
  const candidate = lookups.candidate(app.candidateId);
  const job = lookups.job(app.jobId);
  const index = STAGES.indexOf(app.stage as Stage);
  const prev = index > 0 ? STAGES[index - 1] : null;
  const next = index >= 0 && index < STAGES.length - 1 ? STAGES[index + 1] : null;
  if (!candidate || !job) return null;
  const name = fullName(candidate);
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", app.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      data-testid="pipeline-card"
      className="group rounded-xl bg-card p-3 ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/30 motion-reduce:transition-none"
    >
      <div className="flex items-start gap-2">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-ring">
          <Avatar name={name} className="size-8 text-[11px]" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{showJob ? job.title : candidate.title}</span>
          </span>
        </button>
        <ActionMenu
          label={c.pipeline.menu}
          trigger={
            <button type="button" className="-mr-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              <MoreHorizontal aria-hidden className="size-4" />
            </button>
          }
          items={[
            { label: c.common.open, onSelect: onOpen },
            { label: `${c.pipeline.moveForward}${next ? `: ${c.stages[next]}` : ""}`, onSelect: () => next && onMove(next), disabled: !next },
            { label: `${c.pipeline.moveBack}${prev ? `: ${c.stages[prev]}` : ""}`, onSelect: () => prev && onMove(prev), disabled: !prev },
          ]}
        />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset", scoreTone(app.score) === "good" ? "bg-emerald-400/10 text-emerald-200 ring-emerald-400/35" : scoreTone(app.score) === "warn" ? "bg-amber-400/10 text-amber-200 ring-amber-400/35" : scoreTone(app.score) === "bad" ? "bg-rose-400/10 text-rose-200 ring-rose-400/40" : "bg-muted text-muted-foreground ring-foreground/10")}>
          {app.score === null ? c.pipeline.noScore : `${app.score} %`}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          {stale && <Dot tone="warn" />}
          {c.pipeline.daysInStage(daysInCurrentStage(app, now))}
        </span>
      </div>
    </li>
  );
}

function AddToJobDrawer({ open, onOpenChange, jobId }: { open: boolean; onOpenChange: (o: boolean) => void; jobId: string | null }) {
  const ws = useWorkspace();
  const c = useCopy();
  const labels = useActionLabels();
  const jobs = useMemo(() => (ws ? ws.jobs.filter(isOpenJob) : []), [ws]);
  const [job, setJob] = useState(jobId ?? "");
  const [candidate, setCandidate] = useState("");
  const chosenJob = job || jobs[0]?.id || "";
  const candidates = useMemo(() => (ws ? ws.candidates.filter((x) => !x.anonymized && x.consent.status !== "withdrawn") : []), [ws]);
  const chosenCandidate = candidate || candidates[0]?.id || "";
  const exists = ws?.applications.some((a) => a.jobId === chosenJob && a.candidateId === chosenCandidate);
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={c.pipeline.addToJob} closeLabel={c.common.close}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!chosenJob || !chosenCandidate || exists) return;
          addApplication(chosenCandidate, chosenJob, labels);
          onOpenChange(false);
        }}
      >
        <Field label={c.pipeline.chooseCandidate}>
          {(id) => (
            <Select id={id} value={chosenCandidate} onChange={(e) => setCandidate(e.target.value)}>
              {candidates.map((x) => (
                <option key={x.id} value={x.id}>{fullName(x)} · {x.title}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={c.pipeline.chooseJob}>
          {(id) => (
            <Select id={id} value={chosenJob} onChange={(e) => setJob(e.target.value)}>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </Select>
          )}
        </Field>
        {exists && <p className="text-sm text-amber-200">{c.pipeline.alreadyInProcess}</p>}
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={() => onOpenChange(false)}>{c.common.cancel}</SecondaryButton>
          <PrimaryButton type="submit" disabled={!chosenJob || !chosenCandidate || Boolean(exists)}>{c.candidates.detail.addToPipeline}</PrimaryButton>
        </div>
      </form>
    </Drawer>
  );
}

export function PipelineView() {
  const ws = useWorkspace();
  const c = useCopy();
  const labels = useActionLabels();
  const now = useNow();
  const [jobFilter, setJobFilter] = useState("all");
  const [showRejected, setShowRejected] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useSelected("app");
  const [over, setOver] = useState<Stage | null>(null);

  const jobs = useMemo(() => (ws ? ws.jobs.filter((j) => isOpenJob(j) || j.id === jobFilter) : []), [ws, jobFilter]);
  const apps = useMemo(() => {
    if (!ws) return [];
    const open = new Set(ws.jobs.filter(isOpenJob).map((j) => j.id));
    return ws.applications.filter((a) => (jobFilter === "all" ? open.has(a.jobId) : a.jobId === jobFilter)).filter((a) => showRejected || a.stage !== "rejected");
  }, [ws, jobFilter, showRejected]);
  const columns = useMemo(() => {
    const by = new Map<string, Application[]>();
    for (const stage of [...STAGES, "rejected"]) by.set(stage, []);
    for (const a of apps) by.get(a.stage)?.push(a);
    for (const list of by.values()) list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    return by;
  }, [apps]);

  if (!ws) return null;
  const move = (id: string, stage: Stage) => moveApplication(id, stage, labels);
  const drop = (stage: Stage) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) move(id, stage);
  };
  const shownStages: (Stage | "rejected")[] = showRejected ? [...STAGES, "rejected"] : [...STAGES];

  return (
    <div className="space-y-5">
      <PageHeader
        title={c.pipeline.title}
        intro={c.pipeline.intro}
        actions={
          <PrimaryButton onClick={() => setAddOpen(true)}>
            <Plus aria-hidden /> {c.pipeline.addToJob}
          </PrimaryButton>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{c.pipeline.filterJob}</span>
          <Select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="w-auto min-w-48" aria-label={c.pipeline.filterJob}>
            <option value="all">{c.pipeline.allJobs}</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </Select>
        </label>
        <Checkbox label={c.pipeline.showRejected} checked={showRejected} onChange={setShowRejected} />
      </div>

      {apps.length === 0 ? (
        <EmptyState title={c.pipeline.empty} action={<PrimaryButton onClick={() => setAddOpen(true)}>{c.pipeline.addToJob}</PrimaryButton>} />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0" data-testid="pipeline-board">
          <div className="flex min-w-max snap-x gap-3">
            {shownStages.map((stage) => {
              const list = columns.get(stage) ?? [];
              const tone = STAGE_TONE[stage];
              return (
                <section
                  key={stage}
                  aria-label={c.stages[stage]}
                  data-stage={stage}
                  onDragOver={stage !== "rejected" ? (e) => { e.preventDefault(); setOver(stage); } : undefined}
                  onDragLeave={() => setOver(null)}
                  onDrop={stage !== "rejected" ? drop(stage) : undefined}
                  className={cn(
                    "flex w-[272px] shrink-0 snap-start flex-col rounded-2xl bg-background/60 p-2 ring-1 ring-foreground/10 transition-colors motion-reduce:transition-none",
                    over === stage && "ring-2 ring-foreground/60"
                  )}
                >
                  <header className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Dot tone={tone === "neutral" ? "accent" : tone} />
                      {c.stages[stage]}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">{list.length}</span>
                  </header>
                  <p className="px-2 pb-2 text-[11px] text-muted-foreground">{c.stageHints[stage]}</p>
                  <ul className="flex min-h-24 flex-col gap-2">
                    {list.map((app) => (
                      <Card key={app.id} app={app} showJob={jobFilter === "all"} stale={isStale(app, now, ws.settings.staleAfterDays)} onOpen={() => setSelected(app.id)} onMove={(s) => move(app.id, s)} />
                    ))}
                    {list.length === 0 && <li className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">{over === stage ? c.pipeline.dropHint : c.pipeline.emptyColumn}</li>}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {addOpen && <AddToJobDrawer open={addOpen} onOpenChange={setAddOpen} jobId={jobFilter === "all" ? null : jobFilter} />}
      {selected && <ApplicationDrawer applicationId={selected} open onOpenChange={(o) => !o && setSelected(null)} />}
    </div>
  );
}
