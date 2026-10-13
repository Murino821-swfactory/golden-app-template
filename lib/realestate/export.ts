/**
 * export.ts — files the workspace hands to the agent: a calendar entry for a viewing,
 * closed deals as CSV for the accountant, one contact's data for a GDPR request, the
 * whole workspace as JSON. Pure builders plus one tiny browser download helper.
 */
import type { Contact, Viewing, Workspace } from "./model";

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
}

export function viewingIcs(viewing: Viewing, summary: string, description: string, location: string): string {
  const start = new Date(viewing.start);
  const end = new Date(start.getTime() + viewing.durationMin * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Realitný maklér//Workspace//EN",
    "BEGIN:VEVENT",
    `UID:${viewing.id}@realitny-makler`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(start.toISOString())}`,
    `DTEND:${icsDate(end.toISOString())}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `LOCATION:${icsEscape(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

/** Everything the workspace holds about one person — the answer to an access request. */
export function contactExport(ws: Workspace, contact: Contact): string {
  const linked = {
    contact,
    properties: ws.properties.filter((p) => p.ownerId === contact.id),
    demands: ws.demands.filter((d) => d.contactId === contact.id),
    viewings: ws.viewings.filter((v) => v.contactId === contact.id),
    deals: ws.deals.filter((d) => d.buyerId === contact.id || d.sellerId === contact.id),
    leases: ws.leases.filter((l) => l.tenantId === contact.id || l.landlordId === contact.id),
    activities: ws.activities.filter((a) => a.link?.kind === "contact" && a.link.id === contact.id),
  };
  return JSON.stringify(linked, null, 2);
}

export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function workspaceJson(ws: Workspace): string {
  return JSON.stringify(ws, null, 2);
}
