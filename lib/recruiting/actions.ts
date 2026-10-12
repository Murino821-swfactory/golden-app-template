/**
 * actions.ts — every change a recruiter can make, as named functions over the store.
 *
 * Each action is the ONE place its rule lives: moving an application appends to its history
 * and logs an activity; creating a placement also marks the application placed; deleting a
 * client cascades to its jobs. Views call these and never mutate the workspace themselves.
 */
import {
  addDays, addMonths, effectiveFeePercent, effectiveGuaranteeDays, emptyWorkspace, fullName, isoDate, newId,
  type Activity, type ActivityType, type Application, type ApplicationStage, type Candidate, type Client, type Interview,
  type InvoiceStatus, type Job, type JobStatus, type Placement, type RejectionReason, type Scorecard, type Settings, type Task, type Workspace,
} from "./model";
import { seedWorkspace } from "./seed";
import { parseWorkspace, replaceWorkspace, update } from "./store";

const now = () => new Date().toISOString();

type Refs = { candidateId?: string | null; jobId?: string | null; clientId?: string | null };

function log(ws: Workspace, type: ActivityType, text: string, refs: Refs = {}): void {
  const activity: Activity = {
    id: newId(), type, text, at: now(),
    candidateId: refs.candidateId ?? null, jobId: refs.jobId ?? null, clientId: refs.clientId ?? null,
  };
  ws.activities.unshift(activity);
  if (activity.candidateId && (type === "call" || type === "email" || type === "meeting" || type === "note")) {
    const candidate = ws.candidates.find((c) => c.id === activity.candidateId);
    if (candidate) candidate.lastContactAt = activity.at;
  }
}

/** Words for the automatic timeline entries — passed in by the caller, so this module
 * stays free of copy. */
export interface ActionLabels {
  stage: (stage: ApplicationStage) => string;
  stageChanged: (stage: string) => string;
  rejected: (reason: string) => string;
  reopened: string;
  placed: (job: string) => string;
  interviewScheduled: (type: string) => string;
  scorecardSaved: string;
  consentGranted: string;
  consentWithdrawn: string;
  anonymized: string;
  addedToJob: (job: string) => string;
  scored: (score: number) => string;
  rejectionReason: (reason: RejectionReason) => string;
  interviewType: (type: Interview["type"]) => string;
}

// ── Clients ───────────────────────────────────────────────────────────────────────────

export type ClientInput = Omit<Client, "id" | "createdAt">;

export function addClient(input: ClientInput): string {
  const id = newId();
  update((ws) => {
    ws.clients.push({ ...input, id, createdAt: now() });
  });
  return id;
}

export function updateClient(id: string, input: Partial<ClientInput>): void {
  update((ws) => {
    const client = ws.clients.find((c) => c.id === id);
    if (client) Object.assign(client, input);
  });
}

export function deleteClient(id: string): void {
  update((ws) => {
    const jobIds = new Set(ws.jobs.filter((j) => j.clientId === id).map((j) => j.id));
    removeJobs(ws, jobIds);
    ws.clients = ws.clients.filter((c) => c.id !== id);
    ws.activities = ws.activities.filter((a) => a.clientId !== id);
  });
}

// ── Jobs ──────────────────────────────────────────────────────────────────────────────

export type JobInput = Omit<Job, "id" | "createdAt">;

export function addJob(input: JobInput): string {
  const id = newId();
  update((ws) => {
    ws.jobs.push({ ...input, id, createdAt: now() });
  });
  return id;
}

export function updateJob(id: string, input: Partial<JobInput>): void {
  update((ws) => {
    const job = ws.jobs.find((j) => j.id === id);
    if (job) Object.assign(job, input);
  });
}

export function setJobStatus(id: string, status: JobStatus): void {
  updateJob(id, { status });
}

function removeJobs(ws: Workspace, jobIds: Set<string>): void {
  const appIds = new Set(ws.applications.filter((a) => jobIds.has(a.jobId)).map((a) => a.id));
  ws.applications = ws.applications.filter((a) => !appIds.has(a.id));
  ws.interviews = ws.interviews.filter((i) => !appIds.has(i.applicationId));
  ws.placements = ws.placements.filter((p) => !jobIds.has(p.jobId));
  ws.tasks = ws.tasks.filter((t) => !t.jobId || !jobIds.has(t.jobId));
  ws.activities = ws.activities.filter((a) => !a.jobId || !jobIds.has(a.jobId));
  ws.jobs = ws.jobs.filter((j) => !jobIds.has(j.id));
}

export function deleteJob(id: string): void {
  update((ws) => removeJobs(ws, new Set([id])));
}

// ── Candidates ────────────────────────────────────────────────────────────────────────

export type CandidateInput = Omit<Candidate, "id" | "createdAt" | "anonymized" | "lastContactAt">;

export function addCandidate(input: CandidateInput): string {
  const id = newId();
  update((ws) => {
    ws.candidates.push({ ...input, id, anonymized: false, lastContactAt: null, createdAt: now() });
  });
  return id;
}

export function updateCandidate(id: string, input: Partial<CandidateInput>): void {
  update((ws) => {
    const candidate = ws.candidates.find((c) => c.id === id);
    if (candidate) Object.assign(candidate, input);
  });
}

export function deleteCandidate(id: string): void {
  update((ws) => {
    const appIds = new Set(ws.applications.filter((a) => a.candidateId === id).map((a) => a.id));
    ws.applications = ws.applications.filter((a) => !appIds.has(a.id));
    ws.interviews = ws.interviews.filter((i) => !appIds.has(i.applicationId));
    ws.placements = ws.placements.filter((p) => p.candidateId !== id);
    ws.tasks = ws.tasks.filter((t) => t.candidateId !== id);
    ws.activities = ws.activities.filter((a) => a.candidateId !== id);
    ws.candidates = ws.candidates.filter((c) => c.id !== id);
  });
}

/** GDPR: keep the statistics, drop the person. The record stays so funnel and placement
 * numbers remain true; everything identifying is replaced. */
export function anonymizeCandidate(id: string, labels: Pick<ActionLabels, "anonymized">, placeholderName: string): void {
  update((ws) => {
    const c = ws.candidates.find((x) => x.id === id);
    if (!c) return;
    c.firstName = placeholderName;
    c.lastName = "";
    c.email = "";
    c.phone = "";
    c.linkedin = "";
    c.cvText = "";
    c.summary = "";
    c.currentCompany = "";
    c.location = "";
    c.tags = [];
    c.anonymized = true;
    c.consent = { status: "withdrawn", grantedAt: null, expiresAt: null };
    ws.activities = ws.activities.filter((a) => a.candidateId !== id || a.type === "stage");
    log(ws, "system", labels.anonymized, { candidateId: id });
  });
}

export function grantConsent(id: string, labels: Pick<ActionLabels, "consentGranted">, today = isoDate(new Date())): void {
  update((ws) => {
    const c = ws.candidates.find((x) => x.id === id);
    if (!c) return;
    c.consent = { status: "granted", grantedAt: today, expiresAt: addMonths(today, ws.settings.consentMonths) };
    log(ws, "system", labels.consentGranted, { candidateId: id });
  });
}

export function withdrawConsent(id: string, labels: Pick<ActionLabels, "consentWithdrawn">): void {
  update((ws) => {
    const c = ws.candidates.find((x) => x.id === id);
    if (!c) return;
    c.consent = { status: "withdrawn", grantedAt: c.consent.grantedAt, expiresAt: null };
    log(ws, "system", labels.consentWithdrawn, { candidateId: id });
  });
}

// ── Applications ──────────────────────────────────────────────────────────────────────

export function addApplication(candidateId: string, jobId: string, labels: Pick<ActionLabels, "addedToJob">): string | null {
  let id: string | null = null;
  update((ws) => {
    if (ws.applications.some((a) => a.candidateId === candidateId && a.jobId === jobId)) return;
    const job = ws.jobs.find((j) => j.id === jobId);
    if (!job) return;
    id = newId();
    const at = now();
    ws.applications.push({ id, candidateId, jobId, stage: "sourced", score: null, history: [{ stage: "sourced", at }], rejection: null, createdAt: at });
    log(ws, "stage", labels.addedToJob(job.title), { candidateId, jobId });
  });
  return id;
}

export function moveApplication(id: string, stage: ApplicationStage, labels: Pick<ActionLabels, "stage" | "stageChanged">): void {
  update((ws) => {
    const app = ws.applications.find((a) => a.id === id);
    if (!app || app.stage === stage) return;
    app.stage = stage;
    app.rejection = null;
    app.history.push({ stage, at: now() });
    log(ws, "stage", labels.stageChanged(labels.stage(stage)), { candidateId: app.candidateId, jobId: app.jobId });
  });
}

export function rejectApplication(id: string, reason: RejectionReason, note: string, labels: Pick<ActionLabels, "rejected" | "rejectionReason">): void {
  update((ws) => {
    const app = ws.applications.find((a) => a.id === id);
    if (!app) return;
    app.stage = "rejected";
    app.rejection = { reason, note };
    app.history.push({ stage: "rejected", at: now() });
    log(ws, "stage", `${labels.rejected(labels.rejectionReason(reason))}${note ? ` — ${note}` : ""}`, { candidateId: app.candidateId, jobId: app.jobId });
  });
}

export function reopenApplication(id: string, labels: Pick<ActionLabels, "reopened">): void {
  update((ws) => {
    const app = ws.applications.find((a) => a.id === id);
    if (!app || app.stage !== "rejected") return;
    // Back to the stage it was in before the rejection.
    const previous = [...app.history].reverse().find((h) => h.stage !== "rejected")?.stage ?? "sourced";
    app.stage = previous;
    app.rejection = null;
    app.history.push({ stage: previous, at: now() });
    log(ws, "stage", labels.reopened, { candidateId: app.candidateId, jobId: app.jobId });
  });
}

export function setApplicationScore(id: string, score: number, labels: Pick<ActionLabels, "scored">): void {
  update((ws) => {
    const app = ws.applications.find((a) => a.id === id);
    if (!app) return;
    app.score = score;
    log(ws, "system", labels.scored(score), { candidateId: app.candidateId, jobId: app.jobId });
  });
}

export function deleteApplication(id: string): void {
  update((ws) => {
    ws.applications = ws.applications.filter((a) => a.id !== id);
    ws.interviews = ws.interviews.filter((i) => i.applicationId !== id);
  });
}

// ── Interviews ────────────────────────────────────────────────────────────────────────

export type InterviewInput = Omit<Interview, "id" | "createdAt" | "scorecard" | "status">;

export function scheduleInterview(input: InterviewInput, labels: Pick<ActionLabels, "interviewScheduled" | "interviewType" | "stage" | "stageChanged">): string {
  const id = newId();
  update((ws) => {
    ws.interviews.push({ ...input, id, status: "scheduled", scorecard: null, createdAt: now() });
    const app = ws.applications.find((a) => a.id === input.applicationId);
    if (!app) return;
    log(ws, "meeting", labels.interviewScheduled(labels.interviewType(input.type)), { candidateId: app.candidateId, jobId: app.jobId });
    // A client interview moves the process into the interview stage, unless it is further.
    const order: ApplicationStage[] = ["sourced", "screening", "submitted", "interview", "offer", "placed"];
    if (input.type === "client" && order.indexOf(app.stage) < order.indexOf("interview") && app.stage !== "rejected") {
      app.stage = "interview";
      app.history.push({ stage: "interview", at: now() });
      log(ws, "stage", labels.stageChanged(labels.stage("interview")), { candidateId: app.candidateId, jobId: app.jobId });
    }
  });
  return id;
}

export function updateInterview(id: string, input: Partial<InterviewInput>): void {
  update((ws) => {
    const i = ws.interviews.find((x) => x.id === id);
    if (i) Object.assign(i, input);
  });
}

export function setInterviewStatus(id: string, status: Interview["status"]): void {
  update((ws) => {
    const i = ws.interviews.find((x) => x.id === id);
    if (i) i.status = status;
  });
}

export function saveScorecard(id: string, scorecard: Scorecard, labels: Pick<ActionLabels, "scorecardSaved">): void {
  update((ws) => {
    const i = ws.interviews.find((x) => x.id === id);
    if (!i) return;
    i.scorecard = scorecard;
    if (i.status === "scheduled") i.status = "done";
    const app = ws.applications.find((a) => a.id === i.applicationId);
    if (app) log(ws, "note", `${labels.scorecardSaved}${scorecard.summary ? ` — ${scorecard.summary}` : ""}`, { candidateId: app.candidateId, jobId: app.jobId });
  });
}

export function deleteInterview(id: string): void {
  update((ws) => {
    ws.interviews = ws.interviews.filter((i) => i.id !== id);
  });
}

// ── Placements ────────────────────────────────────────────────────────────────────────

export interface PlacementInput {
  applicationId: string;
  startDate: string;
  salary: number;
  feePercent: number;
  guaranteeDays: number;
  invoiceStatus: InvoiceStatus;
  markJobFilled: boolean;
}

export function createPlacement(input: PlacementInput, labels: Pick<ActionLabels, "placed" | "stage" | "stageChanged">): string | null {
  let id: string | null = null;
  update((ws) => {
    const app = ws.applications.find((a) => a.id === input.applicationId);
    const job = app && ws.jobs.find((j) => j.id === app.jobId);
    if (!app || !job) return;
    id = newId();
    const placement: Placement = {
      id, applicationId: app.id, candidateId: app.candidateId, jobId: job.id, clientId: job.clientId,
      startDate: input.startDate, salary: input.salary, feePercent: input.feePercent,
      feeAmount: Math.round((input.salary * input.feePercent) / 100), guaranteeDays: input.guaranteeDays,
      guaranteeUntil: addDays(input.startDate, input.guaranteeDays), invoiceStatus: input.invoiceStatus, createdAt: now(),
    };
    ws.placements.push(placement);
    if (app.stage !== "placed") {
      app.stage = "placed";
      app.rejection = null;
      app.history.push({ stage: "placed", at: placement.createdAt });
      log(ws, "stage", labels.stageChanged(labels.stage("placed")), { candidateId: app.candidateId, jobId: job.id });
    }
    log(ws, "system", labels.placed(job.title), { candidateId: app.candidateId, jobId: job.id, clientId: job.clientId });
    if (input.markJobFilled) job.status = "filled";
    const candidate = ws.candidates.find((c) => c.id === app.candidateId);
    if (candidate && !candidate.tags.includes("placed")) candidate.tags.push("placed");
  });
  return id;
}

export function setInvoiceStatus(id: string, invoiceStatus: InvoiceStatus): void {
  update((ws) => {
    const p = ws.placements.find((x) => x.id === id);
    if (p) p.invoiceStatus = invoiceStatus;
  });
}

/** The defaults a placement dialog opens with, from the job, its client and the settings. */
export function placementDefaults(ws: Workspace, app: Application): Pick<PlacementInput, "salary" | "feePercent" | "guaranteeDays"> {
  const job = ws.jobs.find((j) => j.id === app.jobId);
  const client = job && ws.clients.find((c) => c.id === job.clientId);
  const candidate = ws.candidates.find((c) => c.id === app.candidateId);
  const salary = candidate?.salaryExpectation ?? job?.salaryMax ?? job?.salaryMin ?? 0;
  return {
    salary,
    feePercent: job ? effectiveFeePercent(job, client, ws.settings) : ws.settings.defaultFeePercent,
    guaranteeDays: effectiveGuaranteeDays(client, ws.settings),
  };
}

// ── Tasks and notes ───────────────────────────────────────────────────────────────────

export function addTask(input: Omit<Task, "id" | "createdAt" | "done">): string {
  const id = newId();
  update((ws) => {
    ws.tasks.unshift({ ...input, id, done: false, createdAt: now() });
  });
  return id;
}

export function toggleTask(id: string): void {
  update((ws) => {
    const t = ws.tasks.find((x) => x.id === id);
    if (t) t.done = !t.done;
  });
}

export function deleteTask(id: string): void {
  update((ws) => {
    ws.tasks = ws.tasks.filter((t) => t.id !== id);
  });
}

export function addNote(type: ActivityType, text: string, refs: Refs): void {
  if (!text.trim()) return;
  update((ws) => log(ws, type, text.trim(), refs));
}

// ── Settings and the whole workspace ──────────────────────────────────────────────────

export function updateSettings(input: Partial<Settings>): void {
  update((ws) => Object.assign(ws.settings, input));
}

export function resetToDemo(locale: "en" | "sk"): void {
  replaceWorkspace(seedWorkspace(locale));
}

export function wipeWorkspace(locale: "en" | "sk"): void {
  replaceWorkspace(emptyWorkspace(locale));
}

/** Throws when the file is not a workspace export. */
export function importWorkspace(json: string): void {
  replaceWorkspace(parseWorkspace(JSON.parse(json)));
}

/** A candidate's whole file, for a data-access request. */
export function candidateExport(ws: Workspace, id: string): Record<string, unknown> | null {
  const candidate = ws.candidates.find((c) => c.id === id);
  if (!candidate) return null;
  const applications = ws.applications.filter((a) => a.candidateId === id);
  const appIds = new Set(applications.map((a) => a.id));
  return {
    exportedAt: now(),
    candidate: { ...candidate, name: fullName(candidate) },
    applications: applications.map((a) => ({ ...a, job: ws.jobs.find((j) => j.id === a.jobId)?.title ?? null })),
    interviews: ws.interviews.filter((i) => appIds.has(i.applicationId)),
    placements: ws.placements.filter((p) => p.candidateId === id),
    activities: ws.activities.filter((a) => a.candidateId === id),
  };
}
