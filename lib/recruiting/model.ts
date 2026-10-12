/**
 * model.ts — the recruiting workspace's data shapes, pure.
 *
 * One workspace is one headhunter's or one small agency's whole desk: the clients they
 * work for, the jobs those clients opened, the candidates they know, and the applications
 * that move a candidate through a job's pipeline. Interviews, placements, tasks and the
 * activity timeline hang off those four. Nothing here imports React or the browser, so
 * every rule about the data can be unit-tested from a file (`tests/recruiting-logic.spec.ts`).
 */

export const WORKSPACE_VERSION = 1 as const;

/** The pipeline, in order. `rejected` is terminal and lives outside the board columns. */
export const STAGES = ["sourced", "screening", "submitted", "interview", "offer", "placed"] as const;
export type Stage = (typeof STAGES)[number];
export type ApplicationStage = Stage | "rejected";

export const JOB_STATUSES = ["open", "on-hold", "filled", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

export const WORK_MODES = ["onsite", "hybrid", "remote"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const EMPLOYMENT_TYPES = ["permanent", "contract", "temporary"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const SOURCES = ["linkedin", "job-board", "referral", "database", "direct", "event", "other"] as const;
export type Source = (typeof SOURCES)[number];

export const CONSENT_STATUSES = ["pending", "granted", "withdrawn"] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const INTERVIEW_TYPES = ["phone", "video", "onsite", "client"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_STATUSES = ["scheduled", "done", "cancelled", "no-show"] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const RECOMMENDATIONS = ["strong-yes", "yes", "no", "strong-no"] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export const INVOICE_STATUSES = ["draft", "sent", "paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const ACTIVITY_TYPES = ["note", "call", "email", "meeting", "stage", "system"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const REJECTION_REASONS = ["skills", "salary", "location", "withdrew", "client-declined", "other"] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

/** ISO 8601 date-time (`new Date().toISOString()`) — the one date format stored. */
export type IsoDateTime = string;
/** `YYYY-MM-DD` for dates that have no time of day (start date, deadline). */
export type IsoDate = string;

export interface Settings {
  agencyName: string;
  currency: string;
  /** Default placement fee as a share of first-year gross salary, in %. */
  defaultFeePercent: number;
  /** Default free-replacement guarantee after a placement starts, in days. */
  defaultGuaranteeDays: number;
  /** How long a candidate's consent to keep their data lasts, in months. */
  consentMonths: number;
  /** An application that has not moved for this many days is "stale". */
  staleAfterDays: number;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  location: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  /** Fee agreed with this client, in %; `null` means the workspace default. */
  feePercent: number | null;
  guaranteeDays: number | null;
  paymentTermsDays: number;
  notes: string;
  createdAt: IsoDateTime;
}

export interface Job {
  id: string;
  clientId: string;
  title: string;
  location: string;
  workMode: WorkMode;
  employment: EmploymentType;
  salaryMin: number | null;
  salaryMax: number | null;
  /** Fee for this job in %; `null` means the client's, then the workspace default. */
  feePercent: number | null;
  status: JobStatus;
  priority: JobPriority;
  openedAt: IsoDate;
  deadline: IsoDate | null;
  /** The posting as the analyzer reads it (`lib/cv-analyzer.ts`). */
  description: string;
  mustHave: string[];
  niceToHave: string[];
  owner: string;
  createdAt: IsoDateTime;
}

export interface Consent {
  status: ConsentStatus;
  grantedAt: IsoDate | null;
  expiresAt: IsoDate | null;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  location: string;
  currentCompany: string;
  yearsExperience: number | null;
  salaryExpectation: number | null;
  /** When they could start: free text ("immediately", "2 months' notice"). */
  availability: string;
  skills: string[];
  tags: string[];
  source: Source;
  linkedin: string;
  /** The CV as plain text — what the matcher scores. */
  cvText: string;
  summary: string;
  consent: Consent;
  anonymized: boolean;
  createdAt: IsoDateTime;
  lastContactAt: IsoDateTime | null;
}

export interface StageChange {
  stage: ApplicationStage;
  at: IsoDateTime;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  stage: ApplicationStage;
  /** Match score from the analyzer (0–100), when the recruiter scored it. */
  score: number | null;
  /** Every stage this application has been in, oldest first; the last is the current one. */
  history: StageChange[];
  rejection: { reason: RejectionReason; note: string } | null;
  createdAt: IsoDateTime;
}

export interface ScorecardCriterion {
  name: string;
  /** 1–5, or null while not yet rated. */
  score: number | null;
  note: string;
}

export interface Scorecard {
  criteria: ScorecardCriterion[];
  recommendation: Recommendation | null;
  summary: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  type: InterviewType;
  scheduledAt: IsoDateTime;
  durationMinutes: number;
  interviewer: string;
  /** A meeting link or an address. */
  place: string;
  status: InterviewStatus;
  scorecard: Scorecard | null;
  createdAt: IsoDateTime;
}

export interface Placement {
  id: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  clientId: string;
  startDate: IsoDate;
  /** First-year gross salary the fee is computed from. */
  salary: number;
  feePercent: number;
  feeAmount: number;
  guaranteeDays: number;
  guaranteeUntil: IsoDate;
  invoiceStatus: InvoiceStatus;
  createdAt: IsoDateTime;
}

export interface Task {
  id: string;
  title: string;
  dueAt: IsoDate | null;
  done: boolean;
  candidateId: string | null;
  jobId: string | null;
  createdAt: IsoDateTime;
}

export interface Activity {
  id: string;
  type: ActivityType;
  text: string;
  candidateId: string | null;
  jobId: string | null;
  clientId: string | null;
  at: IsoDateTime;
}

export interface Workspace {
  version: typeof WORKSPACE_VERSION;
  /** The language the demo data was written in. */
  seededLocale: "en" | "sk";
  updatedAt: IsoDateTime;
  settings: Settings;
  clients: Client[];
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  interviews: Interview[];
  placements: Placement[];
  tasks: Task[];
  activities: Activity[];
}

export const DEFAULT_SETTINGS: Settings = {
  agencyName: "",
  currency: "EUR",
  defaultFeePercent: 20,
  defaultGuaranteeDays: 90,
  consentMonths: 12,
  staleAfterDays: 7,
};

/** Hard caps — the workspace lives in localStorage (~5 MB), not a database. */
export const LIMITS = {
  candidates: 500,
  jobs: 200,
  clients: 200,
  cvTextChars: 50_000,
  noteChars: 2_000,
} as const;

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyWorkspace(seededLocale: "en" | "sk", now = new Date()): Workspace {
  return {
    version: WORKSPACE_VERSION,
    seededLocale,
    updatedAt: now.toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    clients: [],
    jobs: [],
    candidates: [],
    applications: [],
    interviews: [],
    placements: [],
    tasks: [],
    activities: [],
  };
}

export function fullName(c: Pick<Candidate, "firstName" | "lastName">): string {
  return `${c.firstName} ${c.lastName}`.trim();
}

export function initials(c: Pick<Candidate, "firstName" | "lastName">): string {
  return `${c.firstName.charAt(0)}${c.lastName.charAt(0)}`.toUpperCase() || "?";
}

/** The fee that applies to a job: job override → client override → workspace default. */
export function effectiveFeePercent(job: Job, client: Client | undefined, settings: Settings): number {
  return job.feePercent ?? client?.feePercent ?? settings.defaultFeePercent;
}

export function effectiveGuaranteeDays(client: Client | undefined, settings: Settings): number {
  return client?.guaranteeDays ?? settings.defaultGuaranteeDays;
}

/** Midpoint of the salary range, or whichever bound exists. */
export function salaryMid(job: Pick<Job, "salaryMin" | "salaryMax">): number | null {
  if (job.salaryMin !== null && job.salaryMax !== null) return Math.round((job.salaryMin + job.salaryMax) / 2);
  return job.salaryMax ?? job.salaryMin;
}

export function isoDate(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return isoDate(d);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: IsoDateTime | IsoDate, to: IsoDateTime | IsoDate): number {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
}
