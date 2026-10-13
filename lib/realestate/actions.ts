/**
 * actions.ts — every change to the workspace, as a named function that also writes the
 * timeline. Views call these; nothing else mutates. The words the actions write come from
 * the view (`ActionLabels`), so the timeline is in the language on screen.
 */
import {
  addMonths, freshChecklist, isoDate, stagesFor, uid,
  type ActivityType, type Agent, type Aml, type ChecklistKey, type Contact, type ConsentStatus, type Deal, type DealStage,
  type Demand, type DemandStatus, type DocStatus, type DocumentItem, type EntityLink, type HandoverProtocol, type Lease,
  type LeaseStatus, type Payment, type Portal, type Property, type PropertyDocKind, type PropertyStatus, type Settings,
  type SyndicationState, type Task, type TemplateId, type Viewing, type ViewingOutcome, type ViewingStatus, type Workspace,
  type WorkspaceLocale,
} from "./model";
import { seedWorkspace } from "./seed";
import { parseWorkspace, replaceWorkspace, update } from "./store";

export interface ActionLabels {
  stageChanged: (stage: DealStage) => string;
  propertyStatus: (status: PropertyStatus) => string;
  priceChanged: (from: number, to: number) => string;
  portalChanged: (portal: Portal, state: SyndicationState) => string;
  viewingScheduled: (property: string) => string;
  viewingOutcome: (outcome: ViewingOutcome) => string;
  viewingStatus: (status: ViewingStatus) => string;
  dealCreated: (property: string) => string;
  dealLost: (reason: string) => string;
  dealClosed: (property: string) => string;
  demandStatus: (status: DemandStatus) => string;
  demandContacted: string;
  consent: (status: ConsentStatus) => string;
  amlIdentified: string;
  amlVerified: string;
  documentCreated: (title: string) => string;
  documentStatus: (title: string, status: DocStatus) => string;
  templateTitle: (id: TemplateId) => string;
  leaseCreated: (property: string) => string;
  paymentMarked: (month: string) => string;
  protocolAdded: (kind: HandoverProtocol["kind"]) => string;
}

function now(): string {
  return new Date().toISOString();
}

function log(draft: Workspace, type: ActivityType, text: string, link: EntityLink | null, agentId?: string): void {
  draft.activities.unshift({ id: uid("act"), at: now(), type, text, link, agentId: agentId ?? draft.settings.currentAgentId });
  if (draft.activities.length > 400) draft.activities.length = 400;
}

const propertyTitle = (draft: Workspace, id: string) => draft.properties.find((p) => p.id === id)?.title ?? id;

// ── Properties ───────────────────────────────────────────────────────────────────────

export type PropertyInput = Omit<Property, "id" | "createdAt" | "updatedAt" | "priceHistory" | "stats">;

export function addProperty(input: PropertyInput): string {
  const id = uid("prop");
  update((draft) => {
    const at = now();
    draft.properties.unshift({ ...input, id, createdAt: at, updatedAt: at, priceHistory: [{ at, price: input.price }], stats: { views: 0, inquiries: 0 } });
    log(draft, "system", input.title, { kind: "property", id }, input.agentId);
  });
  return id;
}

export function updateProperty(id: string, patch: Partial<PropertyInput>, labels: ActionLabels): void {
  update((draft) => {
    const p = draft.properties.find((x) => x.id === id);
    if (!p) return;
    if (patch.price !== undefined && patch.price !== p.price) {
      p.priceHistory.push({ at: now(), price: patch.price });
      log(draft, "system", labels.priceChanged(p.price, patch.price), { kind: "property", id });
    }
    Object.assign(p, patch, { updatedAt: now() });
  });
}

export function setPropertyStatus(id: string, status: PropertyStatus, labels: ActionLabels): void {
  update((draft) => {
    const p = draft.properties.find((x) => x.id === id);
    if (!p || p.status === status) return;
    p.status = status;
    p.updatedAt = now();
    if (status !== "active") for (const key of Object.keys(p.portals) as Portal[]) if (p.portals[key] === "live") p.portals[key] = "off";
    log(draft, "stage", labels.propertyStatus(status), { kind: "property", id });
  });
}

export function togglePropertyDoc(id: string, kind: PropertyDocKind): void {
  update((draft) => {
    const p = draft.properties.find((x) => x.id === id);
    const doc = p?.documents.find((d) => d.kind === kind);
    if (!p) return;
    if (doc) doc.done = !doc.done;
    else p.documents.push({ kind, done: true });
    p.updatedAt = now();
  });
}

export function setPortal(id: string, portal: Portal, state: SyndicationState, labels: ActionLabels): void {
  update((draft) => {
    const p = draft.properties.find((x) => x.id === id);
    if (!p) return;
    p.portals[portal] = state;
    p.updatedAt = now();
    log(draft, "system", labels.portalChanged(portal, state), { kind: "property", id });
  });
}

// ── Contacts ─────────────────────────────────────────────────────────────────────────

export type ContactInput = Omit<Contact, "id" | "createdAt">;

export function addContact(input: ContactInput): string {
  const id = uid("c");
  update((draft) => {
    draft.contacts.unshift({ ...input, id, createdAt: now() });
  });
  return id;
}

export function updateContact(id: string, patch: Partial<ContactInput>): void {
  update((draft) => {
    const c = draft.contacts.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
  });
}

export function setConsent(id: string, status: ConsentStatus, labels: ActionLabels, marketing?: boolean): void {
  update((draft) => {
    const c = draft.contacts.find((x) => x.id === id);
    if (!c) return;
    const today = new Date();
    c.consent.status = status;
    if (status === "granted") {
      c.consent.grantedAt = isoDate(today);
      c.consent.expiresAt = isoDate(addMonths(today, draft.settings.consentMonths));
    }
    if (status === "withdrawn") c.consent.marketing = false;
    if (marketing !== undefined) c.consent.marketing = marketing;
    log(draft, "system", labels.consent(status), { kind: "contact", id });
  });
}

export function setAml(id: string, aml: Partial<Aml>, labels: ActionLabels): void {
  update((draft) => {
    const c = draft.contacts.find((x) => x.id === id);
    if (!c) return;
    const before = c.aml.status;
    Object.assign(c.aml, aml);
    if (c.aml.status !== "none" && !c.aml.identifiedAt) c.aml.identifiedAt = isoDate(new Date());
    if (c.aml.status === "none") c.aml.identifiedAt = null;
    if (before !== c.aml.status && c.aml.status === "identified") log(draft, "system", labels.amlIdentified, { kind: "contact", id });
    if (before !== c.aml.status && c.aml.status === "verified") log(draft, "system", labels.amlVerified, { kind: "contact", id });
  });
}

// ── Demands ──────────────────────────────────────────────────────────────────────────

export type DemandInput = Omit<Demand, "id" | "receivedAt" | "firstResponseAt" | "lostReason" | "status"> & Partial<Pick<Demand, "status" | "receivedAt" | "firstResponseAt">>;

export function addDemand(input: DemandInput): string {
  const id = uid("dem");
  update((draft) => {
    draft.demands.unshift({ status: "new", receivedAt: now(), firstResponseAt: null, lostReason: null, ...input, id });
    const c = draft.contacts.find((x) => x.id === input.contactId);
    const role = input.transaction === "rent" ? "tenant" : "buyer";
    if (c && !c.roles.includes(role)) c.roles.push(role);
  });
  return id;
}

export function updateDemand(id: string, patch: Partial<DemandInput>): void {
  update((draft) => {
    const d = draft.demands.find((x) => x.id === id);
    if (d) Object.assign(d, patch);
  });
}

export function setDemandStatus(id: string, status: DemandStatus, labels: ActionLabels, lostReason?: string): void {
  update((draft) => {
    const d = draft.demands.find((x) => x.id === id);
    if (!d) return;
    d.status = status;
    if (status === "lost") d.lostReason = lostReason ?? d.lostReason;
    if (status !== "new" && d.firstResponseAt === null) d.firstResponseAt = now();
    log(draft, "stage", labels.demandStatus(status), { kind: "demand", id }, d.agentId);
  });
}

export function markDemandContacted(id: string, labels: ActionLabels): void {
  update((draft) => {
    const d = draft.demands.find((x) => x.id === id);
    if (!d) return;
    d.firstResponseAt = d.firstResponseAt ?? now();
    if (d.status === "new") d.status = "contacted";
    log(draft, "call", labels.demandContacted, { kind: "demand", id }, d.agentId);
  });
}

// ── Viewings ─────────────────────────────────────────────────────────────────────────

export type ViewingInput = Omit<Viewing, "id" | "status" | "outcome" | "feedback">;

export function scheduleViewing(input: ViewingInput, labels: ActionLabels): string {
  const id = uid("view");
  update((draft) => {
    draft.viewings.push({ ...input, id, status: "scheduled", outcome: null, feedback: "" });
    const demand = input.demandId ? draft.demands.find((d) => d.id === input.demandId) : undefined;
    if (demand && (demand.status === "new" || demand.status === "contacted" || demand.status === "qualified")) {
      demand.status = "viewing";
      demand.firstResponseAt = demand.firstResponseAt ?? now();
    }
    log(draft, "meeting", labels.viewingScheduled(propertyTitle(draft, input.propertyId)), { kind: "contact", id: input.contactId }, input.agentId);
  });
  return id;
}

export function completeViewing(id: string, outcome: ViewingOutcome, feedback: string, labels: ActionLabels): void {
  update((draft) => {
    const v = draft.viewings.find((x) => x.id === id);
    if (!v) return;
    v.status = "done";
    v.outcome = outcome;
    v.feedback = feedback;
    log(draft, "meeting", labels.viewingOutcome(outcome), { kind: "contact", id: v.contactId }, v.agentId);
  });
}

export function setViewingStatus(id: string, status: ViewingStatus, labels: ActionLabels): void {
  update((draft) => {
    const v = draft.viewings.find((x) => x.id === id);
    if (!v) return;
    v.status = status;
    log(draft, "meeting", labels.viewingStatus(status), { kind: "contact", id: v.contactId }, v.agentId);
  });
}

// ── Deals ────────────────────────────────────────────────────────────────────────────

export interface DealInput {
  propertyId: string;
  buyerId: string;
  sellerId: string;
  demandId: string | null;
  transaction: Deal["transaction"];
  agreedPrice: number;
  commission: Deal["commission"];
  expectedClose: string;
  agentId: string;
  notes?: string;
}

export function createDeal(input: DealInput, labels: ActionLabels): string {
  const id = uid("deal");
  update((draft) => {
    const at = now();
    draft.deals.unshift({
      id, propertyId: input.propertyId, demandId: input.demandId, buyerId: input.buyerId, sellerId: input.sellerId,
      transaction: input.transaction, stage: "offer", status: "open", stageHistory: [{ stage: "offer", at }],
      agreedPrice: input.agreedPrice, commission: input.commission, expectedClose: input.expectedClose, agentId: input.agentId,
      checklist: freshChecklist(input.transaction), reservation: null, financing: null, lostReason: null, closedAt: null,
      notes: input.notes ?? "", createdAt: at,
    });
    const demand = input.demandId ? draft.demands.find((d) => d.id === input.demandId) : undefined;
    if (demand) demand.status = "offer";
    log(draft, "stage", labels.dealCreated(propertyTitle(draft, input.propertyId)), { kind: "deal", id }, input.agentId);
  });
  return id;
}

/** Keep the listing's status in step with where its deal stands. */
function syncProperty(draft: Workspace, deal: Deal): void {
  const p = draft.properties.find((x) => x.id === deal.propertyId);
  if (!p) return;
  const stages = stagesFor(deal.transaction);
  if (deal.status === "won") {
    p.status = deal.transaction === "sale" ? "sold" : "rented";
    for (const key of Object.keys(p.portals) as Portal[]) if (p.portals[key] === "live") p.portals[key] = "off";
  } else if (deal.status === "open" && stages.indexOf(deal.stage) >= stages.indexOf("reservation")) {
    p.status = "reserved";
  } else if (deal.status === "open" && deal.stage === "offer" && p.status === "reserved") {
    p.status = "active";
  }
  p.updatedAt = now();
}

export function moveDeal(id: string, stage: DealStage, labels: ActionLabels): void {
  update((draft) => {
    const deal = draft.deals.find((x) => x.id === id);
    if (!deal || deal.status !== "open" || deal.stage === stage) return;
    const at = now();
    deal.stage = stage;
    deal.stageHistory.push({ stage, at });
    if (stage === "closed") {
      deal.status = "won";
      deal.closedAt = at;
      const demand = deal.demandId ? draft.demands.find((d) => d.id === deal.demandId) : undefined;
      if (demand) demand.status = "won";
      log(draft, "stage", labels.dealClosed(propertyTitle(draft, deal.propertyId)), { kind: "deal", id }, deal.agentId);
    } else {
      log(draft, "stage", labels.stageChanged(stage), { kind: "deal", id }, deal.agentId);
    }
    syncProperty(draft, deal);
  });
}

export function toggleChecklist(dealId: string, key: ChecklistKey): void {
  update((draft) => {
    const item = draft.deals.find((x) => x.id === dealId)?.checklist.find((c) => c.key === key);
    if (!item) return;
    item.done = !item.done;
    item.doneAt = item.done ? now() : null;
  });
}

export type DealTerms = Partial<Pick<Deal, "agreedPrice" | "commission" | "expectedClose" | "reservation" | "financing" | "notes">>;

export function setDealTerms(id: string, patch: DealTerms): void {
  update((draft) => {
    const deal = draft.deals.find((x) => x.id === id);
    if (deal) Object.assign(deal, patch);
  });
}

export function markDealLost(id: string, reason: string, labels: ActionLabels): void {
  update((draft) => {
    const deal = draft.deals.find((x) => x.id === id);
    if (!deal || deal.status !== "open") return;
    deal.status = "lost";
    deal.lostReason = reason;
    deal.closedAt = now();
    const demand = deal.demandId ? draft.demands.find((d) => d.id === deal.demandId) : undefined;
    if (demand) {
      demand.status = "lost";
      demand.lostReason = reason;
    }
    const p = draft.properties.find((x) => x.id === deal.propertyId);
    if (p && p.status === "reserved") p.status = "active";
    log(draft, "stage", labels.dealLost(reason), { kind: "deal", id }, deal.agentId);
  });
}

// ── Leases ───────────────────────────────────────────────────────────────────────────

/** One rent payment per month of the term, due on the 5th; at most two years ahead. */
export function generatePayments(start: string, end: string, rent: number, paidUntil: string | null): Payment[] {
  const payments: Payment[] = [];
  const first = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  for (let i = 0; i < 24; i++) {
    const month = addMonths(new Date(first.getFullYear(), first.getMonth(), 1, 12), i);
    if (month > last) break;
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    const due = `${key}-05`;
    payments.push({ id: `pay-${key}`, month: key, due, amount: rent, paidAt: paidUntil && key <= paidUntil ? `${key}-03` : null });
  }
  return payments;
}

export type LeaseInput = Omit<Lease, "id" | "payments" | "protocols" | "status"> & { status?: LeaseStatus };

export function addLease(input: LeaseInput, labels: ActionLabels): string {
  const id = uid("lease");
  update((draft) => {
    const today = isoDate(new Date());
    draft.leases.unshift({ ...input, id, status: input.status ?? "active", payments: generatePayments(input.start, input.end, input.rent, today < input.start ? null : today.slice(0, 7)), protocols: [] });
    const p = draft.properties.find((x) => x.id === input.propertyId);
    if (p) p.status = "rented";
    log(draft, "system", labels.leaseCreated(propertyTitle(draft, input.propertyId)), { kind: "lease", id }, input.agentId);
  });
  return id;
}

export function markPaymentPaid(leaseId: string, paymentId: string, labels: ActionLabels): void {
  update((draft) => {
    const lease = draft.leases.find((x) => x.id === leaseId);
    const payment = lease?.payments.find((p) => p.id === paymentId);
    if (!lease || !payment) return;
    payment.paidAt = payment.paidAt ? null : isoDate(new Date());
    if (payment.paidAt) log(draft, "system", labels.paymentMarked(payment.month), { kind: "lease", id: leaseId }, lease.agentId);
  });
}

export function addProtocol(leaseId: string, protocol: Omit<HandoverProtocol, "id">, labels: ActionLabels): void {
  update((draft) => {
    const lease = draft.leases.find((x) => x.id === leaseId);
    if (!lease) return;
    lease.protocols.push({ ...protocol, id: uid("prot") });
    if (protocol.kind === "moveOut") {
      lease.status = "ended";
      const p = draft.properties.find((x) => x.id === lease.propertyId);
      if (p && p.status === "rented") p.status = "active";
    }
    log(draft, "system", labels.protocolAdded(protocol.kind), { kind: "lease", id: leaseId }, lease.agentId);
  });
}

export function setLeaseStatus(leaseId: string, status: LeaseStatus): void {
  update((draft) => {
    const lease = draft.leases.find((x) => x.id === leaseId);
    if (lease) lease.status = status;
  });
}

// ── Documents ────────────────────────────────────────────────────────────────────────

export function addDocument(templateId: TemplateId, link: EntityLink, labels: ActionLabels): string {
  const id = uid("doc");
  update((draft) => {
    const doc: DocumentItem = { id, templateId, link, status: "draft", createdAt: now(), signedAt: null };
    draft.documents.unshift(doc);
    log(draft, "system", labels.documentCreated(labels.templateTitle(templateId)), link);
  });
  return id;
}

export function setDocumentStatus(id: string, status: DocStatus, labels: ActionLabels): void {
  update((draft) => {
    const doc = draft.documents.find((x) => x.id === id);
    if (!doc) return;
    doc.status = status;
    doc.signedAt = status === "signed" ? isoDate(new Date()) : doc.signedAt;
    if (status === "signed") {
      // A signed contract ticks the matching checklist item of its deal.
      const deal = doc.link.kind === "deal" ? draft.deals.find((d) => d.id === doc.link.id) : undefined;
      const keyFor: Partial<Record<TemplateId, ChecklistKey>> = { reservation: "reservationAgreement", purchase: "purchaseContract", lease: "leaseContract", handover: "handoverProtocol", cadastreFiling: "cadastreFiled" };
      const key = keyFor[doc.templateId];
      const item = key ? deal?.checklist.find((c) => c.key === key) : undefined;
      if (item && !item.done) {
        item.done = true;
        item.doneAt = now();
      }
    }
    log(draft, "system", labels.documentStatus(labels.templateTitle(doc.templateId), status), doc.link);
  });
}

export function removeDocument(id: string): void {
  update((draft) => {
    draft.documents = draft.documents.filter((d) => d.id !== id);
  });
}

// ── Tasks ────────────────────────────────────────────────────────────────────────────

export function addTask(input: Omit<Task, "id" | "createdAt" | "done">): string {
  const id = uid("task");
  update((draft) => {
    draft.tasks.unshift({ ...input, id, done: false, createdAt: now() });
  });
  return id;
}

export function toggleTask(id: string): void {
  update((draft) => {
    const t = draft.tasks.find((x) => x.id === id);
    if (t) t.done = !t.done;
  });
}

export function deleteTask(id: string): void {
  update((draft) => {
    draft.tasks = draft.tasks.filter((t) => t.id !== id);
  });
}

// ── Team, settings, notes ────────────────────────────────────────────────────────────

export function addAgent(input: Omit<Agent, "id">): string {
  const id = uid("ag");
  update((draft) => {
    draft.agents.push({ ...input, id });
  });
  return id;
}

export function updateAgent(id: string, patch: Partial<Omit<Agent, "id">>): void {
  update((draft) => {
    const a = draft.agents.find((x) => x.id === id);
    if (a) Object.assign(a, patch);
  });
}

export function updateSettings(patch: Partial<Settings>): void {
  update((draft) => {
    Object.assign(draft.settings, patch);
  });
}

export function addNote(type: ActivityType, text: string, link: EntityLink | null): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  update((draft) => log(draft, type, trimmed, link));
}

export function resetWorkspace(locale: WorkspaceLocale): void {
  replaceWorkspace(seedWorkspace(locale));
}

/** Import a JSON export; throws on anything this version cannot read. */
export function importWorkspace(json: string): void {
  replaceWorkspace(parseWorkspace(JSON.parse(json)));
}
