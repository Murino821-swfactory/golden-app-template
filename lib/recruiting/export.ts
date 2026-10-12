/**
 * export.ts — files the workspace hands to the recruiter: a calendar entry for an
 * interview, placements as CSV for the accountant, the whole workspace as JSON. Pure
 * builders plus one tiny browser download helper.
 */
import type { Interview, Placement, Workspace } from "./model";

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
}

export function interviewIcs(interview: Interview, summary: string, description: string): string {
  const start = new Date(interview.scheduledAt);
  const end = new Date(start.getTime() + interview.durationMinutes * 60_000);
  const isUrl = /^https?:\/\//i.test(interview.place);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CV Matcher//Recruiting workspace//EN",
    "BEGIN:VEVENT",
    `UID:${interview.id}@cv-matcher`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(start.toISOString())}`,
    `DTEND:${icsDate(end.toISOString())}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    isUrl ? `URL:${interview.place}` : `LOCATION:${icsEscape(interview.place)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function placementsCsv(ws: Workspace, headers: string[]): string {
  const rows = ws.placements.map((p: Placement) => {
    const candidate = ws.candidates.find((c) => c.id === p.candidateId);
    const job = ws.jobs.find((j) => j.id === p.jobId);
    const client = ws.clients.find((c) => c.id === p.clientId);
    return [
      p.startDate,
      candidate ? `${candidate.firstName} ${candidate.lastName}`.trim() : "",
      job?.title ?? "",
      client?.name ?? "",
      p.salary,
      p.feePercent,
      p.feeAmount,
      p.guaranteeUntil,
      p.invoiceStatus,
    ];
  });
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
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
