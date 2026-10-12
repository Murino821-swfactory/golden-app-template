"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { analyzeCv } from "@/lib/cv-analyzer";
import { defaultJobRoles } from "@/lib/job-library";
import { useActionLabels, useCopy, useLookups, useRecruitingLocale, useWorkspace } from "@/hooks/use-workspace";
import { useSelected } from "@/hooks/use-selected";
import { addApplication, addJob, deleteJob, setJobStatus, updateJob, type JobInput } from "@/lib/recruiting/actions";
import { parseList } from "@/lib/recruiting/extract";
import {
  EMPLOYMENT_TYPES, JOB_PRIORITIES, JOB_STATUSES, STAGES, WORK_MODES, daysBetween, effectiveFeePercent, fullName, isoDate, salaryMid,
  type EmploymentType, type Job, type JobPriority, type JobStatus, type WorkMode,
} from "@/lib/recruiting/model";
import { TERMINAL, formatDate, formatMoney, stageCounts } from "@/lib/recruiting/metrics";
import { ApplicationDrawer } from "./application-drawer";
import {
  ActionMenu, ConfirmDialog, DataList, Dot, Drawer, EmptyState, Field, FormRow, PageHeader, Pill, PrimaryButton, STAGE_TONE, SecondaryButton, Select, TextArea, TextButton, TextInput, type Column, type Tone,
} from "./ui";
import { Chips, Definition, ScorePill, StagePill, Timeline, useNow } from "./shared";

const STATUS_TONE: Record<JobStatus, Tone> = { open: "good", "on-hold": "warn", filled: "info", cancelled: "neutral" };
const PRIORITY_TONE: Record<JobPriority, Tone> = { low: "neutral", normal: "neutral", high: "warn", urgent: "bad" };

// ── Form ──────────────────────────────────────────────────────────────────────────────

type Draft = Omit<JobInput, "salaryMin" | "salaryMax" | "feePercent" | "mustHave" | "niceToHave" | "deadline"> & {
  salaryMin: string; salaryMax: string; feePercent: string; mustHave: string; niceToHave: string; deadline: string;
};

function toDraft(job?: Job, clientId?: string): Draft {
  return {
    clientId: job?.clientId ?? clientId ?? "", title: job?.title ?? "", location: job?.location ?? "", workMode: job?.workMode ?? "hybrid",
    employment: job?.employment ?? "permanent", salaryMin: job?.salaryMin?.toString() ?? "", salaryMax: job?.salaryMax?.toString() ?? "",
    feePercent: job?.feePercent?.toString() ?? "", status: job?.status ?? "open", priority: job?.priority ?? "normal",
    openedAt: job?.openedAt ?? isoDate(new Date()), deadline: job?.deadline ?? "", description: job?.description ?? "",
    mustHave: job?.mustHave.join(", ") ?? "", niceToHave: job?.niceToHave.join(", ") ?? "", owner: job?.owner ?? "",
  };
}

export function JobFormDrawer({ open, onOpenChange, job, clientId, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; job?: Job; clientId?: string; onSaved?: (id: string) => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useRecruitingLocale();
  const [draft, setDraft] = useState<Draft>(() => toDraft(job, clientId));
  const [libraryRole, setLibraryRole] = useState("");
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const roles = useMemo(() => defaultJobRoles(locale), [locale]);
  if (!ws) return null;
  const chosenClient = draft.clientId || ws.clients[0]?.id || "";

  function submit() {
    if (!draft.title.trim() || !chosenClient) return;
    const input: JobInput = {
      clientId: chosenClient, title: draft.title.trim(), location: draft.location.trim(), workMode: draft.workMode, employment: draft.employment,
      salaryMin: draft.salaryMin ? Number(draft.salaryMin) : null, salaryMax: draft.salaryMax ? Number(draft.salaryMax) : null,
      feePercent: draft.feePercent ? Number(draft.feePercent) : null, status: draft.status, priority: draft.priority, openedAt: draft.openedAt || isoDate(new Date()),
      deadline: draft.deadline || null, description: draft.description, mustHave: parseList(draft.mustHave), niceToHave: parseList(draft.niceToHave), owner: draft.owner.trim(),
    };
    const id = job ? (updateJob(job.id, input), job.id) : addJob(input);
    onOpenChange(false);
    onSaved?.(id);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={job ? c.jobs.editTitle : c.jobs.addTitle}
      closeLabel={c.common.close}
      wide
      footer={
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={() => onOpenChange(false)}>{c.common.cancel}</SecondaryButton>
          <PrimaryButton form="job-form" type="submit" disabled={!draft.title.trim() || !chosenClient}>{c.common.save}</PrimaryButton>
        </div>
      }
    >
      <form id="job-form" className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="flex flex-col gap-2 rounded-xl bg-background/60 p-3 ring-1 ring-foreground/10 sm:flex-row sm:items-center">
          <Select aria-label={c.jobs.form.library} value={libraryRole} onChange={(e) => setLibraryRole(e.target.value)} className="flex-1">
            <option value="">{c.jobs.form.library}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </Select>
          <SecondaryButton
            disabled={!libraryRole}
            onClick={() => {
              const role = roles.find((r) => r.id === libraryRole);
              if (role) setDraft((d) => ({ ...d, title: d.title || role.title, description: role.description }));
            }}
          >
            {c.common.add}
          </SecondaryButton>
        </div>
        <FormRow>
          <Field label={c.jobs.form.title} required>{(id) => <TextInput id={id} required value={draft.title} onChange={(e) => set("title", e.target.value)} />}</Field>
          <Field label={c.jobs.form.client} required>
            {(id) => (
              <Select id={id} value={chosenClient} onChange={(e) => set("clientId", e.target.value)}>
                {ws.clients.map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={c.jobs.form.location}>{(id) => <TextInput id={id} value={draft.location} onChange={(e) => set("location", e.target.value)} />}</Field>
          <Field label={c.jobs.form.workMode}>
            {(id) => (
              <Select id={id} value={draft.workMode} onChange={(e) => set("workMode", e.target.value as WorkMode)}>
                {WORK_MODES.map((m) => <option key={m} value={m}>{c.workMode[m]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={c.jobs.form.employment}>
            {(id) => (
              <Select id={id} value={draft.employment} onChange={(e) => set("employment", e.target.value as EmploymentType)}>
                {EMPLOYMENT_TYPES.map((m) => <option key={m} value={m}>{c.employment[m]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={c.jobs.form.priority}>
            {(id) => (
              <Select id={id} value={draft.priority} onChange={(e) => set("priority", e.target.value as JobPriority)}>
                {JOB_PRIORITIES.map((p) => <option key={p} value={p}>{c.priority[p]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={c.jobs.form.salaryMin}>{(id) => <TextInput id={id} type="number" min={0} step={100} value={draft.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} />}</Field>
          <Field label={c.jobs.form.salaryMax}>{(id) => <TextInput id={id} type="number" min={0} step={100} value={draft.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} />}</Field>
          <Field label={c.jobs.form.fee} hint={c.jobs.form.feeHint}>{(id) => <TextInput id={id} type="number" min={0} max={100} step={0.5} value={draft.feePercent} onChange={(e) => set("feePercent", e.target.value)} />}</Field>
          <Field label={c.jobs.form.status}>
            {(id) => (
              <Select id={id} value={draft.status} onChange={(e) => set("status", e.target.value as JobStatus)}>
                {JOB_STATUSES.map((s) => <option key={s} value={s}>{c.jobStatus[s]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={c.jobs.form.openedAt}>{(id) => <TextInput id={id} type="date" value={draft.openedAt} onChange={(e) => set("openedAt", e.target.value)} />}</Field>
          <Field label={c.jobs.form.deadline}>{(id) => <TextInput id={id} type="date" value={draft.deadline} onChange={(e) => set("deadline", e.target.value)} />}</Field>
          <Field label={c.jobs.form.owner}>{(id) => <TextInput id={id} value={draft.owner} onChange={(e) => set("owner", e.target.value)} />}</Field>
        </FormRow>
        <Field label={c.jobs.form.mustHave} hint={c.jobs.form.listHint}>{(id) => <TextInput id={id} value={draft.mustHave} onChange={(e) => set("mustHave", e.target.value)} />}</Field>
        <Field label={c.jobs.form.niceToHave} hint={c.jobs.form.listHint}>{(id) => <TextInput id={id} value={draft.niceToHave} onChange={(e) => set("niceToHave", e.target.value)} />}</Field>
        <Field label={c.jobs.form.description} hint={c.jobs.form.descriptionHint}>{(id) => <TextArea id={id} value={draft.description} onChange={(e) => set("description", e.target.value)} className="min-h-48 font-mono text-xs" spellCheck={false} />}</Field>
      </form>
    </Drawer>
  );
}

// ── Detail ────────────────────────────────────────────────────────────────────────────

function JobDetail({ job, onEdit, onClose }: { job: Job; onEdit: () => void; onClose: () => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useLocale();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const now = useNow();
  const [appId, setAppId] = useState<string | null>(null);
  const [showMatches, setShowMatches] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const client = lookups.client(job.clientId);
  const apps = useMemo(() => (ws ? ws.applications.filter((a) => a.jobId === job.id) : []), [ws, job.id]);
  const activities = useMemo(() => (ws ? ws.activities.filter((a) => a.jobId === job.id) : []), [ws, job.id]);
  const matches = useMemo(() => {
    if (!ws || !showMatches || !job.description.trim()) return [];
    const inProcess = new Set(apps.map((a) => a.candidateId));
    return ws.candidates
      .filter((x) => !inProcess.has(x.id) && !x.anonymized && x.consent.status !== "withdrawn" && x.cvText.trim())
      .map((x) => ({ candidate: x, score: analyzeCv(x.cvText, job.description)?.score ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [ws, showMatches, job.description, apps]);

  if (!ws) return null;
  const fee = effectiveFeePercent(job, client, ws.settings);
  const mid = salaryMid(job);
  const money = (n: number) => formatMoney(n, ws.settings.currency, locale);
  const counts = stageCounts(apps);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={STATUS_TONE[job.status]}>{c.jobStatus[job.status]}</Pill>
            <Pill tone={PRIORITY_TONE[job.priority]}>{c.priority[job.priority]}</Pill>
            <span className="text-xs text-muted-foreground">{c.jobs.detail.daysOpen(Math.max(0, daysBetween(job.openedAt, isoDate(now))))}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{[client?.name, job.location, c.workMode[job.workMode], c.employment[job.employment]].filter(Boolean).join(" · ")}</p>
        </div>
        <ActionMenu
          label={c.common.actions}
          trigger={
            <button type="button" className="inline-flex size-11 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground">
              <MoreHorizontal aria-hidden className="size-5" />
            </button>
          }
          items={[
            { label: c.common.edit, onSelect: onEdit },
            { label: c.jobs.detail.markFilled, onSelect: () => setJobStatus(job.id, "filled"), disabled: job.status === "filled" },
            { label: c.jobs.detail.putOnHold, onSelect: () => setJobStatus(job.id, "on-hold"), disabled: job.status === "on-hold" },
            { label: c.jobs.detail.reopen, onSelect: () => setJobStatus(job.id, "open"), disabled: job.status === "open" },
            { label: c.jobs.detail.cancel, onSelect: () => setJobStatus(job.id, "cancelled"), disabled: job.status === "cancelled" },
            { label: c.common.delete, onSelect: () => setConfirmDelete(true), tone: "danger" },
          ]}
        />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Definition label={c.jobs.detail.salary}>{job.salaryMin !== null || job.salaryMax !== null ? `${job.salaryMin !== null ? money(job.salaryMin) : ""}${job.salaryMin !== null && job.salaryMax !== null ? " – " : ""}${job.salaryMax !== null ? money(job.salaryMax) : ""}` : c.common.none}</Definition>
        <Definition label={c.jobs.detail.feeEstimate}>{mid === null ? c.common.none : `${money(Math.round((mid * fee) / 100))} · ${fee} %`}</Definition>
        <Definition label={c.jobs.detail.deadline}>{job.deadline ? formatDate(job.deadline, locale) : c.common.none}</Definition>
        <Definition label={c.jobs.form.openedAt}>{formatDate(job.openedAt, locale)}</Definition>
        <Definition label={c.jobs.form.owner}>{job.owner || c.common.none}</Definition>
        <Definition label={c.jobs.form.client}>{client?.contactName || c.common.none}</Definition>
      </dl>

      <section className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">{c.jobs.detail.mustHave}</p>
          {job.mustHave.length ? <Chips items={job.mustHave} tone="accent" /> : <p className="text-sm text-muted-foreground">{c.common.none}</p>}
        </div>
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">{c.jobs.detail.niceToHave}</p>
          {job.niceToHave.length ? <Chips items={job.niceToHave} /> : <p className="text-sm text-muted-foreground">{c.common.none}</p>}
        </div>
      </section>

      <section className="space-y-3" data-testid="job-pipeline">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{c.jobs.detail.pipeline}</h3>
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {STAGES.map((s) => (
              <span key={s} className="inline-flex items-center gap-1"><Dot tone={STAGE_TONE[s] === "neutral" ? "accent" : STAGE_TONE[s]} />{counts[s]}</span>
            ))}
          </span>
        </div>
        {apps.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.pipeline.empty}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
            {[...apps].sort((a, b) => STAGES.indexOf(b.stage as never) - STAGES.indexOf(a.stage as never) || (b.score ?? -1) - (a.score ?? -1)).map((a) => {
              const cand = lookups.candidate(a.candidateId);
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => setAppId(a.id)} className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/40">
                    <span className="min-w-0 font-medium">{cand ? fullName(cand) : "?"}<span className="font-normal text-muted-foreground"> · {cand?.title}</span></span>
                    <span className="flex items-center gap-2"><ScorePill score={a.score} /><StagePill stage={a.stage} /></span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{c.jobs.detail.matches}</h3>
          {!showMatches && (
            <SecondaryButton onClick={() => setShowMatches(true)} disabled={!job.description.trim()}>
              <Sparkles aria-hidden /> {c.jobs.detail.findMatches}
            </SecondaryButton>
          )}
        </div>
        {showMatches && (
          <>
            <p className="text-xs text-muted-foreground">{c.jobs.detail.matchesIntro}</p>
            {matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.jobs.detail.noMatches}</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10" data-testid="job-matches">
                {matches.map(({ candidate, score }) => (
                  <li key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                    <span className="min-w-0 font-medium">{fullName(candidate)}<span className="font-normal text-muted-foreground"> · {candidate.title}</span></span>
                    <span className="flex items-center gap-2">
                      <ScorePill score={score} />
                      <TextButton onClick={() => addApplication(candidate.id, job.id, labels)}>
                        <Plus aria-hidden /> {c.jobs.detail.addToPipeline}
                      </TextButton>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <details className="group rounded-xl ring-1 ring-foreground/10">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">{c.jobs.detail.description}</summary>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t border-border px-3 py-3 font-mono text-xs leading-relaxed">{job.description || c.common.none}</pre>
      </details>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{c.jobs.detail.timeline}</h3>
        <Timeline activities={activities} refs={{ jobId: job.id, clientId: job.clientId }} empty={c.jobs.detail.noActivity} />
      </section>

      {appId && <ApplicationDrawer applicationId={appId} open onOpenChange={(o) => !o && setAppId(null)} />}
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={c.common.delete} text={c.jobs.detail.deleteConfirm} confirmLabel={c.common.delete} cancelLabel={c.common.cancel} destructive onConfirm={() => { deleteJob(job.id); onClose(); }} />
    </div>
  );
}

// ── List ──────────────────────────────────────────────────────────────────────────────

export function JobsView() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useLocale();
  const now = useNow();
  const lookups = useLookups(ws);
  const [status, setStatus] = useState<"all" | JobStatus>("open");
  const [clientFilter, setClientFilter] = useState("all");
  const [selected, setSelected] = useSelected("id");
  const [form, setForm] = useState<{ job?: Job } | null>(null);

  const perJob = useMemo(() => {
    const by = new Map<string, { live: number; counts: Record<string, number> }>();
    for (const a of ws?.applications ?? []) {
      const row = by.get(a.jobId) ?? { live: 0, counts: {} };
      if (!TERMINAL.has(a.stage)) row.live += 1;
      row.counts[a.stage] = (row.counts[a.stage] ?? 0) + 1;
      by.set(a.jobId, row);
    }
    return by;
  }, [ws]);
  const rows = useMemo(() => {
    if (!ws) return [];
    const order: Record<JobPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    return ws.jobs
      .filter((j) => status === "all" || j.status === status)
      .filter((j) => clientFilter === "all" || j.clientId === clientFilter)
      .sort((a, b) => order[a.priority] - order[b.priority] || b.openedAt.localeCompare(a.openedAt));
  }, [ws, status, clientFilter]);

  if (!ws) return null;
  const selectedJob = selected ? ws.jobs.find((j) => j.id === selected) : undefined;
  const feeOf = (j: Job) => {
    const mid = salaryMid(j);
    return mid === null ? null : Math.round((mid * effectiveFeePercent(j, lookups.client(j.clientId), ws.settings)) / 100);
  };

  const columns: Column<Job>[] = [
    { key: "title", label: c.jobs.columns.title, render: (j) => <span className="min-w-0"><span className="block font-medium">{j.title}</span><span className="block text-xs text-muted-foreground">{[j.location, c.workMode[j.workMode]].filter(Boolean).join(" · ")}</span></span> },
    { key: "client", label: c.jobs.columns.client, render: (j) => <span className="text-muted-foreground">{lookups.client(j.clientId)?.name ?? c.common.none}</span> },
    { key: "status", label: c.jobs.columns.status, render: (j) => <Pill tone={STATUS_TONE[j.status]}>{c.jobStatus[j.status]}</Pill> },
    { key: "priority", label: c.jobs.columns.priority, render: (j) => <Pill tone={PRIORITY_TONE[j.priority]}>{c.priority[j.priority]}</Pill>, className: "hidden xl:table-cell" },
    { key: "pipeline", label: c.jobs.columns.pipeline, render: (j) => {
      const row = perJob.get(j.id);
      return (
        <span className="flex flex-wrap gap-x-2 text-xs tabular-nums text-muted-foreground">
          {STAGES.map((s) => (row?.counts[s] ? <span key={s} className="inline-flex items-center gap-1"><Dot tone={STAGE_TONE[s] === "neutral" ? "accent" : STAGE_TONE[s]} />{row.counts[s]}</span> : null))}
          {!row?.live && <span>0</span>}
        </span>
      );
    } },
    { key: "fee", label: c.jobs.columns.fee, render: (j) => { const f = feeOf(j); return <span className="tabular-nums">{f === null ? c.common.none : formatMoney(f, ws.settings.currency, locale)}</span>; }, className: "hidden lg:table-cell" },
    { key: "opened", label: c.jobs.columns.opened, render: (j) => <span className="text-muted-foreground">{c.jobs.detail.daysOpen(Math.max(0, daysBetween(j.openedAt, isoDate(now))))}</span>, className: "hidden lg:table-cell" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={c.jobs.title} intro={c.jobs.intro} actions={<PrimaryButton onClick={() => setForm({})}><Plus aria-hidden /> {c.jobs.add}</PrimaryButton>} />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select aria-label={c.jobs.filters.status} value={status} onChange={(e) => setStatus(e.target.value as "all" | JobStatus)} className="sm:w-48">
          <option value="all">{c.jobs.filters.status}: {c.common.all}</option>
          {JOB_STATUSES.map((s) => <option key={s} value={s}>{c.jobStatus[s]}</option>)}
        </Select>
        <Select aria-label={c.jobs.filters.client} value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="sm:w-56">
          <option value="all">{c.jobs.filters.client}: {c.common.all}</option>
          {ws.clients.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </Select>
        <span className="text-sm text-muted-foreground">{c.jobs.count(rows.length)}</span>
      </div>

      {ws.jobs.length === 0 ? (
        <EmptyState title={c.jobs.empty} action={<PrimaryButton onClick={() => setForm({})}>{c.jobs.add}</PrimaryButton>} />
      ) : rows.length === 0 ? (
        <EmptyState title={c.jobs.noMatches} />
      ) : (
        <DataList
          rows={rows}
          columns={columns}
          onOpen={(j) => setSelected(j.id)}
          openLabel={c.common.open}
          ariaLabel={c.jobs.title}
          renderCard={(j) => (
            <span className="block">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{j.title}</span>
                <Pill tone={STATUS_TONE[j.status]}>{c.jobStatus[j.status]}</Pill>
              </span>
              <span className="block text-sm text-muted-foreground">{lookups.client(j.clientId)?.name}{j.location ? ` · ${j.location}` : ""}</span>
              <span className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{perJob.get(j.id)?.live ?? 0} · {c.jobs.columns.pipeline.toLowerCase()}</span>
                <span>{(() => { const f = feeOf(j); return f === null ? "" : formatMoney(f, ws.settings.currency, locale); })()}</span>
              </span>
            </span>
          )}
        />
      )}

      {selectedJob && (
        <Drawer open onOpenChange={(o) => !o && setSelected(null)} title={selectedJob.title} closeLabel={c.common.close} wide>
          <JobDetail job={selectedJob} onEdit={() => setForm({ job: selectedJob })} onClose={() => setSelected(null)} />
        </Drawer>
      )}
      {form && <JobFormDrawer key={form.job?.id ?? "new"} open onOpenChange={(o) => !o && setForm(null)} job={form.job} onSaved={(id) => setSelected(id)} />}
    </div>
  );
}
