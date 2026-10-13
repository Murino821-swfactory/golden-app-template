import type { Invoice, InvoiceLine, Member, TimeEntry } from "./types";
import { daysBetween } from "./dates";

/** Money from time: minutes × rate, rounded to the cent. */
export function entryAmount(entry: Pick<TimeEntry, "minutes" | "rate" | "billable">): number {
  if (!entry.billable) return 0;
  return Math.round(((entry.minutes / 60) * entry.rate) * 100) / 100;
}

export function hours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/** Work done and billable but not yet on any invoice. */
export function workInProgress(entries: readonly TimeEntry[]): { minutes: number; amount: number } {
  const open = entries.filter((e) => e.billable && !e.invoiceId);
  return {
    minutes: open.reduce((n, e) => n + e.minutes, 0),
    amount: Math.round(open.reduce((n, e) => n + entryAmount(e), 0) * 100) / 100,
  };
}

export function invoiceSubtotal(invoice: Pick<Invoice, "lines">): number {
  return Math.round(invoice.lines.reduce((n, l) => n + l.quantity * l.unitPrice, 0) * 100) / 100;
}

export function invoiceTotal(invoice: Pick<Invoice, "lines" | "vatRate">): number {
  const subtotal = invoiceSubtotal(invoice);
  return Math.round(subtotal * (1 + invoice.vatRate / 100) * 100) / 100;
}

export type AgingBucket = "current" | "1-30" | "31-60" | "61+";

export function agingBucket(invoice: Pick<Invoice, "dueAt" | "status">, today: string): AgingBucket | null {
  if (invoice.status !== "sent" && invoice.status !== "overdue") return null;
  const late = daysBetween(invoice.dueAt, today);
  if (late <= 0) return "current";
  if (late <= 30) return "1-30";
  if (late <= 60) return "31-60";
  return "61+";
}

/** Receivables: sent and overdue invoices, grouped by how late they are. */
export function receivables(invoices: readonly Invoice[], today: string): Record<AgingBucket, number> & { total: number } {
  const out = { current: 0, "1-30": 0, "31-60": 0, "61+": 0, total: 0 };
  for (const inv of invoices) {
    const bucket = agingBucket(inv, today);
    if (!bucket) continue;
    const total = invoiceTotal(inv);
    out[bucket] = Math.round((out[bucket] + total) * 100) / 100;
    out.total = Math.round((out.total + total) * 100) / 100;
  }
  return out;
}

/** Lines for a draft invoice from unbilled entries of one matter, one line per activity. */
export function linesFromEntries(entries: readonly TimeEntry[], describe: (activity: TimeEntry["activity"]) => string): InvoiceLine[] {
  const groups = new Map<string, { minutes: number; rate: number; activity: TimeEntry["activity"] }>();
  for (const e of entries) {
    if (!e.billable || e.invoiceId) continue;
    const key = `${e.activity}:${e.rate}`;
    const g = groups.get(key) ?? { minutes: 0, rate: e.rate, activity: e.activity };
    g.minutes += e.minutes;
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({ description: describe(g.activity), quantity: hours(g.minutes), unit: "h" as const, unitPrice: g.rate }));
}

export interface MemberUtilisation {
  memberId: string;
  billableMinutes: number;
  totalMinutes: number;
  /** Billable hours as a share of planned capacity for the period, 0–1 (may exceed 1). */
  utilisation: number;
}

/** Billable time per member between two dates, against each member's weekly capacity. */
export function utilisation(members: readonly Member[], entries: readonly TimeEntry[], from: string, to: string): MemberUtilisation[] {
  const weeks = Math.max(1, daysBetween(from, to) / 7);
  return members.map((m) => {
    const mine = entries.filter((e) => e.memberId === m.id && e.date >= from && e.date <= to);
    const billableMinutes = mine.filter((e) => e.billable).reduce((n, e) => n + e.minutes, 0);
    const totalMinutes = mine.reduce((n, e) => n + e.minutes, 0);
    const capacity = m.capacityHoursWeek * weeks * 60;
    return { memberId: m.id, billableMinutes, totalMinutes, utilisation: capacity > 0 ? billableMinutes / capacity : 0 };
  });
}

/** Invoices past due and still unpaid: what a dashboard warns about. */
export function overdueInvoices(invoices: readonly Invoice[], today: string): Invoice[] {
  return invoices.filter((i) => (i.status === "sent" || i.status === "overdue") && daysBetween(i.dueAt, today) > 0);
}
