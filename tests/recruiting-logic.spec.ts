import { test, expect } from "@playwright/test";
import {
  addApplication, createPlacement, moveApplication, rejectApplication, type ActionLabels,
} from "../lib/recruiting/actions";
import { interviewIcs, placementsCsv } from "../lib/recruiting/export";
import { extractCandidateFields, parseList } from "../lib/recruiting/extract";
import { attention, averageDaysInStage, feeTotals, funnel, kpis, pipelineValue, stageCounts, timeToFill } from "../lib/recruiting/metrics";
import { STAGES, addDays, addMonths, daysBetween, effectiveFeePercent, salaryMid } from "../lib/recruiting/model";
import { seedWorkspace } from "../lib/recruiting/seed";
import { getSnapshot, initWorkspace, parseWorkspace, resetStoreForTests } from "../lib/recruiting/store";

/**
 * The workspace's rules without a browser: the seed, the metrics the overview and the
 * reports draw, the CV field extractor, the exports, and the actions over the store.
 */

const NOW = new Date("2026-10-12T09:00:00Z");

const labels: ActionLabels = {
  stage: (s) => s,
  stageChanged: (s) => `stage ${s}`,
  rejected: (r) => `rejected ${r}`,
  reopened: "reopened",
  placed: (j) => `placed ${j}`,
  interviewScheduled: (t) => `interview ${t}`,
  scorecardSaved: "scorecard",
  consentGranted: "consent granted",
  consentWithdrawn: "consent withdrawn",
  anonymized: "anonymized",
  addedToJob: (j) => `added ${j}`,
  scored: (n) => `scored ${n}`,
  rejectionReason: (r) => r,
  interviewType: (t) => t,
};

test.describe("seed", () => {
  test("is a complete, parseable desk in both languages", () => {
    for (const locale of ["en", "sk"] as const) {
      const ws = seedWorkspace(locale, NOW);
      expect(() => parseWorkspace(JSON.parse(JSON.stringify(ws)))).not.toThrow();
      expect(ws.clients).toHaveLength(4);
      expect(ws.jobs).toHaveLength(7);
      expect(ws.candidates).toHaveLength(14);
      expect(ws.applications).toHaveLength(15);
      expect(ws.placements).toHaveLength(2);
      // Every reference resolves.
      const jobIds = new Set(ws.jobs.map((j) => j.id));
      const candIds = new Set(ws.candidates.map((c) => c.id));
      const appIds = new Set(ws.applications.map((a) => a.id));
      for (const a of ws.applications) expect(jobIds.has(a.jobId) && candIds.has(a.candidateId), a.id).toBe(true);
      for (const i of ws.interviews) expect(appIds.has(i.applicationId), i.id).toBe(true);
      for (const p of ws.placements) expect(appIds.has(p.applicationId) && jobIds.has(p.jobId), p.id).toBe(true);
      for (const j of ws.jobs) expect(ws.clients.some((c) => c.id === j.clientId), j.id).toBe(true);
      // No real-looking contacts.
      for (const c of ws.candidates) expect(c.email.endsWith("@example.com")).toBe(true);
    }
  });

  test("dates are relative to the clock, so the demo always looks live", () => {
    const ws = seedWorkspace("en", NOW);
    const today = NOW.toISOString().slice(0, 10);
    expect(ws.interviews.some((i) => i.scheduledAt.startsWith(today) && i.status === "scheduled")).toBe(true);
    const inGuarantee = ws.placements.find((p) => p.id === "pl-balazova")!;
    expect(inGuarantee.guaranteeUntil > today).toBe(true);
    expect(inGuarantee.guaranteeUntil).toBe(addDays(inGuarantee.startDate, 90));
  });
});

test.describe("metrics", () => {
  const ws = seedWorkspace("en", NOW);

  test("kpis count the open desk", () => {
    const k = kpis(ws, NOW);
    expect(k.openJobs).toBe(4);
    expect(k.activeCandidates).toBe(10);
    expect(k.interviewsThisWeek).toBeGreaterThanOrEqual(1);
    expect(k.pipelineValue).toBeGreaterThan(0);
    expect(k.avgTimeToFill).toBe(timeToFill(ws).average);
  });

  test("attention flags consent, stale processes, overdue tasks and today's interviews", () => {
    const a = attention(ws, NOW);
    expect(a.consentExpiring).toContain("cand-vargova");
    expect(a.consentExpired).toContain("cand-polak");
    expect(a.overdueTasks).toContain("task-4");
    expect(a.overdueTasks).not.toContain("task-6"); // done
    expect(a.interviewsToday).toContain("int-hudec-2");
    expect(a.stale.map((x) => x.id)).toContain("app-horvathova-backend");
    expect(a.stale.map((x) => x.id)).not.toContain("app-vargova-analyst"); // job on hold
    expect(a.unscored.map((x) => x.id)).toContain("app-kovacova-pm");
    expect(a.deadlines).toContain("job-pm");
  });

  test("the funnel never grows downstream and converts between steps", () => {
    const steps = funnel(ws.applications);
    expect(steps.map((s) => s.stage)).toEqual([...STAGES]);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.reached).toBeLessThanOrEqual(steps[i - 1]!.reached);
      expect(steps[i]!.conversion).not.toBeNull();
    }
    expect(steps[0]!.reached).toBe(15);
    expect(steps[5]!.reached).toBe(2);
  });

  test("time to fill, days in stage, fees and pipeline value compute from the seed", () => {
    const ttf = timeToFill(ws);
    expect(ttf.perJob).toHaveLength(2);
    expect(ttf.average).toBeGreaterThan(0);
    const days = averageDaysInStage(ws.applications);
    expect(days.sourced).toBeGreaterThan(0);
    const totals = feeTotals(ws);
    expect(totals.total).toBe(9400 + 9900);
    expect(totals.paid).toBe(9900);
    expect(totals.outstanding).toBe(9400);
    const pv = pipelineValue(ws);
    expect(pv.rows).toHaveLength(4);
    expect(pv.rows[0]!.weighted).toBeGreaterThanOrEqual(pv.rows[1]!.weighted);
    const counts = stageCounts(ws.applications);
    expect(counts.placed).toBe(2);
    expect(counts.rejected).toBe(2);
  });

  test("fee resolution: job → client → workspace default", () => {
    const job = ws.jobs.find((j) => j.id === "job-devops")!; // Kovaľ has no fee of its own
    const client = ws.clients.find((c) => c.id === job.clientId)!;
    expect(effectiveFeePercent(job, client, ws.settings)).toBe(20);
    expect(effectiveFeePercent({ ...job, feePercent: 15 }, client, ws.settings)).toBe(15);
    expect(effectiveFeePercent(job, { ...client, feePercent: 25 }, ws.settings)).toBe(25);
    expect(salaryMid(job)).toBe(45000);
    expect(daysBetween("2026-10-01", "2026-10-12")).toBe(11);
    expect(addMonths("2026-01-31", 1)).toBe("2026-03-03");
  });
});

test.describe("extract", () => {
  test("reads name, title, contacts and skills from a CV", () => {
    const text = `Jana Nováková — Frontend Engineer\nBratislava · jana.novakova@example.com · +421 900 123 456\nBuilt React and TypeScript apps for 4 years. CSS, Tailwind, Jest.`;
    const f = extractCandidateFields(text);
    expect(f.firstName).toBe("Jana");
    expect(f.lastName).toBe("Nováková");
    expect(f.title).toBe("Frontend Engineer");
    expect(f.email).toBe("jana.novakova@example.com");
    expect(f.phone).toBe("+421 900 123 456");
    expect(f.skills).toEqual(expect.arrayContaining(["React", "TypeScript", "CSS", "Tailwind CSS", "Jest"]));
  });
  test("does not mistake a heading for a name", () => {
    expect(extractCandidateFields("Curriculum vitae\nSkills: Python").firstName).toBe("");
    expect(parseList("React, node.js,, React ;SQL")).toEqual(["React", "node.js", "SQL"]);
  });
});

test.describe("exports", () => {
  const ws = seedWorkspace("en", NOW);
  test("an interview becomes a calendar entry", () => {
    const ics = interviewIcs(ws.interviews[1]!, "Lukáš Nagy · Senior Backend Engineer", "Client interview");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    expect(ics).toContain("SUMMARY:Lukáš Nagy · Senior Backend Engineer");
    expect(ics).toContain("URL:https://meet.example/lumen-nagy");
  });
  test("placements export as CSV with a header row", () => {
    const csv = placementsCsv(ws, ["start", "candidate", "job", "client", "salary", "fee_percent", "fee", "guarantee_until", "invoice"]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("start,candidate,job,client,salary,fee_percent,fee,guarantee_until,invoice");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("Eva Balážová");
    expect(lines[1]).toContain("9400");
  });
});

test.describe("actions over the store", () => {
  test.beforeEach(() => resetStoreForTests());

  test("add → move → reject → reopen keeps history and timeline honest", () => {
    initWorkspace("en"); // no localStorage in Node: seeds, marks storage blocked, carries on
    const before = getSnapshot()!;
    const id = addApplication("cand-polak", "job-frontend", labels)!;
    expect(id).toBeTruthy();
    expect(addApplication("cand-polak", "job-frontend", labels)).toBeNull(); // no duplicates
    moveApplication(id, "submitted", labels);
    let app = getSnapshot()!.applications.find((a) => a.id === id)!;
    expect(app.stage).toBe("submitted");
    expect(app.history.map((h) => h.stage)).toEqual(["sourced", "submitted"]);
    rejectApplication(id, "salary", "too high", labels);
    app = getSnapshot()!.applications.find((a) => a.id === id)!;
    expect(app.stage).toBe("rejected");
    expect(app.rejection).toEqual({ reason: "salary", note: "too high" });
    const timeline = getSnapshot()!.activities.filter((a) => a.candidateId === "cand-polak" && a.jobId === "job-frontend");
    expect(timeline.map((a) => a.text)).toEqual(["rejected salary — too high", "stage submitted", "added Frontend Developer (React)"]);
    expect(getSnapshot()).not.toBe(before); // snapshots are replaced, never mutated
    expect(before.applications.some((a) => a.id === id)).toBe(false);
  });

  test("a placement computes the fee, marks the job filled and moves the application", () => {
    initWorkspace("en");
    const pid = createPlacement({ applicationId: "app-bielikova-backend", startDate: "2026-11-01", salary: 64000, feePercent: 20, guaranteeDays: 60, invoiceStatus: "draft", markJobFilled: true }, labels)!;
    const ws = getSnapshot()!;
    const p = ws.placements.find((x) => x.id === pid)!;
    expect(p.feeAmount).toBe(12800);
    expect(p.guaranteeUntil).toBe("2026-12-31");
    expect(ws.applications.find((a) => a.id === "app-bielikova-backend")!.stage).toBe("placed");
    expect(ws.jobs.find((j) => j.id === "job-backend")!.status).toBe("filled");
    expect(ws.candidates.find((c) => c.id === "cand-bielikova")!.tags).toContain("placed");
  });
});
