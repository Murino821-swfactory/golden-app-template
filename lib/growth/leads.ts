/**
 * leads.ts — who gets what, when. A lead comes from one of three doors (contacted us,
 * newsletter, account) and gets that door's sequence: welcome, a value e-mail, an offer, a
 * reminder — each due a number of days after the lead arrived. A static prototype sends
 * nothing by itself; a due step opens in the visitor's mail client (`mailto:`) with the
 * subject and body filled in, and is ticked off here. Pure; the words are in `copy.ts`.
 */
import type { GrowthCopy, LeadSource, StepKind } from "./copy";
import { SITE_URL } from "./plan";

export interface Lead {
  id: string;
  name: string;
  email: string;
  source: LeadSource;
  /** `YYYY-MM-DD` the lead arrived. */
  since: string;
  /** Step ids already sent. */
  sent: string[];
}

export interface SequenceStep {
  id: string;
  kind: StepKind;
  /** Days after `since`. */
  day: number;
}

export const SEQUENCES: Record<LeadSource, readonly SequenceStep[]> = {
  contact: [
    { id: "welcome", kind: "welcome", day: 0 },
    { id: "value-1", kind: "value", day: 3 },
    { id: "offer", kind: "offer", day: 7 },
    { id: "reminder", kind: "reminder", day: 14 },
  ],
  newsletter: [
    { id: "welcome", kind: "welcome", day: 0 },
    { id: "value-1", kind: "value", day: 7 },
    { id: "offer", kind: "offer", day: 14 },
    { id: "value-2", kind: "value", day: 21 },
  ],
  account: [
    { id: "welcome", kind: "welcome", day: 0 },
    { id: "reminder", kind: "reminder", day: 2 },
    { id: "offer", kind: "offer", day: 7 },
    { id: "value-1", kind: "value", day: 14 },
  ],
};

export const LEAD_SOURCES: readonly LeadSource[] = ["contact", "newsletter", "account"];

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function newLead(input: { name: string; email: string; source: LeadSource }, today: string): Lead | null {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !isEmail(email)) return null;
  return { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, name, email, source: input.source, since: today, sent: [] };
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000);
}

export interface StepStatus {
  step: SequenceStep;
  dueOn: string;
  /** Days until due; negative when overdue. */
  daysLeft: number;
}

/** Unsent steps whose day has come, earliest first. */
export function dueSteps(lead: Lead, today: string): StepStatus[] {
  return SEQUENCES[lead.source]
    .filter((s) => !lead.sent.includes(s.id))
    .map((step) => ({ step, dueOn: addDays(lead.since, step.day), daysLeft: step.day - daysBetween(lead.since, today) }))
    .filter((s) => s.daysLeft <= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** The first unsent step still ahead, if any. */
export function nextStep(lead: Lead, today: string): StepStatus | null {
  const ahead = SEQUENCES[lead.source]
    .filter((s) => !lead.sent.includes(s.id))
    .map((step) => ({ step, dueOn: addDays(lead.since, step.day), daysLeft: step.day - daysBetween(lead.since, today) }))
    .filter((s) => s.daysLeft > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  return ahead[0] ?? null;
}

export function markSent(lead: Lead, stepId: string): Lead {
  return lead.sent.includes(stepId) ? lead : { ...lead, sent: [...lead.sent, stepId] };
}

export function emailFor(step: SequenceStep, lead: Lead, copy: GrowthCopy, opts: { coupon?: string; siteUrl?: string } = {}): { subject: string; body: string } {
  const words = copy.leads.emails[step.kind];
  const link = opts.siteUrl ?? SITE_URL;
  return { subject: words.subject(lead.name), body: words.body(lead.name, link, (opts.coupon ?? "").trim()) };
}

export function mailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function leadsSummary(leads: readonly Lead[], today: string): { total: number; due: number; bySource: Record<LeadSource, number> } {
  const bySource = { contact: 0, newsletter: 0, account: 0 } as Record<LeadSource, number>;
  let due = 0;
  for (const lead of leads) {
    bySource[lead.source] += 1;
    due += dueSteps(lead, today).length;
  }
  return { total: leads.length, due, bySource };
}

export function parseLeads(raw: string | null): Lead[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is Lead =>
        typeof l === "object" && l !== null && typeof (l as Lead).id === "string" && typeof (l as Lead).email === "string" && LEAD_SOURCES.includes((l as Lead).source) && Array.isArray((l as Lead).sent)
    );
  } catch {
    return [];
  }
}
