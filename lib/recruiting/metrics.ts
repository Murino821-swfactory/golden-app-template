/**
 * metrics.ts — the numbers on the overview and the reports, as pure functions of a
 * workspace and a clock. Nothing here reads the store or the DOM; `tests/recruiting-logic.spec.ts`
 * feeds it a seeded workspace and a fixed date.
 */
import {
  STAGES, daysBetween, effectiveFeePercent, isoDate, salaryMid, type Application, type ApplicationStage, type Job,
  type Source, type Stage, type Workspace,
} from "./model";

export const TERMINAL: ReadonlySet<ApplicationStage> = new Set(["placed", "rejected"]);

export function stageIndex(stage: ApplicationStage): number {
  return stage === "rejected" ? -1 : STAGES.indexOf(stage);
}

/** The furthest pipeline stage an application has ever reached (rejections do not count). */
export function furthestStage(app: Application): Stage | null {
  let best = -1;
  for (const h of app.history) best = Math.max(best, stageIndex(h.stage));
  return best < 0 ? null : STAGES[best]!;
}

export function isOpenJob(job: Job): boolean {
  return job.status === "open";
}

/** Applications still moving: not placed, not rejected, on a job that is open. */
export function openApplications(ws: Workspace): Application[] {
  const open = new Set(ws.jobs.filter(isOpenJob).map((j) => j.id));
  return ws.applications.filter((a) => !TERMINAL.has(a.stage) && open.has(a.jobId));
}

export function daysInCurrentStage(app: Application, now: Date): number {
  const last = app.history[app.history.length - 1];
  return last ? Math.max(0, daysBetween(last.at, now.toISOString())) : 0;
}

export function isStale(app: Application, now: Date, staleAfterDays: number): boolean {
  return !TERMINAL.has(app.stage) && daysInCurrentStage(app, now) >= staleAfterDays;
}

export function stageCounts(apps: readonly Application[]): Record<ApplicationStage, number> {
  const counts: Record<ApplicationStage, number> = { sourced: 0, screening: 0, submitted: 0, interview: 0, offer: 0, placed: 0, rejected: 0 };
  for (const a of apps) counts[a.stage] += 1;
  return counts;
}

export interface FunnelStep {
  stage: Stage;
  reached: number;
  /** Share of the previous step's applications that reached this one; null for the first. */
  conversion: number | null;
}

/** How many applications ever reached each stage, oldest stage first. */
export function funnel(apps: readonly Application[]): FunnelStep[] {
  const reached = STAGES.map(() => 0);
  for (const app of apps) {
    const best = furthestStage(app);
    if (!best) continue;
    for (let i = 0; i <= STAGES.indexOf(best); i++) reached[i]! += 1;
  }
  return STAGES.map((stage, i) => ({
    stage,
    reached: reached[i]!,
    conversion: i === 0 ? null : reached[i - 1]! === 0 ? null : reached[i]! / reached[i - 1]!,
  }));
}

export interface TimeToFill {
  jobId: string;
  days: number;
}

export function timeToFill(ws: Workspace): { perJob: TimeToFill[]; average: number | null } {
  const perJob: TimeToFill[] = [];
  for (const p of ws.placements) {
    const job = ws.jobs.find((j) => j.id === p.jobId);
    if (!job) continue;
    perJob.push({ jobId: job.id, days: Math.max(0, daysBetween(job.openedAt, p.createdAt)) });
  }
  const average = perJob.length ? Math.round(perJob.reduce((s, x) => s + x.days, 0) / perJob.length) : null;
  return { perJob, average };
}

/** Average days an application spent in each stage before leaving it. */
export function averageDaysInStage(apps: readonly Application[]): Record<Stage, number | null> {
  const sums: Record<Stage, { total: number; n: number }> = {
    sourced: { total: 0, n: 0 }, screening: { total: 0, n: 0 }, submitted: { total: 0, n: 0 },
    interview: { total: 0, n: 0 }, offer: { total: 0, n: 0 }, placed: { total: 0, n: 0 },
  };
  for (const app of apps) {
    for (let i = 0; i < app.history.length - 1; i++) {
      const from = app.history[i]!;
      if (from.stage === "rejected") continue;
      const s = sums[from.stage];
      s.total += Math.max(0, daysBetween(from.at, app.history[i + 1]!.at));
      s.n += 1;
    }
  }
  const out = {} as Record<Stage, number | null>;
  for (const stage of STAGES) out[stage] = sums[stage].n ? Math.round((sums[stage].total / sums[stage].n) * 10) / 10 : null;
  return out;
}

export interface SourceStat {
  source: Source;
  candidates: number;
  placed: number;
}

export function sourceStats(ws: Workspace): SourceStat[] {
  const placedCandidates = new Set(ws.placements.map((p) => p.candidateId));
  const by = new Map<Source, SourceStat>();
  for (const c of ws.candidates) {
    const row = by.get(c.source) ?? { source: c.source, candidates: 0, placed: 0 };
    row.candidates += 1;
    if (placedCandidates.has(c.id)) row.placed += 1;
    by.set(c.source, row);
  }
  return [...by.values()].sort((a, b) => b.candidates - a.candidates);
}

export interface FeeRow {
  key: string;
  label: string;
  amount: number;
}

export function feesByClient(ws: Workspace): FeeRow[] {
  const by = new Map<string, number>();
  for (const p of ws.placements) by.set(p.clientId, (by.get(p.clientId) ?? 0) + p.feeAmount);
  return [...by.entries()]
    .map(([key, amount]) => ({ key, label: ws.clients.find((c) => c.id === key)?.name ?? key, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** The last `months` months, oldest first, keyed `YYYY-MM`; months with no fee read 0. */
export function feesByMonth(ws: Workspace, now: Date, months = 6): FeeRow[] {
  const rows: FeeRow[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    rows.push({ key, label: key, amount: 0 });
  }
  for (const p of ws.placements) {
    const row = rows.find((r) => r.key === p.createdAt.slice(0, 7));
    if (row) row.amount += p.feeAmount;
  }
  return rows;
}

export function feeTotals(ws: Workspace): { total: number; invoiced: number; paid: number; outstanding: number } {
  let total = 0, invoiced = 0, paid = 0;
  for (const p of ws.placements) {
    total += p.feeAmount;
    if (p.invoiceStatus !== "draft") invoiced += p.feeAmount;
    if (p.invoiceStatus === "paid") paid += p.feeAmount;
  }
  return { total, invoiced, paid, outstanding: invoiced - paid };
}

/** How likely a job is to close, by the furthest stage any live application reached. */
const STAGE_WEIGHT: Record<Stage, number> = { sourced: 0.1, screening: 0.2, submitted: 0.35, interview: 0.5, offer: 0.8, placed: 1 };

export interface PipelineValueRow {
  jobId: string;
  expectedFee: number;
  weight: number;
  weighted: number;
}

export function pipelineValue(ws: Workspace): { rows: PipelineValueRow[]; total: number } {
  const rows: PipelineValueRow[] = [];
  for (const job of ws.jobs.filter(isOpenJob)) {
    const client = ws.clients.find((c) => c.id === job.clientId);
    const mid = salaryMid(job);
    if (mid === null) continue;
    const expectedFee = Math.round((mid * effectiveFeePercent(job, client, ws.settings)) / 100);
    const live = ws.applications.filter((a) => a.jobId === job.id && !TERMINAL.has(a.stage));
    let weight = 0.05;
    for (const a of live) weight = Math.max(weight, STAGE_WEIGHT[a.stage as Stage] ?? 0);
    rows.push({ jobId: job.id, expectedFee, weight, weighted: Math.round(expectedFee * weight) });
  }
  rows.sort((a, b) => b.weighted - a.weighted);
  return { rows, total: rows.reduce((s, r) => s + r.weighted, 0) };
}

export interface Attention {
  stale: Application[];
  consentExpiring: string[];
  consentExpired: string[];
  overdueTasks: string[];
  interviewsToday: string[];
  unscored: Application[];
  deadlines: string[];
}

export function attention(ws: Workspace, now: Date): Attention {
  const today = isoDate(now);
  const in30 = isoDate(new Date(now.getTime() + 30 * 86_400_000));
  const in7 = isoDate(new Date(now.getTime() + 7 * 86_400_000));
  const open = openApplications(ws);
  return {
    stale: open.filter((a) => isStale(a, now, ws.settings.staleAfterDays)),
    consentExpiring: ws.candidates.filter((c) => c.consent.status === "granted" && c.consent.expiresAt && c.consent.expiresAt >= today && c.consent.expiresAt <= in30).map((c) => c.id),
    consentExpired: ws.candidates.filter((c) => c.consent.status === "granted" && c.consent.expiresAt && c.consent.expiresAt < today).map((c) => c.id),
    overdueTasks: ws.tasks.filter((t) => !t.done && t.dueAt && t.dueAt < today).map((t) => t.id),
    interviewsToday: ws.interviews.filter((i) => i.status === "scheduled" && i.scheduledAt.slice(0, 10) === today).map((i) => i.id),
    unscored: open.filter((a) => a.score === null),
    deadlines: ws.jobs.filter((j) => isOpenJob(j) && j.deadline && j.deadline >= today && j.deadline <= in7).map((j) => j.id),
  };
}

export interface Kpis {
  openJobs: number;
  activeCandidates: number;
  interviewsThisWeek: number;
  placementsYtd: number;
  feesYtd: number;
  pipelineValue: number;
  avgTimeToFill: number | null;
}

export function kpis(ws: Workspace, now: Date): Kpis {
  const open = openApplications(ws);
  const weekStart = new Date(now);
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  const year = String(now.getUTCFullYear());
  const ytd = ws.placements.filter((p) => p.createdAt.startsWith(year));
  return {
    openJobs: ws.jobs.filter(isOpenJob).length,
    activeCandidates: new Set(open.map((a) => a.candidateId)).size,
    interviewsThisWeek: ws.interviews.filter((i) => i.status === "scheduled" && new Date(i.scheduledAt) >= weekStart && new Date(i.scheduledAt) < weekEnd).length,
    placementsYtd: ytd.length,
    feesYtd: ytd.reduce((s, p) => s + p.feeAmount, 0),
    pipelineValue: pipelineValue(ws).total,
    avgTimeToFill: timeToFill(ws).average,
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────────────

export function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export function formatTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
}

export function formatMonth(key: string, locale: string): string {
  const d = new Date(`${key}-01T00:00:00`);
  return new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" }).format(d);
}

export function percent(ratio: number | null): string {
  return ratio === null ? "—" : `${Math.round(ratio * 100)} %`;
}
