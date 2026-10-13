import { addDays, addMonths, daysBetween, parseIso, toIso } from "./dates";
import { isNonWorkingDay } from "./holidays";
import type { Deadline, DeadlinePreset, DeadlineUnit } from "./types";

/**
 * Statutory periods, computed the way the procedure codes count them.
 *
 * CSP § 121 (and the mirror rules in the Criminal and Administrative procedure codes):
 * - a period in days does not count the day of the triggering event (ods. 2);
 * - weeks, months and years end on the day with the same number as the triggering day, or
 *   the last day of the month when there is none (ods. 3);
 * - a period ending on a Saturday, Sunday or a day of rest ends on the next working day (ods. 5).
 * "Working days" periods (Criminal Procedure Code § 187: a complaint within three working
 * days) skip non-working days while counting.
 *
 * [OVERIŤ] The presets name the statute each period comes from; verify against the current
 * text on Slov-Lex before relying on one in a real case — a court's own instruction prevails.
 */
export interface DeadlineRule {
  preset: DeadlinePreset;
  amount: number;
  unit: DeadlineUnit;
  /** Statute reference shown next to the preset. */
  source: string;
}

export const DEADLINE_RULES: Record<Exclude<DeadlinePreset, "custom">, DeadlineRule> = {
  appealCsp: { preset: "appealCsp", amount: 15, unit: "days", source: "§ 362 ods. 1 CSP" },
  oppositionPaymentOrder: { preset: "oppositionPaymentOrder", amount: 15, unit: "days", source: "§ 265 ods. 1 CSP" },
  extraordinaryAppealCsp: { preset: "extraordinaryAppealCsp", amount: 2, unit: "months", source: "§ 427 ods. 1 CSP" },
  appealCriminal: { preset: "appealCriminal", amount: 15, unit: "days", source: "§ 309 ods. 1 Tr. por." },
  complaintCriminal: { preset: "complaintCriminal", amount: 3, unit: "workingDays", source: "§ 187 ods. 1 Tr. por." },
  administrativeAction: { preset: "administrativeAction", amount: 2, unit: "months", source: "§ 181 ods. 1 SSP" },
  statementCourtSet: { preset: "statementCourtSet", amount: 15, unit: "days", source: "lehota určená súdom" },
};

export interface ComputedDeadline {
  /** The raw end of the period before any shift. */
  rawEnd: string;
  /** The last day on which the act is timely. */
  dueDate: string;
  shifted: boolean;
}

function nextWorkingDay(isoDate: string): string {
  let d = isoDate;
  while (isNonWorkingDay(d)) d = addDays(d, 1);
  return d;
}

export function computeDeadline(startDate: string, amount: number, unit: DeadlineUnit): ComputedDeadline {
  if (!Number.isInteger(amount) || amount < 1) throw new Error("amount must be a positive integer");
  let rawEnd: string;
  switch (unit) {
    case "days":
      rawEnd = addDays(startDate, amount);
      break;
    case "workingDays": {
      let d = startDate;
      let left = amount;
      while (left > 0) {
        d = addDays(d, 1);
        if (!isNonWorkingDay(d)) left--;
      }
      rawEnd = d;
      break;
    }
    case "weeks":
      rawEnd = addDays(startDate, amount * 7);
      break;
    case "months":
      rawEnd = addMonths(startDate, amount);
      break;
    case "years":
      rawEnd = addMonths(startDate, amount * 12);
      break;
  }
  const dueDate = nextWorkingDay(rawEnd);
  return { rawEnd, dueDate, shifted: dueDate !== rawEnd };
}

export type DeadlineUrgency = "overdue" | "today" | "soon" | "later" | "done";

/** `soon` = within the next seven days. */
export function deadlineUrgency(deadline: Pick<Deadline, "dueDate" | "status">, today: string): DeadlineUrgency {
  if (deadline.status === "done") return "done";
  const diff = daysBetween(today, deadline.dueDate);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "soon";
  return "later";
}

export function daysLeft(deadline: Pick<Deadline, "dueDate">, today: string): number {
  return daysBetween(today, deadline.dueDate);
}

/** Open deadlines, nearest first. */
export function upcomingDeadlines(deadlines: readonly Deadline[], today: string, limit = 8): Deadline[] {
  return deadlines
    .filter((d) => d.status === "open")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .filter((d) => daysBetween(today, d.dueDate) >= -30)
    .slice(0, limit);
}

export function isValidIsoDate(value: string): boolean {
  try {
    return toIso(parseIso(value)) === value;
  } catch {
    return false;
  }
}
