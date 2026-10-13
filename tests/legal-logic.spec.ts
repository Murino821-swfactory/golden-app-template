import { test, expect } from "@playwright/test";
import { computeDeadline, deadlineUrgency, DEADLINE_RULES } from "../lib/legal/deadlines";
import { isNonWorkingDay } from "../lib/legal/holidays";
import { addMonths, daysBetween } from "../lib/legal/dates";
import { basicRateByValue, courtFee, nonMonetaryRate, overheadPerAct, tariffFee } from "../lib/legal/tariff";
import { entryAmount, invoiceTotal, linesFromEntries, receivables, utilisation, workInProgress } from "../lib/legal/billing";
import { conflictLevel, findConflicts, normaliseName } from "../lib/legal/conflicts";
import { seedWorkspace } from "../lib/legal/seed";
import { nextInvoiceNumber, nextMatterNumber } from "../lib/legal/store";

/**
 * The workspace's rules, pinned without a browser: statutory periods, the tariff, money from
 * time, the conflict check and the integrity of the demo seed.
 */

test.describe("deadlines — CSP § 121", () => {
  test("a period in days skips the day of delivery: 15 days from Friday 9 Oct 2026 ends Monday 26 Oct", () => {
    // Day 15 is Saturday 24 October; Sunday follows; the next working day is Monday.
    const out = computeDeadline("2026-10-09", 15, "days");
    expect(out.rawEnd).toBe("2026-10-24");
    expect(out.dueDate).toBe("2026-10-26");
    expect(out.shifted).toBe(true);
  });

  test("a period ending on a working day does not move", () => {
    const out = computeDeadline("2026-10-13", 15, "days");
    expect(out).toEqual({ rawEnd: "2026-10-28", dueDate: "2026-10-28", shifted: false });
  });

  test("a day of rest at the end moves the period: ending on 1 January 2027 → 4 January", () => {
    const out = computeDeadline("2026-12-17", 15, "days");
    expect(out.rawEnd).toBe("2027-01-01");
    expect(out.dueDate).toBe("2027-01-04");
  });

  test("months end on the same day number, or the last day of a shorter month", () => {
    expect(addMonths("2026-12-31", 2)).toBe("2027-02-28");
    expect(computeDeadline("2026-10-13", 2, "months").dueDate).toBe("2026-12-14"); // 13 Dec 2026 is a Sunday
  });

  test("working days skip weekends and holidays while counting (criminal complaint, 3 working days)", () => {
    // Thursday 2 April 2026: Friday 3 April is Good Friday, Monday 6 April Easter Monday.
    const out = computeDeadline("2026-04-02", 3, "workingDays");
    expect(out.dueDate).toBe("2026-04-09");
  });

  test("the preset table names a statute for every rule", () => {
    for (const rule of Object.values(DEADLINE_RULES)) expect(rule.source).toMatch(/§|lehota/);
    expect(DEADLINE_RULES.appealCsp).toMatchObject({ amount: 15, unit: "days" });
    expect(DEADLINE_RULES.extraordinaryAppealCsp).toMatchObject({ amount: 2, unit: "months" });
  });

  test("urgency buckets", () => {
    const today = "2026-10-13";
    expect(deadlineUrgency({ dueDate: "2026-10-10", status: "open" }, today)).toBe("overdue");
    expect(deadlineUrgency({ dueDate: "2026-10-13", status: "open" }, today)).toBe("today");
    expect(deadlineUrgency({ dueDate: "2026-10-20", status: "open" }, today)).toBe("soon");
    expect(deadlineUrgency({ dueDate: "2026-10-21", status: "open" }, today)).toBe("later");
    expect(deadlineUrgency({ dueDate: "2026-10-01", status: "done" }, today)).toBe("done");
  });

  test("Slovak 2026 calendar: 1 September and 17 November are working days, 24 December is not", () => {
    expect(isNonWorkingDay("2026-09-01")).toBe(false);
    expect(isNonWorkingDay("2026-11-17")).toBe(false);
    expect(isNonWorkingDay("2026-12-24")).toBe(true);
    expect(isNonWorkingDay("2026-10-17")).toBe(true); // Saturday
    expect(daysBetween("2026-10-13", "2026-10-20")).toBe(7);
  });
});

test.describe("tariff — vyhláška 655/2004", () => {
  test("basic rate bands by value (§ 10 ods. 1)", () => {
    expect(basicRateByValue(100)).toBe(16.6);
    expect(basicRateByValue(165.97)).toBe(16.6);
    expect(basicRateByValue(200)).toBe(19.92); // two started 33.19 steps above 165.97
    expect(basicRateByValue(1000)).toBe(61.41); // 41.49 + 2 × 9.96
    expect(basicRateByValue(8900)).toBe(253.94); // 220.74 + 2 × 16.6
    expect(basicRateByValue(48500)).toBe(519.49); // 486.29 + 5 × 6.64
  });

  test("1/13 of the base for non-monetary matters and 1/100 overhead per act (2026 base 1 586 €)", () => {
    expect(nonMonetaryRate(1586)).toBe(122);
    expect(overheadPerAct(1586)).toBe(15.86);
  });

  test("a fee adds up acts, half-rate acts and the overhead; the multiplier is bounded", () => {
    const out = tariffFee({ value: 8900, acts: 3, halfRateActs: 1, base: 1586 });
    expect(out.ratePerAct).toBe(253.94);
    expect(out.fullActsTotal).toBe(761.82);
    expect(out.halfActsTotal).toBe(126.97);
    expect(out.overhead).toBe(63.44);
    expect(out.total).toBe(952.23);
    expect(() => tariffFee({ acts: 1, base: 1586, multiplier: 4 })).toThrow();
  });

  test("court fee: 6 %, floor 25 €, caps, e-filing discount of at most 50 €", () => {
    expect(courtFee(100)).toBe(25);
    expect(courtFee(48500)).toBe(2910);
    expect(courtFee(48500, { electronic: true })).toBe(2860);
    expect(courtFee(60, { electronic: true })).toBe(12.5);
    expect(courtFee(10_000_000)).toBe(25_000);
    expect(courtFee(10_000_000, { commercial: true })).toBe(50_000);
  });
});

test.describe("billing", () => {
  const entries = [
    { id: "a", matterId: "k", memberId: "m", date: "2026-10-01", minutes: 90, activity: "drafting" as const, description: "", billable: true, rate: 100 },
    { id: "b", matterId: "k", memberId: "m", date: "2026-10-02", minutes: 30, activity: "drafting" as const, description: "", billable: true, rate: 100 },
    { id: "c", matterId: "k", memberId: "m", date: "2026-10-03", minutes: 60, activity: "call" as const, description: "", billable: false, rate: 100 },
    { id: "d", matterId: "k", memberId: "m", date: "2026-09-01", minutes: 60, activity: "call" as const, description: "", billable: true, rate: 100, invoiceId: "f" },
  ];

  test("money from minutes, unbilled work, lines grouped by activity", () => {
    expect(entryAmount(entries[0]!)).toBe(150);
    expect(entryAmount(entries[2]!)).toBe(0);
    expect(workInProgress(entries)).toEqual({ minutes: 120, amount: 200 });
    expect(linesFromEntries(entries, (a) => a)).toEqual([{ description: "drafting", quantity: 2, unit: "h", unitPrice: 100 }]);
  });

  test("invoice total with VAT and receivables ageing", () => {
    const invoice = { lines: [{ description: "", quantity: 2, unit: "h" as const, unitPrice: 100 }], vatRate: 20 };
    expect(invoiceTotal(invoice)).toBe(240);
    const aged = receivables([
      { id: "1", number: "1", clientId: "c", matterId: "k", issuedAt: "2026-09-01", dueAt: "2026-09-15", lines: invoice.lines, vatRate: 20, status: "sent" },
      { id: "2", number: "2", clientId: "c", matterId: "k", issuedAt: "2026-10-01", dueAt: "2026-10-20", lines: invoice.lines, vatRate: 20, status: "sent" },
      { id: "3", number: "3", clientId: "c", matterId: "k", issuedAt: "2026-06-01", dueAt: "2026-06-15", lines: invoice.lines, vatRate: 20, status: "paid" },
    ], "2026-10-13");
    expect(aged).toEqual({ current: 240, "1-30": 240, "31-60": 0, "61+": 0, total: 480 });
  });

  test("utilisation is billable minutes over capacity for the window", () => {
    const [u] = utilisation([{ id: "m", name: "", initials: "", role: "attorney", email: "", hourlyRate: 100, capacityHoursWeek: 10 }], entries, "2026-09-30", "2026-10-07");
    expect(u!.billableMinutes).toBe(120);
    expect(u!.utilisation).toBeCloseTo(0.2, 5);
  });
});

test.describe("conflict check", () => {
  const ws = seedWorkspace("firm", "2026-10-13");

  test("names are compared without case, diacritics and company suffixes", () => {
    expect(normaliseName("NOVÁ STAVBA, s. r. o.")).toBe("nova stavba");
    expect(normaliseName("BauTech Slovakia s.r.o.")).toBe("bautech slovakia");
  });

  test("an existing opposing party blocks; an unknown name passes; a witness is a review", () => {
    const block = findConflicts(ws, ["bautech slovakia"]);
    expect(block.map((h) => h.relation)).toEqual(["opponent"]);
    expect(conflictLevel(block)).toBe("block");
    expect(conflictLevel(findConflicts(ws, ["Úplne Nová Firma, a. s."]))).toBe("none");
    const review = findConflicts(ws, ["Peter Mikuš"]);
    expect(review[0]).toMatchObject({ relation: "otherParty", role: "witness", matterNumber: "2026/0037" });
    expect(conflictLevel(review)).toBe("review");
  });

  test("our own client is reported as such, once per matter", () => {
    const hits = findConflicts(ws, ["Nová Stavba"]);
    expect(hits.every((h) => h.relation === "ourClient")).toBe(true);
    expect(new Set(hits.map((h) => h.matterId)).size).toBe(hits.length);
  });
});

test.describe("demo seed", () => {
  for (const kind of ["solo", "firm"] as const) {
    test(`${kind}: every reference resolves and the agenda is dated around today`, () => {
      const ws = seedWorkspace(kind, "2026-10-13");
      const ids = {
        members: new Set(ws.members.map((m) => m.id)),
        clients: new Set(ws.clients.map((c) => c.id)),
        matters: new Set(ws.matters.map((m) => m.id)),
      };
      expect(ids.members.has(ws.currentMemberId)).toBe(true);
      for (const m of ws.matters) {
        expect(ids.clients.has(m.clientId), m.number).toBe(true);
        expect(ids.members.has(m.leadId), m.number).toBe(true);
        for (const t of m.teamIds) expect(ids.members.has(t)).toBe(true);
        expect(ws.members.find((x) => x.id === m.leadId)!.role).not.toBe("assistant");
      }
      for (const d of ws.deadlines) {
        expect(ids.matters.has(d.matterId)).toBe(true);
        expect(ids.members.has(d.responsibleId)).toBe(true);
        expect(computeDeadline(d.startDate, d.amount, d.unit).dueDate).toBe(d.dueDate);
      }
      for (const h of ws.hearings) expect(ids.matters.has(h.matterId)).toBe(true);
      for (const e of ws.timeEntries) {
        expect(ids.matters.has(e.matterId)).toBe(true);
        expect(ids.members.has(e.memberId)).toBe(true);
        if (e.invoiceId) expect(ws.invoices.some((i) => i.id === e.invoiceId)).toBe(true);
      }
      for (const i of ws.invoices) expect(ids.clients.has(i.clientId) && ids.matters.has(i.matterId)).toBe(true);
      for (const doc of ws.documents) if (doc.matterId) expect(ids.matters.has(doc.matterId)).toBe(true);
      // The story: one deadline overdue, one hearing within three days, unbilled work to show.
      expect(ws.deadlines.some((d) => d.status === "open" && d.dueDate < "2026-10-13")).toBe(true);
      expect(ws.hearings.some((h) => h.status === "scheduled" && h.date >= "2026-10-13" && h.date <= "2026-10-16")).toBe(true);
      expect(workInProgress(ws.timeEntries).amount).toBeGreaterThan(0);
      expect(ws.settings.tariffBase).toBe(1586);
    });
  }

  test("the firm has six seats and the solo practice one lawyer; numbering continues the year", () => {
    const firm = seedWorkspace("firm", "2026-10-13");
    const solo = seedWorkspace("solo", "2026-10-13");
    expect(firm.members).toHaveLength(6);
    expect(solo.members.filter((m) => m.role !== "assistant")).toHaveLength(1);
    expect(solo.matters.every((m) => m.leadId === "m1")).toBe(true);
    expect(nextMatterNumber(firm, 2026)).toBe("2026/0051");
    expect(nextInvoiceNumber(firm, 2026)).toBe("2026/0053");
  });
});
