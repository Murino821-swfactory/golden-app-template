/**
 * model.ts — the real estate workspace's data: what an agent or an agency keeps about
 * properties, people, demand, viewings, deals, leases, documents, tasks and the team.
 *
 * Everything is plain JSON (dates as ISO strings) so the whole workspace round-trips
 * through localStorage and the JSON export. Enumerations are closed string unions; their
 * labels live in copy.ts, typed against these unions, so a new value is a type error
 * until both languages name it.
 */

export const WORKSPACE_VERSION = 1;

export type WorkspaceLocale = "en" | "sk";

export type Transaction = "sale" | "rent";
export const TRANSACTIONS: readonly Transaction[] = ["sale", "rent"];

export type PropertyType = "apartment" | "house" | "land" | "commercial" | "office" | "garage";
export const PROPERTY_TYPES: readonly PropertyType[] = ["apartment", "house", "land", "commercial", "office", "garage"];

export type PropertyStatus = "preparation" | "active" | "reserved" | "sold" | "rented" | "withdrawn";
export const PROPERTY_STATUSES: readonly PropertyStatus[] = ["preparation", "active", "reserved", "sold", "rented", "withdrawn"];

export type Condition = "new" | "renovated" | "good" | "original";
export const CONDITIONS: readonly Condition[] = ["new", "renovated", "good", "original"];

/** Slovak energy certificate classes (zákon 555/2005 Z. z.); `missing` is a compliance gap. */
export type EnergyClass = "A0" | "A1" | "B" | "C" | "D" | "E" | "F" | "G" | "missing";
export const ENERGY_CLASSES: readonly EnergyClass[] = ["A0", "A1", "B", "C", "D", "E", "F", "G", "missing"];

export type Portal = "nehnutelnosti" | "reality" | "topreality" | "byty" | "website";
export const PORTALS: readonly Portal[] = ["nehnutelnosti", "reality", "topreality", "byty", "website"];

export type SyndicationState = "off" | "queued" | "live" | "error";
export const SYNDICATION_CYCLE: readonly SyndicationState[] = ["off", "queued", "live"];

export type PropertyDocKind = "titleDeed" | "energyCertificate" | "floorPlan" | "photos" | "brokerageAgreement" | "ownerId";
export const PROPERTY_DOC_KINDS: readonly PropertyDocKind[] = ["brokerageAgreement", "ownerId", "titleDeed", "energyCertificate", "floorPlan", "photos"];

export interface PropertyDoc {
  kind: PropertyDocKind;
  done: boolean;
}

export type ExclusivityType = "exclusive" | "nonExclusive";

export type CommissionBasis = "percent" | "fixed" | "months";

export interface Commission {
  basis: CommissionBasis;
  value: number;
}

export type Feature =
  | "balcony" | "loggia" | "terrace" | "garden" | "parking" | "garage" | "cellar" | "lift"
  | "furnished" | "newBuilding" | "quiet" | "cityCentre" | "nearTransport" | "nearSchool" | "solar" | "utilities";
export const FEATURES: readonly Feature[] = [
  "balcony", "loggia", "terrace", "garden", "parking", "garage", "cellar", "lift",
  "furnished", "newBuilding", "quiet", "cityCentre", "nearTransport", "nearSchool", "solar", "utilities",
];

export interface Property {
  id: string;
  title: string;
  transaction: Transaction;
  type: PropertyType;
  status: PropertyStatus;
  /** Sale price, or the monthly rent. EUR. */
  price: number;
  priceHistory: { at: string; price: number }[];
  city: string;
  district: string;
  street: string;
  region: string;
  area: number;
  landArea: number | null;
  rooms: number;
  floor: number | null;
  totalFloors: number | null;
  condition: Condition;
  energyClass: EnergyClass;
  yearBuilt: number | null;
  features: Feature[];
  description: string;
  ownerId: string;
  agentId: string;
  exclusivity: { type: ExclusivityType; until: string | null };
  commission: Commission;
  listedAt: string;
  portals: Record<Portal, SyndicationState>;
  documents: PropertyDoc[];
  photos: number;
  stats: { views: number; inquiries: number };
  cadastre: { titleDeed: string; parcel: string; municipality: string } | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ContactKind = "person" | "company";
export type ContactRole = "owner" | "buyer" | "landlord" | "tenant" | "investor";
export const CONTACT_ROLES: readonly ContactRole[] = ["owner", "buyer", "landlord", "tenant", "investor"];

export type Source = "portal" | "website" | "referral" | "phone" | "walkIn" | "social" | "repeat";
export const SOURCES: readonly Source[] = ["portal", "website", "referral", "phone", "walkIn", "social", "repeat"];

export type ConsentStatus = "pending" | "granted" | "withdrawn";
export type AmlStatus = "none" | "identified" | "verified";
export type AmlMethod = "inPerson" | "remote";
export type IdDocument = "idCard" | "passport";

export interface Consent {
  status: ConsentStatus;
  grantedAt: string | null;
  expiresAt: string | null;
  marketing: boolean;
}

/** Customer due diligence under zákon 297/2008 Z. z. — an agent is an obliged person. */
export interface Aml {
  status: AmlStatus;
  method: AmlMethod | null;
  document: IdDocument | null;
  identifiedAt: string | null;
  pep: boolean;
}

export interface Contact {
  id: string;
  kind: ContactKind;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  roles: ContactRole[];
  source: Source;
  tags: string[];
  agentId: string;
  consent: Consent;
  aml: Aml;
  city: string;
  notes: string;
  createdAt: string;
}

export type DemandStatus = "new" | "contacted" | "qualified" | "viewing" | "offer" | "won" | "lost";
export const DEMAND_STATUSES: readonly DemandStatus[] = ["new", "contacted", "qualified", "viewing", "offer", "won", "lost"];
export const OPEN_DEMAND_STATUSES: readonly DemandStatus[] = ["new", "contacted", "qualified", "viewing", "offer"];

export interface Demand {
  id: string;
  contactId: string;
  transaction: Transaction;
  types: PropertyType[];
  locations: string[];
  budgetMin: number | null;
  budgetMax: number;
  roomsMin: number | null;
  areaMin: number | null;
  mustHaves: Feature[];
  status: DemandStatus;
  source: Source;
  agentId: string;
  receivedAt: string;
  firstResponseAt: string | null;
  /** Set when the inquiry came in about one specific listing. */
  propertyId: string | null;
  notes: string;
  lostReason: string | null;
}

export type ViewingStatus = "scheduled" | "done" | "cancelled" | "noShow";
export type ViewingOutcome = "interested" | "notInterested" | "offer" | "undecided";

export interface Viewing {
  id: string;
  propertyId: string;
  contactId: string;
  demandId: string | null;
  agentId: string;
  start: string;
  durationMin: number;
  status: ViewingStatus;
  outcome: ViewingOutcome | null;
  feedback: string;
}

export type DealStage = "offer" | "reservation" | "contracts" | "financing" | "cadastre" | "handover" | "closed";
export const SALE_STAGES: readonly DealStage[] = ["offer", "reservation", "contracts", "financing", "cadastre", "handover", "closed"];
export const RENT_STAGES: readonly DealStage[] = ["offer", "reservation", "contracts", "handover", "closed"];
export type DealStatus = "open" | "won" | "lost";

export type ChecklistKey =
  | "offerAccepted" | "amlBuyer" | "amlSeller" | "amlTenant" | "amlLandlord"
  | "reservationAgreement" | "depositPaid" | "titleDeedChecked"
  | "purchaseContract" | "leaseContract" | "contractsSigned" | "depositReceived"
  | "mortgageApplied" | "mortgageApproved" | "lienRegistered"
  | "cadastreFiled" | "cadastreDecision" | "priceReleased"
  | "energyCertificateHanded" | "handoverProtocol" | "keysHanded"
  | "commissionInvoiced";

export interface ChecklistItem {
  stage: DealStage;
  key: ChecklistKey;
  done: boolean;
  doneAt: string | null;
}

export type CommissionPayer = "seller" | "buyer" | "both" | "landlord" | "tenant";

export interface Deal {
  id: string;
  propertyId: string;
  demandId: string | null;
  /** Buyer or tenant. */
  buyerId: string;
  /** Seller or landlord. */
  sellerId: string;
  transaction: Transaction;
  stage: DealStage;
  status: DealStatus;
  stageHistory: { stage: DealStage; at: string }[];
  agreedPrice: number;
  commission: Commission & { payer: CommissionPayer };
  expectedClose: string;
  agentId: string;
  checklist: ChecklistItem[];
  reservation: { deposit: number; until: string } | null;
  financing: { bank: string; approved: boolean } | null;
  lostReason: string | null;
  closedAt: string | null;
  notes: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  /** YYYY-MM */
  month: string;
  due: string;
  amount: number;
  paidAt: string | null;
}

export type ProtocolKind = "moveIn" | "moveOut";

export interface HandoverProtocol {
  id: string;
  kind: ProtocolKind;
  date: string;
  meters: { electricity: number; gas: number; water: number };
  keys: number;
  condition: string;
  notes: string;
}

export type LeaseStatus = "active" | "ending" | "ended";

export interface Lease {
  id: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  agentId: string;
  rent: number;
  deposit: number;
  start: string;
  end: string;
  noticeMonths: number;
  utilitiesIncluded: boolean;
  status: LeaseStatus;
  payments: Payment[];
  protocols: HandoverProtocol[];
  notes: string;
}

export type TemplateId =
  | "brokerageExclusive" | "brokerageNonExclusive" | "reservation" | "purchase" | "lease"
  | "handover" | "cadastreFiling" | "gdprConsent" | "amlForm" | "powerOfAttorney";
export const TEMPLATE_IDS: readonly TemplateId[] = [
  "brokerageExclusive", "brokerageNonExclusive", "reservation", "purchase", "lease",
  "handover", "cadastreFiling", "gdprConsent", "amlForm", "powerOfAttorney",
];

export type DocStatus = "draft" | "sent" | "signed" | "archived";
export const DOC_STATUSES: readonly DocStatus[] = ["draft", "sent", "signed", "archived"];

export type LinkKind = "property" | "contact" | "demand" | "deal" | "lease";
export interface EntityLink {
  kind: LinkKind;
  id: string;
}

export interface DocumentItem {
  id: string;
  templateId: TemplateId;
  link: EntityLink;
  status: DocStatus;
  createdAt: string;
  signedAt: string | null;
}

export type TaskPriority = "low" | "normal" | "high";

export interface Task {
  id: string;
  title: string;
  due: string;
  done: boolean;
  priority: TaskPriority;
  agentId: string;
  link: EntityLink | null;
  createdAt: string;
}

export type AgentRole = "owner" | "manager" | "agent" | "assistant";
export const AGENT_ROLES: readonly AgentRole[] = ["owner", "manager", "agent", "assistant"];

export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  role: AgentRole;
  email: string;
  phone: string;
  /** The agent's share of a commission, in percent. */
  split: number;
  since: string;
}

export type ActivityType = "note" | "call" | "email" | "meeting" | "stage" | "system";

export interface Activity {
  id: string;
  at: string;
  type: ActivityType;
  text: string;
  link: EntityLink | null;
  agentId: string;
}

export type WorkspaceMode = "solo" | "agency";

export interface Settings {
  agencyName: string;
  ico: string;
  address: string;
  mode: WorkspaceMode;
  currentAgentId: string;
  saleCommissionPct: number;
  rentCommissionMonths: number;
  vatPct: number;
  leadSlaHours: number;
  staleDealDays: number;
  consentMonths: number;
  portals: Portal[];
}

export interface Workspace {
  version: number;
  seededLocale: WorkspaceLocale;
  /** When the demo data was written; equal to `updatedAt` until the first change. */
  seededAt: string;
  updatedAt: string;
  settings: Settings;
  agents: Agent[];
  properties: Property[];
  contacts: Contact[];
  demands: Demand[];
  viewings: Viewing[];
  deals: Deal[];
  leases: Lease[];
  documents: DocumentItem[];
  tasks: Task[];
  activities: Activity[];
}

// ── Small helpers every module shares ───────────────────────────────────────────────

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** YYYY-MM-DD in local time. */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM in local time. */
export function monthKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00` : d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(d: Date, months: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** Whole days from `a` to `b` (both YYYY-MM-DD or ISO); negative when `b` is earlier. */
export function daysBetween(a: string, b: string): number {
  const da = new Date(a.length === 10 ? `${a}T00:00:00` : a);
  const db = new Date(b.length === 10 ? `${b}T00:00:00` : b);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export function fullName(x: { firstName: string; lastName: string; company?: string; kind?: ContactKind }): string {
  if (x.kind === "company" && x.company) return x.company;
  return `${x.firstName} ${x.lastName}`.trim();
}

export function stagesFor(transaction: Transaction): readonly DealStage[] {
  return transaction === "sale" ? SALE_STAGES : RENT_STAGES;
}

/** What has to be true before a deal leaves each station — the rail's checklist. */
export function checklistTemplate(transaction: Transaction): { stage: DealStage; key: ChecklistKey }[] {
  if (transaction === "sale") {
    return [
      { stage: "offer", key: "offerAccepted" },
      { stage: "offer", key: "amlBuyer" },
      { stage: "offer", key: "amlSeller" },
      { stage: "reservation", key: "reservationAgreement" },
      { stage: "reservation", key: "depositPaid" },
      { stage: "reservation", key: "titleDeedChecked" },
      { stage: "contracts", key: "purchaseContract" },
      { stage: "contracts", key: "contractsSigned" },
      { stage: "financing", key: "mortgageApplied" },
      { stage: "financing", key: "mortgageApproved" },
      { stage: "financing", key: "lienRegistered" },
      { stage: "cadastre", key: "cadastreFiled" },
      { stage: "cadastre", key: "cadastreDecision" },
      { stage: "cadastre", key: "priceReleased" },
      { stage: "handover", key: "energyCertificateHanded" },
      { stage: "handover", key: "handoverProtocol" },
      { stage: "handover", key: "keysHanded" },
      { stage: "closed", key: "commissionInvoiced" },
    ];
  }
  return [
    { stage: "offer", key: "offerAccepted" },
    { stage: "offer", key: "amlTenant" },
    { stage: "offer", key: "amlLandlord" },
    { stage: "reservation", key: "reservationAgreement" },
    { stage: "reservation", key: "depositPaid" },
    { stage: "contracts", key: "leaseContract" },
    { stage: "contracts", key: "contractsSigned" },
    { stage: "contracts", key: "depositReceived" },
    { stage: "handover", key: "energyCertificateHanded" },
    { stage: "handover", key: "handoverProtocol" },
    { stage: "handover", key: "keysHanded" },
    { stage: "closed", key: "commissionInvoiced" },
  ];
}

export function freshChecklist(transaction: Transaction): ChecklistItem[] {
  return checklistTemplate(transaction).map((item) => ({ ...item, done: false, doneAt: null }));
}

/** How likely a deal at this station is to close — the weight of the pipeline forecast. */
export const STAGE_PROBABILITY: Record<DealStage, number> = {
  offer: 0.3,
  reservation: 0.6,
  contracts: 0.75,
  financing: 0.8,
  cadastre: 0.9,
  handover: 0.95,
  closed: 1,
};

export function emptyPortals(): Record<Portal, SyndicationState> {
  return { nehnutelnosti: "off", reality: "off", topreality: "off", byty: "off", website: "off" };
}

export function emptyDocuments(): PropertyDoc[] {
  return PROPERTY_DOC_KINDS.map((kind) => ({ kind, done: false }));
}
