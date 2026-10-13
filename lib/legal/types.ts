/**
 * The domain of the law-expert workspace — what a lawyer or a law firm keeps while running
 * cases, hearings and advisory work. Pure types, no Firebase, no React. Every date is an ISO
 * `yyyy-MM-dd` string (or an ISO timestamp where a time matters), money is a number in EUR.
 *
 * Spec: sw-factory `docs/superpowers/specs/2026-10-13-law-expert-practice-system-design.md`.
 */

export type Locale = "sk" | "en";

/** One lawyer with their own practice, or a firm with several lawyers and staff. */
export type WorkspaceKind = "solo" | "firm";

export type Role = "partner" | "attorney" | "associate" | "paralegal" | "assistant";

export interface Member {
  id: string;
  name: string;
  initials: string;
  role: Role;
  email: string;
  /** Default billing rate, EUR per hour. */
  hourlyRate: number;
  /** Planned billable capacity, hours per week. */
  capacityHoursWeek: number;
}

export type ClientType = "person" | "company";
export type KycStatus = "pending" | "verified" | "expired";
export type AmlRisk = "low" | "medium" | "high";

export interface Client {
  id: string;
  type: ClientType;
  name: string;
  /** IČO for a company; left empty for people in the demo (no real identifiers). */
  registrationNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  kyc: KycStatus;
  /** Ids of the due-diligence steps completed (clients page checklist). */
  kycChecks?: string[];
  amlRisk: AmlRisk;
  note?: string;
  createdAt: string;
}

export type PracticeArea =
  | "civil"
  | "commercial"
  | "criminal"
  | "family"
  | "labour"
  | "administrative"
  | "realEstate"
  | "insolvency";

export type MatterType = "litigation" | "advisory" | "transaction" | "criminalDefence" | "administrative";

/** The workflow of a matter, from first contact to archive. */
export type MatterStage = "intake" | "analysis" | "filed" | "hearing" | "decision" | "appeal" | "closed";

export type BillingMode = "hourly" | "flat" | "tariff";

export type PartyRole = "client" | "opponent" | "court" | "authority" | "witness" | "expert" | "other";

export interface Party {
  role: PartyRole;
  name: string;
  note?: string;
}

export interface Matter {
  id: string;
  /** The firm's own file number, e.g. 2026/0042. */
  number: string;
  title: string;
  clientId: string;
  area: PracticeArea;
  type: MatterType;
  stage: MatterStage;
  leadId: string;
  teamIds: string[];
  court?: string;
  /** The court's file number (spisová značka), when a case is filed. */
  courtFileNumber?: string;
  judge?: string;
  /** Value of the matter in EUR, when it has one — drives tariff and court fees. */
  value?: number;
  billing: { mode: BillingMode; hourlyRate?: number; flatFee?: number };
  openedAt: string;
  closedAt?: string;
  parties: Party[];
  tags: string[];
  summary: string;
  nextStep?: string;
  /** The lawyer's own assessment; shown, never computed. */
  risk?: "low" | "medium" | "high";
  /** Ids of saved research snapshots linked to this matter. */
  researchIds: string[];
}

/** Statutory deadline presets the calculator knows; `custom` takes any number of days. */
export type DeadlinePreset =
  | "appealCsp"
  | "oppositionPaymentOrder"
  | "extraordinaryAppealCsp"
  | "appealCriminal"
  | "complaintCriminal"
  | "administrativeAction"
  | "statementCourtSet"
  | "custom";

export type DeadlineUnit = "days" | "workingDays" | "weeks" | "months" | "years";

export interface Deadline {
  id: string;
  matterId: string;
  title: string;
  preset: DeadlinePreset;
  /** The event that starts the period (delivery, announcement, court order). */
  startDate: string;
  amount: number;
  unit: DeadlineUnit;
  /** Computed by `computeDeadline`; stored so a list never recomputes with a newer calendar. */
  dueDate: string;
  /** True when the raw end fell on a Saturday, Sunday or a day of rest and moved. */
  shifted: boolean;
  responsibleId: string;
  status: "open" | "done";
  note?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ChronologyEntry {
  date: string;
  event: string;
  evidenceRef?: string;
}

export interface EvidenceItem {
  id: string;
  label: string;
  kind: "document" | "witness" | "expert" | "inspection" | "other";
  status: "filed" | "toFile" | "requested";
  note?: string;
}

export interface Witness {
  name: string;
  side: "ours" | "theirs" | "court";
  topic: string;
  status: "summoned" | "toSummon" | "confirmed";
}

export interface Argument {
  claim: string;
  support: string;
  risk: string;
}

/** Everything prepared for one hearing — the trial binder. */
export interface HearingPrep {
  checklist: ChecklistItem[];
  chronology: ChronologyEntry[];
  evidence: EvidenceItem[];
  witnesses: Witness[];
  arguments: Argument[];
  questions: string[];
}

export type HearingKind = "hearing" | "consultation" | "meeting" | "negotiation";

export interface Hearing {
  id: string;
  matterId: string;
  kind: HearingKind;
  /** ISO date; `time` is HH:mm, local. */
  date: string;
  time: string;
  durationMinutes: number;
  location: string;
  room?: string;
  judge?: string;
  attendeeIds: string[];
  status: "scheduled" | "done" | "adjourned";
  prep: HearingPrep;
  note?: string;
}

export interface Task {
  id: string;
  matterId?: string;
  title: string;
  dueDate: string;
  assigneeId: string;
  status: "todo" | "doing" | "done";
  priority: "low" | "normal" | "high";
}

export type ActivityKind =
  | "consultation"
  | "drafting"
  | "filing"
  | "hearing"
  | "research"
  | "call"
  | "email"
  | "travel"
  | "internal";

export interface TimeEntry {
  id: string;
  matterId: string;
  memberId: string;
  date: string;
  minutes: number;
  activity: ActivityKind;
  description: string;
  billable: boolean;
  /** EUR per hour applied to this entry. */
  rate: number;
  /** Set once the entry is on an invoice. */
  invoiceId?: string;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unit: "h" | "act" | "item";
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  matterId: string;
  issuedAt: string;
  dueAt: string;
  lines: InvoiceLine[];
  vatRate: number;
  status: "draft" | "sent" | "paid" | "overdue";
  paidAt?: string;
}

export type DocumentKind =
  | "submission"
  | "contract"
  | "evidence"
  | "decision"
  | "memo"
  | "correspondence"
  | "template";

export interface MatterDocument {
  id: string;
  matterId?: string;
  title: string;
  kind: DocumentKind;
  version: number;
  updatedAt: string;
  authorId: string;
  status: "draft" | "final" | "filed";
  sizeKb: number;
}

export interface Activity {
  id: string;
  at: string;
  memberId: string;
  matterId?: string;
  text: string;
}

export interface WorkspaceSettings {
  /** Výpočtový základ for the advokátska tarifa, EUR (1/13 and 1/100 of it are the rates). */
  tariffBase: number;
  tariffYear: number;
  defaultHourlyRate: number;
  vatRate: number;
  currency: "EUR";
}

export interface Workspace {
  version: 1;
  kind: WorkspaceKind;
  seededAt: string;
  firm: { name: string; address: string };
  /** The signed-in person's seat in the demo — whose agenda the dashboard shows. */
  currentMemberId: string;
  members: Member[];
  clients: Client[];
  matters: Matter[];
  deadlines: Deadline[];
  hearings: Hearing[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  invoices: Invoice[];
  documents: MatterDocument[];
  activities: Activity[];
  settings: WorkspaceSettings;
}
