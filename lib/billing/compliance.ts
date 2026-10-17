/**
 * compliance.ts — the accountant's side of OSS Billing: Slovak e-invoicing from 2027, the
 * company's VAT status and what has to be ready before the first meeting with the accountant.
 *
 * Pure functions of a saved state and a clock, so the rules are testable without a browser.
 * The legal facts behind them (tagged in docs/OSS_BILLING_ACCOUNTANT.md):
 *  - until 2026-12-31 invoices travel the old way (PDF/e-mail) — "hybrid mode";
 *  - from 2027-01-01 an invoice from a Slovak VAT payer reaches a business only through a
 *    certified Peppol access point (a "digital postman") the business chose — non-VAT payers
 *    included; an invoice from a non-VAT payer still arrives as before;
 *  - every supplier invoice is billed to the company, never to the founder as a person.
 */

export const EINVOICE_MANDATORY_FROM = "2027-01-01";

const DAY_MS = 86_400_000;

export type EinvoicePhase = "hybrid" | "mandatory";

/** Local calendar date as YYYY-MM-DD — invoices carry dates, not instants. */
export function isoDate(now: Date): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function einvoicePhase(now: Date): { phase: EinvoicePhase; daysLeft: number } {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = EINVOICE_MANDATORY_FROM.split("-").map(Number);
  const daysLeft = Math.max(0, Math.round((Date.UTC(y, m - 1, d) - today) / DAY_MS));
  return { phase: daysLeft > 0 ? "hybrid" : "mandatory", daysLeft };
}

export type VatStatus = "nonPayer" | "payer";
/** What the chosen digital postman can do: nothing chosen, a mailbox with a viewer, XML files, an API. */
export type PostmanKind = "none" | "mailbox" | "xml" | "api";

export const CHECK_IDS = ["poa", "companyBilling", "accountantFormat", "meeting"] as const;
export type CheckId = (typeof CHECK_IDS)[number];

export const AGENDA_IDS = [
  "activities",
  "volumes",
  "jurisdictions",
  "taxRegime",
  "vatRegistration",
  "requisites",
  "postman",
] as const;
export type AgendaId = (typeof AGENDA_IDS)[number];

export interface ComplianceState {
  vatStatus: VatStatus;
  postmanName: string;
  postmanKind: PostmanKind;
  accountantName: string;
  accountantEmail: string;
  accountantSoftware: string;
  checks: Record<CheckId, boolean>;
  agenda: Record<AgendaId, boolean>;
}

const flags = <K extends string>(ids: readonly K[]): Record<K, boolean> =>
  Object.fromEntries(ids.map((id) => [id, false])) as Record<K, boolean>;

export function defaultState(): ComplianceState {
  return {
    vatStatus: "nonPayer",
    postmanName: "",
    postmanKind: "none",
    accountantName: "",
    accountantEmail: "",
    accountantSoftware: "Money S3",
    checks: flags(CHECK_IDS),
    agenda: flags(AGENDA_IDS),
  };
}

const VAT: readonly VatStatus[] = ["nonPayer", "payer"];
const KINDS: readonly PostmanKind[] = ["none", "mailbox", "xml", "api"];
const TEXT_MAX = 200;

/** Whatever the browser kept, as a valid state: unknown keys dropped, bad values defaulted. */
export function parseState(raw: string | null): ComplianceState {
  const base = defaultState();
  if (!raw) return base;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return base;
  }
  if (!data || typeof data !== "object") return base;
  const o = data as Record<string, unknown>;
  const text = (v: unknown, fallback: string) => (typeof v === "string" ? v.slice(0, TEXT_MAX) : fallback);
  const pick = <K extends string>(ids: readonly K[], v: unknown): Record<K, boolean> => {
    const src = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    return Object.fromEntries(ids.map((id) => [id, src[id] === true])) as Record<K, boolean>;
  };
  return {
    vatStatus: VAT.includes(o.vatStatus as VatStatus) ? (o.vatStatus as VatStatus) : base.vatStatus,
    postmanName: text(o.postmanName, base.postmanName),
    postmanKind: KINDS.includes(o.postmanKind as PostmanKind) ? (o.postmanKind as PostmanKind) : base.postmanKind,
    accountantName: text(o.accountantName, base.accountantName),
    accountantEmail: text(o.accountantEmail, base.accountantEmail),
    accountantSoftware: text(o.accountantSoftware, base.accountantSoftware),
    checks: pick(CHECK_IDS, o.checks),
    agenda: pick(AGENDA_IDS, o.agenda),
  };
}

export type ReadinessId = CheckId | "postmanChosen" | "postmanAutomation";

/** The road to 2027, in the order the accountant's letter walks it. */
export function readiness(state: ComplianceState): { items: { id: ReadinessId; done: boolean }[]; done: number; total: number } {
  const items: { id: ReadinessId; done: boolean }[] = [
    { id: "poa", done: state.checks.poa },
    { id: "companyBilling", done: state.checks.companyBilling },
    { id: "postmanChosen", done: state.postmanKind !== "none" && state.postmanName.trim() !== "" },
    { id: "postmanAutomation", done: state.postmanKind === "xml" || state.postmanKind === "api" },
    { id: "accountantFormat", done: state.checks.accountantFormat },
    { id: "meeting", done: state.checks.meeting },
  ];
  return { items, done: items.filter((i) => i.done).length, total: items.length };
}

export type Channel = "peppol" | "asBefore";

export interface IncomingInvoice {
  supplierVatPayer: boolean;
  issueDate: string;
  billedTo: "company" | "person";
}

export type IncomingIssue = "billedToPerson" | "noPostman" | "manualPostman" | "badDate";

/** Which way a supplier invoice must arrive, and what is wrong with it. */
export function routeIncoming(inv: IncomingInvoice, state: ComplianceState): { channel: Channel; issues: IncomingIssue[] } {
  const issues: IncomingIssue[] = [];
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(inv.issueDate);
  if (!validDate) issues.push("badDate");
  const channel: Channel =
    validDate && inv.supplierVatPayer && inv.issueDate >= EINVOICE_MANDATORY_FROM ? "peppol" : "asBefore";
  if (inv.billedTo === "person") issues.push("billedToPerson");
  if (channel === "peppol") {
    if (state.postmanKind === "none") issues.push("noPostman");
    else if (state.postmanKind === "mailbox") issues.push("manualPostman");
  }
  return { channel, issues };
}

/**
 * How the company's own invoices to Slovak businesses must leave. A non-VAT payer invoices
 * as before; once registered for VAT, from 2027 through the digital postman.
 */
export function outgoingChannel(vatStatus: VatStatus, issueDate: string): Channel {
  return vatStatus === "payer" && issueDate >= EINVOICE_MANDATORY_FROM ? "peppol" : "asBefore";
}

/** RFC 4180 CSV of the visitor's invoices, columns in grid order — the accountant's raw handoff. */
export function invoicesCsv(
  fields: readonly { key: string; label: string }[],
  records: readonly { values: Record<string, unknown> }[]
): string {
  const cell = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [fields.map((f) => cell(f.label)).join(",")];
  for (const r of records) rows.push(fields.map((f) => cell(r.values[f.key])).join(","));
  return rows.join("\r\n") + "\r\n";
}

/** A mailto: link carrying the meeting agenda, so the founder sends it from their own mailbox. */
export function agendaMailto(email: string, subject: string, lines: readonly string[]): string {
  const body = lines.map((l) => `- ${l}`).join("\n");
  return `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
