/**
 * metrics.ts — everything the workspace computes: matching demand to supply, commission
 * money, the overview's KPIs and attention list, the reports. Pure functions of a
 * workspace and a clock, so every number on screen is testable without a browser.
 */
import {
  OPEN_DEMAND_STATUSES, STAGE_PROBABILITY, addMonths, daysBetween, isoDate, monthKey, stagesFor,
  type Agent, type Commission, type Contact, type Deal, type DealStage, type Demand, type Lease, type Payment,
  type Property, type Source, type Transaction, type Viewing, type Workspace,
} from "./model";

// ── Matching: a demand against a listing ────────────────────────────────────────────

export type MatchCriterion = "transaction" | "type" | "location" | "budget" | "rooms" | "area" | "mustHaves";

export interface MatchResult {
  score: number;
  reasons: { criterion: MatchCriterion; ok: boolean; partial?: boolean }[];
}

const AVAILABLE_FOR_MATCH = new Set(["active", "preparation"]);

function norm(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase();
}

/** 0–100 with the reasons behind it; 0 when the basics (transaction, availability) fail. */
export function scoreMatch(demand: Demand, property: Property): MatchResult {
  const reasons: MatchResult["reasons"] = [];
  if (demand.transaction !== property.transaction || !AVAILABLE_FOR_MATCH.has(property.status)) {
    return { score: 0, reasons: [{ criterion: "transaction", ok: false }] };
  }
  let score = 0;
  const typeOk = demand.types.length === 0 || demand.types.includes(property.type);
  reasons.push({ criterion: "type", ok: typeOk });
  if (typeOk) score += 30;

  const where = norm(`${property.city} ${property.district} ${property.region}`);
  const locationOk = demand.locations.length === 0 || demand.locations.some((l) => where.includes(norm(l)));
  reasons.push({ criterion: "location", ok: locationOk });
  if (locationOk) score += 25;

  if (property.price <= demand.budgetMax) {
    score += 25;
    reasons.push({ criterion: "budget", ok: true });
  } else if (property.price <= demand.budgetMax * 1.1) {
    score += 12;
    reasons.push({ criterion: "budget", ok: true, partial: true });
  } else {
    reasons.push({ criterion: "budget", ok: false });
  }

  const roomsOk = demand.roomsMin === null || property.rooms >= demand.roomsMin;
  reasons.push({ criterion: "rooms", ok: roomsOk });
  if (roomsOk) score += 8;

  const areaOk = demand.areaMin === null || property.area >= demand.areaMin;
  reasons.push({ criterion: "area", ok: areaOk });
  if (areaOk) score += 7;

  if (demand.mustHaves.length > 0) {
    const hits = demand.mustHaves.filter((f) => property.features.includes(f)).length;
    const all = hits === demand.mustHaves.length;
    score += Math.round((5 * hits) / demand.mustHaves.length);
    reasons.push({ criterion: "mustHaves", ok: all, partial: !all && hits > 0 });
  } else {
    score += 5;
  }
  return { score: Math.min(100, score), reasons };
}

export interface RankedProperty {
  property: Property;
  match: MatchResult;
}

export function matchesForDemand(ws: Workspace, demand: Demand, minScore = 40): RankedProperty[] {
  return ws.properties
    .map((property) => ({ property, match: scoreMatch(demand, property) }))
    .filter((r) => r.match.score >= minScore)
    .sort((a, b) => b.match.score - a.match.score);
}

export interface RankedDemand {
  demand: Demand;
  match: MatchResult;
}

export function demandsForProperty(ws: Workspace, property: Property, minScore = 40): RankedDemand[] {
  return ws.demands
    .filter((d) => OPEN_DEMAND_STATUSES.includes(d.status))
    .map((demand) => ({ demand, match: scoreMatch(demand, property) }))
    .filter((r) => r.match.score >= minScore)
    .sort((a, b) => b.match.score - a.match.score);
}

// ── Money ────────────────────────────────────────────────────────────────────────────

/** The agency's gross commission on a deal: % of price, a fixed sum, or N months' rent. */
export function commissionAmount(commission: Commission, price: number): number {
  switch (commission.basis) {
    case "percent":
      return Math.round((price * commission.value) / 100);
    case "fixed":
      return commission.value;
    case "months":
      return Math.round(price * commission.value);
  }
}

export interface CommissionBreakdown {
  gross: number;
  vat: number;
  total: number;
  agentShare: number;
  agencyShare: number;
}

export function commissionBreakdown(deal: Deal, agent: Agent | undefined, vatPct: number): CommissionBreakdown {
  const gross = commissionAmount(deal.commission, deal.agreedPrice);
  const vat = Math.round((gross * vatPct) / 100);
  const split = agent?.split ?? 0;
  const agentShare = Math.round((gross * split) / 100);
  return { gross, vat, total: gross + vat, agentShare, agencyShare: gross - agentShare };
}

export function weightedCommission(deal: Deal): number {
  return Math.round(commissionAmount(deal.commission, deal.agreedPrice) * STAGE_PROBABILITY[deal.stage]);
}

// ── Deals ────────────────────────────────────────────────────────────────────────────

export function isOpenDeal(deal: Deal): boolean {
  return deal.status === "open";
}

export function stageEnteredAt(deal: Deal): string {
  const last = deal.stageHistory[deal.stageHistory.length - 1];
  return last?.at ?? deal.createdAt;
}

export function daysInStage(deal: Deal, now: Date): number {
  return Math.max(0, daysBetween(stageEnteredAt(deal), now.toISOString()));
}

export function isStaleDeal(deal: Deal, now: Date, staleDays: number): boolean {
  return deal.status === "open" && daysInStage(deal, now) >= staleDays;
}

export function openChecklist(deal: Deal, stage: DealStage = deal.stage) {
  return deal.checklist.filter((item) => item.stage === stage && !item.done);
}

/** Open items at the current station and every earlier one — what blocks the next step. */
export function blockingItems(deal: Deal) {
  const stages = stagesFor(deal.transaction);
  const index = stages.indexOf(deal.stage);
  const passed = new Set(stages.slice(0, index + 1));
  return deal.checklist.filter((item) => passed.has(item.stage) && !item.done);
}

export function nextStage(deal: Deal): DealStage | null {
  const stages = stagesFor(deal.transaction);
  const index = stages.indexOf(deal.stage);
  return index >= 0 && index < stages.length - 1 ? stages[index + 1]! : null;
}

export function previousStage(deal: Deal): DealStage | null {
  const stages = stagesFor(deal.transaction);
  const index = stages.indexOf(deal.stage);
  return index > 0 ? stages[index - 1]! : null;
}

/** AML status of both parties — the identification the law wants before the contracts. */
export function dealAmlGap(deal: Deal, contact: (id: string) => Contact | undefined): Contact[] {
  return [deal.buyerId, deal.sellerId]
    .map((id) => contact(id))
    .filter((c): c is Contact => c !== undefined && c.aml.status === "none");
}

// ── Properties ───────────────────────────────────────────────────────────────────────

export function daysOnMarket(property: Property, now: Date): number {
  return Math.max(0, daysBetween(property.listedAt, now.toISOString()));
}

export function livePortals(property: Property): number {
  return Object.values(property.portals).filter((s) => s === "live").length;
}

export function missingDocuments(property: Property) {
  return property.documents.filter((d) => !d.done);
}

/** Zákon 555/2005 applies to buildings: a plot or a garage has no energy class to state. */
export function needsEnergyCertificate(property: Property): boolean {
  return property.type !== "land" && property.type !== "garage";
}

export function energyCertificateMissing(property: Property): boolean {
  if (!needsEnergyCertificate(property)) return false;
  return property.energyClass === "missing" || !property.documents.some((d) => d.kind === "energyCertificate" && d.done);
}

// ── Leases ───────────────────────────────────────────────────────────────────────────

export function overduePayments(lease: Lease, now: Date): Payment[] {
  const today = isoDate(now);
  return lease.payments.filter((p) => !p.paidAt && p.due < today);
}

export function daysToLeaseEnd(lease: Lease, now: Date): number {
  return daysBetween(isoDate(now), lease.end);
}

export function monthlyRentRoll(ws: Workspace): number {
  return ws.leases.filter((l) => l.status !== "ended").reduce((sum, l) => sum + l.rent, 0);
}

// ── Demands and viewings ─────────────────────────────────────────────────────────────

export function hoursSince(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / 3_600_000;
}

export function isUnanswered(demand: Demand, now: Date, slaHours: number): boolean {
  return demand.status === "new" && demand.firstResponseAt === null && hoursSince(demand.receivedAt, now) > slaHours;
}

export function viewingsOn(ws: Workspace, day: string): Viewing[] {
  return ws.viewings
    .filter((v) => v.status === "scheduled" && isoDate(new Date(v.start)) === day)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function startOfWeek(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

// ── Overview ─────────────────────────────────────────────────────────────────────────

export interface Kpis {
  activeListings: number;
  newDemands7d: number;
  viewingsThisWeek: number;
  openDeals: number;
  pipelineCommission: number;
  tasksDueToday: number;
}

export function kpis(ws: Workspace, now: Date, agentId: string | null): Kpis {
  const mine = <T extends { agentId: string }>(items: T[]) => (agentId ? items.filter((x) => x.agentId === agentId) : items);
  const today = isoDate(now);
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const deals = mine(ws.deals).filter(isOpenDeal);
  return {
    activeListings: mine(ws.properties).filter((p) => p.status === "active" || p.status === "reserved").length,
    newDemands7d: mine(ws.demands).filter((d) => d.receivedAt >= sevenDaysAgo).length,
    viewingsThisWeek: mine(ws.viewings).filter((v) => {
      const t = new Date(v.start);
      return v.status === "scheduled" && t >= weekStart && t < weekEnd;
    }).length,
    openDeals: deals.length,
    pipelineCommission: deals.reduce((sum, d) => sum + weightedCommission(d), 0),
    tasksDueToday: mine(ws.tasks).filter((t) => !t.done && t.due <= today).length,
  };
}

export type AttentionKind =
  | "unansweredDemand" | "viewingToday" | "reservationExpiring" | "amlMissing" | "energyCertificateMissing"
  | "exclusivityEnding" | "leaseEnding" | "rentOverdue" | "consentExpiring" | "staleDeal" | "taskOverdue" | "longOnMarket";

export interface AttentionItem {
  kind: AttentionKind;
  /** Record the item is about, for the link. */
  link: { kind: "property" | "contact" | "demand" | "deal" | "lease" | "viewing" | "task"; id: string };
  /** The number the message quotes: hours, days, euros… */
  value: number;
  /** A name to show: property title, contact name, task title. */
  subject: string;
  tone: "warn" | "bad" | "info";
}

export function attention(ws: Workspace, now: Date, agentId: string | null, contactName: (c: Contact) => string): AttentionItem[] {
  const mine = <T extends { agentId: string }>(items: T[]) => (agentId ? items.filter((x) => x.agentId === agentId) : items);
  const today = isoDate(now);
  const items: AttentionItem[] = [];
  const property = (id: string) => ws.properties.find((p) => p.id === id);
  const contact = (id: string) => ws.contacts.find((c) => c.id === id);

  for (const d of mine(ws.demands)) {
    if (isUnanswered(d, now, ws.settings.leadSlaHours)) {
      const c = contact(d.contactId);
      items.push({ kind: "unansweredDemand", link: { kind: "demand", id: d.id }, value: Math.floor(hoursSince(d.receivedAt, now)), subject: c ? contactName(c) : d.id, tone: "bad" });
    }
  }
  for (const v of mine(ws.viewings)) {
    if (v.status === "scheduled" && isoDate(new Date(v.start)) === today) {
      items.push({ kind: "viewingToday", link: { kind: "viewing", id: v.id }, value: 0, subject: property(v.propertyId)?.title ?? v.id, tone: "info" });
    }
  }
  for (const deal of mine(ws.deals).filter(isOpenDeal)) {
    const title = property(deal.propertyId)?.title ?? deal.id;
    if (deal.stage === "reservation" && deal.reservation) {
      const left = daysBetween(today, deal.reservation.until);
      if (left <= 7) items.push({ kind: "reservationExpiring", link: { kind: "deal", id: deal.id }, value: left, subject: title, tone: left < 0 ? "bad" : "warn" });
    }
    const stages = stagesFor(deal.transaction);
    if (stages.indexOf(deal.stage) >= stages.indexOf("contracts")) {
      const gap = dealAmlGap(deal, contact);
      if (gap.length > 0) items.push({ kind: "amlMissing", link: { kind: "deal", id: deal.id }, value: gap.length, subject: gap.map(contactName).join(", "), tone: "bad" });
    }
    if (isStaleDeal(deal, now, ws.settings.staleDealDays)) {
      items.push({ kind: "staleDeal", link: { kind: "deal", id: deal.id }, value: daysInStage(deal, now), subject: title, tone: "warn" });
    }
  }
  for (const p of mine(ws.properties)) {
    if (p.status === "active" && energyCertificateMissing(p)) {
      items.push({ kind: "energyCertificateMissing", link: { kind: "property", id: p.id }, value: 0, subject: p.title, tone: "warn" });
    }
    if ((p.status === "active" || p.status === "reserved") && p.exclusivity.type === "exclusive" && p.exclusivity.until) {
      const left = daysBetween(today, p.exclusivity.until);
      if (left <= 30) items.push({ kind: "exclusivityEnding", link: { kind: "property", id: p.id }, value: left, subject: p.title, tone: left < 0 ? "bad" : "warn" });
    }
    if (p.status === "active" && daysOnMarket(p, now) >= 120) {
      items.push({ kind: "longOnMarket", link: { kind: "property", id: p.id }, value: daysOnMarket(p, now), subject: p.title, tone: "info" });
    }
  }
  for (const lease of mine(ws.leases)) {
    if (lease.status === "ended") continue;
    const left = daysToLeaseEnd(lease, now);
    if (left <= 60) items.push({ kind: "leaseEnding", link: { kind: "lease", id: lease.id }, value: left, subject: property(lease.propertyId)?.title ?? lease.id, tone: left <= 30 ? "warn" : "info" });
    const overdue = overduePayments(lease, now);
    if (overdue.length > 0) {
      items.push({ kind: "rentOverdue", link: { kind: "lease", id: lease.id }, value: overdue.reduce((s, p) => s + p.amount, 0), subject: property(lease.propertyId)?.title ?? lease.id, tone: "bad" });
    }
  }
  for (const c of mine(ws.contacts)) {
    if (c.consent.status === "granted" && c.consent.expiresAt) {
      const left = daysBetween(today, c.consent.expiresAt);
      if (left <= 30) items.push({ kind: "consentExpiring", link: { kind: "contact", id: c.id }, value: left, subject: contactName(c), tone: left < 0 ? "bad" : "warn" });
    }
  }
  for (const t of mine(ws.tasks)) {
    if (!t.done && t.due < today) items.push({ kind: "taskOverdue", link: { kind: "task", id: t.id }, value: daysBetween(t.due, today), subject: t.title, tone: "bad" });
  }
  const order: Record<AttentionItem["tone"], number> = { bad: 0, warn: 1, info: 2 };
  return items.sort((a, b) => order[a.tone] - order[b.tone]);
}

// ── Reports ──────────────────────────────────────────────────────────────────────────

export interface Funnel {
  demands: number;
  viewings: number;
  offers: number;
  won: number;
}

export function funnel(ws: Workspace, since: Date): Funnel {
  const sinceIso = since.toISOString();
  const demands = ws.demands.filter((d) => d.receivedAt >= sinceIso);
  const demandIds = new Set(demands.map((d) => d.id));
  const viewed = new Set(ws.viewings.filter((v) => v.demandId && demandIds.has(v.demandId) && v.status !== "cancelled").map((v) => v.demandId));
  const offers = ws.deals.filter((d) => d.createdAt >= sinceIso);
  return {
    demands: demands.length,
    viewings: viewed.size,
    offers: offers.length,
    won: offers.filter((d) => d.status === "won").length,
  };
}

export function averageDaysOnMarket(ws: Workspace): number | null {
  const sold = ws.deals.filter((d) => d.status === "won" && d.closedAt);
  const days = sold
    .map((d) => {
      const p = ws.properties.find((x) => x.id === d.propertyId);
      return p ? daysBetween(p.listedAt, d.closedAt!) : null;
    })
    .filter((n): n is number => n !== null && n >= 0);
  if (days.length === 0) return null;
  return Math.round(days.reduce((a, b) => a + b, 0) / days.length);
}

export interface MonthBucket {
  month: string;
  amount: number;
  deals: number;
}

export function commissionByMonth(ws: Workspace, now: Date, months: number): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    buckets.push({ month: monthKey(addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -i)), amount: 0, deals: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.month, b]));
  for (const deal of ws.deals) {
    if (deal.status !== "won" || !deal.closedAt) continue;
    const b = byKey.get(monthKey(deal.closedAt));
    if (!b) continue;
    b.amount += commissionAmount(deal.commission, deal.agreedPrice);
    b.deals += 1;
  }
  return buckets;
}

export interface AgentRow {
  agent: Agent;
  activeListings: number;
  openDeals: number;
  wonDeals: number;
  gross: number;
  agentShare: number;
}

export function byAgent(ws: Workspace, since: Date): AgentRow[] {
  const sinceIso = since.toISOString();
  return ws.agents.map((agent) => {
    const won = ws.deals.filter((d) => d.agentId === agent.id && d.status === "won" && d.closedAt && d.closedAt >= sinceIso);
    const gross = won.reduce((s, d) => s + commissionAmount(d.commission, d.agreedPrice), 0);
    return {
      agent,
      activeListings: ws.properties.filter((p) => p.agentId === agent.id && (p.status === "active" || p.status === "reserved")).length,
      openDeals: ws.deals.filter((d) => d.agentId === agent.id && d.status === "open").length,
      wonDeals: won.length,
      gross,
      agentShare: Math.round((gross * agent.split) / 100),
    };
  });
}

export interface SourceRow {
  source: Source;
  demands: number;
  won: number;
}

export function bySource(ws: Workspace, since: Date): SourceRow[] {
  const sinceIso = since.toISOString();
  const rows = new Map<Source, SourceRow>();
  for (const d of ws.demands) {
    if (d.receivedAt < sinceIso) continue;
    const row = rows.get(d.source) ?? { source: d.source, demands: 0, won: 0 };
    row.demands += 1;
    if (d.status === "won") row.won += 1;
    rows.set(d.source, row);
  }
  return [...rows.values()].sort((a, b) => b.demands - a.demands);
}

export function inventoryByStatus(ws: Workspace): { status: Property["status"]; count: number }[] {
  const counts = new Map<Property["status"], number>();
  for (const p of ws.properties) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
  return [...counts.entries()].map(([status, count]) => ({ status, count }));
}

export function dealsByStage(ws: Workspace, transaction: Transaction): { stage: DealStage; count: number; weighted: number }[] {
  return stagesFor(transaction)
    .filter((s) => s !== "closed")
    .map((stage) => {
      const deals = ws.deals.filter((d) => d.status === "open" && d.transaction === transaction && d.stage === stage);
      return { stage, count: deals.length, weighted: deals.reduce((s, d) => s + weightedCommission(d), 0) };
    });
}

/** Per-agent statement for one month: the closed deals and their shares. */
export function statementFor(ws: Workspace, agentId: string, month: string, vatPct: number) {
  const agent = ws.agents.find((a) => a.id === agentId);
  const deals = ws.deals.filter((d) => d.agentId === agentId && d.status === "won" && d.closedAt && monthKey(d.closedAt) === month);
  const rows = deals.map((deal) => ({ deal, ...commissionBreakdown(deal, agent, vatPct) }));
  return {
    rows,
    gross: rows.reduce((s, r) => s + r.gross, 0),
    agentShare: rows.reduce((s, r) => s + r.agentShare, 0),
    agencyShare: rows.reduce((s, r) => s + r.agencyShare, 0),
  };
}
