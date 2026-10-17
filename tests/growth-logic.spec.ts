import { test, expect } from "@playwright/test";
import { GROWTH_COPY } from "../lib/growth/copy";
import { SEQUENCES, addDays, daysBetween, dueSteps, emailFor, isEmail, leadsSummary, mailtoUrl, markSent, newLead, nextStep, parseLeads, type Lead } from "../lib/growth/leads";
import { IDEAS, IDEA_IDS, WEEK_SLOTS, ideaContent, mondayOf, planProgress, poolFor, shiftWeek, slotDone, weekIndexOf, weekPlan } from "../lib/growth/plan";
import { BIO_MAX, CHECKLIST_IDS, HIGHLIGHT_IDS, checklistProgress, highlightContent, profileCopyIssues, toggleDone } from "../lib/growth/profile";
import { DEFAULT_GOALS, buildReport, kindOf, reportContent, reportMarkdown, suggestWeekly, type WeekMetrics } from "../lib/growth/report";
import { parseGoals, parseMetricsMap } from "../lib/growth/store";
import { CHANNELS, captionFor } from "../lib/studio/channels";
import type { PublishLogEntry } from "../lib/studio/publish";

/**
 * The growth plan's rules without a browser: the weekly rotation, the profile kit's
 * limits, the report's arithmetic and the lead sequences. The page is in growth.spec.ts.
 */

const EN = GROWTH_COPY.en;
const CS = GROWTH_COPY.cs;

function entry(over: Partial<PublishLogEntry>): PublishLogEntry {
  return { id: Math.random().toString(36).slice(2), at: "2026-10-14T10:00:00.000Z", channel: "instagram", scenario: "plan", title: "t", outcome: "opened", ...over };
}

test.describe("content plan", () => {
  test("a week has seven slots, Monday to Sunday, each idea in the slot's shape", () => {
    const plan = weekPlan("2026-10-12");
    expect(plan).toHaveLength(7);
    expect(plan.map((p) => p.date)).toEqual(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]);
    plan.forEach((p, i) => {
      expect(p.idea.kind).toBe(WEEK_SLOTS[i]!.kind);
      expect(poolFor(p.slot).map((x) => x.id)).toContain(p.idea.id);
    });
  });

  test("the rotation is deterministic and consecutive weeks differ", () => {
    const a = weekPlan("2026-10-12").map((p) => p.idea.id);
    expect(weekPlan("2026-10-12").map((p) => p.idea.id)).toEqual(a);
    const b = weekPlan("2026-10-19").map((p) => p.idea.id);
    expect(b).not.toEqual(a);
    expect(weekIndexOf("2026-10-19") - weekIndexOf("2026-10-12")).toBe(1);
  });

  test("every pool has at least one idea, and ideas with the same shape rotate", () => {
    for (const slot of WEEK_SLOTS) expect(poolFor(slot).length).toBeGreaterThan(0);
    const posts = IDEAS.filter((i) => i.kind === "post").length;
    expect(posts).toBeGreaterThanOrEqual(3);
  });

  test("week helpers: Monday of a date, shifting, and a bad date", () => {
    expect(mondayOf("2026-10-17T23:59:00Z")).toBe("2026-10-12");
    expect(mondayOf("2026-10-12")).toBe("2026-10-12");
    expect(mondayOf("2026-10-18T00:00:00Z")).toBe("2026-10-12");
    expect(shiftWeek("2026-10-12", 1)).toBe("2026-10-19");
    expect(shiftWeek("2026-10-12", -1)).toBe("2026-10-05");
    expect(mondayOf("nonsense")).toBe("");
  });

  test("an idea worded for the bar names the product, keeps its shape and fits every channel in both languages", () => {
    for (const copy of [EN, CS]) {
      for (const idea of IDEAS) {
        const content = ideaContent(idea, copy, { coupon: "START50" });
        expect(content.scenario).toBe("plan");
        expect(content.ref).toBe(idea.id);
        expect(content.kind).toBe(idea.kind);
        expect(content.title).toBe(copy.plan.ideas[idea.id]!.hook);
        expect(content.lines[content.lines.length - 1]).toBe(copy.productLine);
        for (const channel of CHANNELS) {
          const caption = captionFor(channel, content);
          expect(caption.length).toBeLessThanOrEqual(channel.captionMax);
          expect(caption).toContain(idea.url);
        }
      }
      expect(Object.keys(copy.plan.ideas).sort()).toEqual([...IDEA_IDS].sort());
    }
  });

  test("the promo idea carries the coupon code when set, and says so when not", () => {
    const offer = IDEAS.find((i) => i.id === "token-offer")!;
    expect(ideaContent(offer, EN, { coupon: "START50" }).lines).toContain(EN.plan.couponLine("START50"));
    expect(ideaContent(offer, EN).lines).toContain(EN.plan.couponMissing);
  });

  test("a slot is done only by a successful publish of that idea in that week", () => {
    const week = "2026-10-12";
    const plan = weekPlan(week);
    const first = plan[0]!.idea.id;
    const log = [
      entry({ ref: first, at: "2026-10-13T08:00:00Z" }),
      entry({ ref: plan[1]!.idea.id, at: "2026-10-13T08:00:00Z", outcome: "cancelled" }),
      entry({ ref: plan[2]!.idea.id, at: "2026-10-06T08:00:00Z" }),
    ];
    expect(slotDone(first, week, log)).toBe(true);
    expect(slotDone(plan[1]!.idea.id, week, log)).toBe(false);
    expect(slotDone(plan[2]!.idea.id, week, log)).toBe(false);
    expect(planProgress(week, log)).toEqual({ done: 1, total: 7 });
  });
});

test.describe("instagram profile kit", () => {
  test("every bio fits Instagram's limit and every highlight title its cover, in both languages", () => {
    expect(profileCopyIssues(EN)).toEqual([]);
    expect(profileCopyIssues(CS)).toEqual([]);
    for (const bio of EN.profile.bios) expect(bio.length).toBeLessThanOrEqual(BIO_MAX);
  });

  test("the checklist toggles and counts", () => {
    let done: string[] = [];
    done = toggleDone(done, "bio");
    done = toggleDone(done, "name");
    expect(checklistProgress(done)).toEqual({ done: 2, total: CHECKLIST_IDS.length });
    done = toggleDone(done, "bio");
    expect(done).toEqual(["name"]);
    expect(checklistProgress(toggleDone(done, "unknown")).done).toBe(1);
  });

  test("a highlight is a story set for the bar, within every channel's limit", () => {
    for (const id of HIGHLIGHT_IDS) {
      const content = highlightContent(id, EN);
      expect(content.scenario).toBe("profile");
      expect(content.kind).toBe("story");
      expect(content.ref).toBe(`highlight:${id}`);
      expect(content.lines).toHaveLength(EN.profile.highlights[id]!.stories.length + 1);
      for (const channel of CHANNELS) expect(captionFor(channel, content).length).toBeLessThanOrEqual(channel.captionMax);
    }
    expect(highlightContent("apps", EN).url).toBe("https://tokenwise.sk/projects");
  });
});

test.describe("weekly report", () => {
  const week = "2026-10-12";
  const log: PublishLogEntry[] = [
    entry({ at: "2026-10-12T09:00:00Z", channel: "instagram", kind: "post" }),
    entry({ at: "2026-10-13T09:00:00Z", channel: "tiktok", kind: "reel" }),
    entry({ at: "2026-10-14T09:00:00Z", channel: "instagram", kind: "story" }),
    entry({ at: "2026-10-15T09:00:00Z", channel: "youtube" }), // no kind: the channel says video
    entry({ at: "2026-10-16T09:00:00Z", channel: "site", scenario: "projects" }), // the studio: article
    entry({ at: "2026-10-16T10:00:00Z", channel: "facebook", outcome: "cancelled" }), // not a post
    entry({ at: "2026-10-16T11:00:00Z", channel: "facebook", outcome: "failed" }),
    entry({ at: "2026-10-09T09:00:00Z", channel: "facebook" }), // last week
  ];

  test("the shape of a piece: what the content said, else what the channel implies", () => {
    expect(kindOf({ channel: "instagram", kind: "reel" })).toBe("reel");
    expect(kindOf({ channel: "site" })).toBe("article");
    expect(kindOf({ channel: "youtube" })).toBe("video");
    expect(kindOf({ channel: "facebook" })).toBe("post");
  });

  test("counts this week's successful publishes by shape and channel, with deltas against last week", () => {
    const metricsByWeek: Record<string, WeekMetrics> = {
      "2026-10-05": { reach: 400, followers: 100, visits: 50, registrations: 2 },
      [week]: { reach: 1200, followers: 130, visits: 90, registrations: 6 },
    };
    const r = buildReport({ weekStart: week, log, metricsByWeek, goals: DEFAULT_GOALS });
    expect(r.weekEnd).toBe("2026-10-18");
    expect(r.total).toBe(5);
    expect(r.produced).toEqual({ post: 1, story: 1, reel: 1, video: 1, article: 1 });
    expect(r.byChannel).toEqual({ site: 1, facebook: 0, instagram: 2, tiktok: 1, youtube: 1 });
    expect(r.deltas).toEqual({ reach: 800, followers: 30, visits: 40, registrations: 4 });
    expect(r.weekly.pieces).toEqual({ have: 5, goal: 7, met: false });
    expect(r.weekly.reach).toEqual({ have: 1200, goal: 1000, met: true });
    expect(r.weekly.registrations).toEqual({ have: 6, goal: 5, met: true });
    // Monthly: registrations summed over the month's weeks, followers from the latest week.
    expect(r.monthly.registrations).toEqual({ have: 8, goal: 20, met: false });
    expect(r.monthly.followers).toEqual({ have: 130, goal: 500, met: false });
    // Met goals grow by a fifth, missed ones stay.
    expect(r.suggested).toEqual({ pieces: 7, reach: 1200, registrations: 6 });
  });

  test("an empty week has no deltas and nothing produced", () => {
    const r = buildReport({ weekStart: "2026-11-02", log, metricsByWeek: {}, goals: DEFAULT_GOALS });
    expect(r.total).toBe(0);
    expect(r.previous).toBeNull();
    expect(r.deltas).toBeNull();
    expect(r.weekly.pieces.met).toBe(false);
    expect(suggestWeekly(r.weekly, DEFAULT_GOALS.weekly)).toEqual(DEFAULT_GOALS.weekly);
  });

  test("the Markdown and the publishable post carry the same facts, within limits", () => {
    const r = buildReport({ weekStart: week, log, metricsByWeek: { [week]: { reach: 1200, followers: 130, visits: 90, registrations: 6 } }, goals: DEFAULT_GOALS });
    const md = reportMarkdown(r, EN);
    expect(md).toContain(`# ${EN.report.articleTitle(week)}`);
    expect(md).toContain(`## ${EN.report.mdProduced}`);
    expect(md).toContain("- 1 × Post");
    expect(md).toContain("- 1 × Article");
    expect(md).toContain(`- ${EN.report.reach}: 1200`);
    expect(md).toContain("→ 1200");
    const content = reportContent(r, EN);
    expect(content.scenario).toBe("report");
    expect(content.kind).toBe("article");
    expect(content.ref).toBe(`report:${week}`);
    expect(content.summary).toBe(EN.report.articleSummary(5, 1200, 6));
    for (const channel of CHANNELS) expect(captionFor(channel, content).length).toBeLessThanOrEqual(channel.captionMax);
  });

  test("stored numbers and goals survive junk", () => {
    expect(parseMetricsMap('{"2026-10-12":{"reach":"12","followers":-3,"visits":null},"bad":{}}')).toEqual({ "2026-10-12": { reach: 12, followers: 0, visits: 0, registrations: 0 } });
    expect(parseMetricsMap("[]")).toEqual({});
    expect(parseMetricsMap("{")).toEqual({});
    expect(parseGoals('{"weekly":{"pieces":10}}')).toEqual({ weekly: { ...DEFAULT_GOALS.weekly, pieces: 10 }, monthly: DEFAULT_GOALS.monthly });
    expect(parseGoals("nope")).toEqual(DEFAULT_GOALS);
  });
});

test.describe("leads and offers", () => {
  const today = "2026-10-17";

  test("a lead needs a name and a valid e-mail", () => {
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("not an email")).toBe(false);
    expect(newLead({ name: " ", email: "a@b.co", source: "contact" }, today)).toBeNull();
    expect(newLead({ name: "Ana", email: "nope", source: "contact" }, today)).toBeNull();
    const lead = newLead({ name: " Ana ", email: " Ana@Example.com ", source: "newsletter" }, today)!;
    expect(lead.name).toBe("Ana");
    expect(lead.email).toBe("ana@example.com");
    expect(lead.since).toBe(today);
    expect(lead.sent).toEqual([]);
  });

  test("the sequence comes due day by day and is ticked off step by step", () => {
    const lead: Lead = { id: "1", name: "Ana", email: "ana@example.com", source: "contact", since: "2026-10-14", sent: [] };
    expect(daysBetween("2026-10-14", today)).toBe(3);
    expect(addDays("2026-10-14", 7)).toBe("2026-10-21");
    const due = dueSteps(lead, today);
    expect(due.map((d) => d.step.id)).toEqual(["welcome", "value-1"]);
    expect(due[0]!.daysLeft).toBe(-3);
    expect(due[1]!.daysLeft).toBe(0);
    expect(nextStep(lead, today)!.step.id).toBe("offer");
    expect(nextStep(lead, today)!.daysLeft).toBe(4);
    const after = markSent(markSent(lead, "welcome"), "welcome");
    expect(after.sent).toEqual(["welcome"]);
    expect(dueSteps(after, today).map((d) => d.step.id)).toEqual(["value-1"]);
    expect(dueSteps(lead, "2026-10-13")).toEqual([]); // before the lead arrived — nothing due
    for (const source of ["contact", "newsletter", "account"] as const) expect(SEQUENCES[source][0]).toEqual({ id: "welcome", kind: "welcome", day: 0 });
  });

  test("every e-mail opens in the mail client with the product link; the offer carries the coupon when set", () => {
    const lead: Lead = { id: "1", name: "Ana", email: "ana@example.com", source: "account", since: today, sent: [] };
    for (const copy of [EN, CS]) {
      for (const step of SEQUENCES.account) {
        const mail = emailFor(step, lead, copy, { coupon: "START50" });
        expect(mail.subject.length).toBeGreaterThan(0);
        expect(mail.body).toContain("Ana");
        expect(mail.body).toContain("https://tokenwise.sk/");
      }
      const offer = SEQUENCES.account.find((s) => s.kind === "offer")!;
      expect(emailFor(offer, lead, copy, { coupon: "START50" }).body).toContain("START50");
      expect(emailFor(offer, lead, copy, { coupon: "" }).body).not.toContain("START50");
    }
    const url = mailtoUrl("ana@example.com", "Hi & bye", "line 1\nline 2");
    expect(url.startsWith("mailto:ana%40example.com?subject=Hi%20%26%20bye&body=line%201%0Aline%202")).toBe(true);
  });

  test("the summary counts leads by door and the steps due; stored leads survive junk", () => {
    const leads: Lead[] = [
      { id: "1", name: "A", email: "a@x.io", source: "contact", since: "2026-10-10", sent: ["welcome"] },
      { id: "2", name: "B", email: "b@x.io", source: "account", since: today, sent: [] },
    ];
    expect(leadsSummary(leads, today)).toEqual({ total: 2, due: 3, bySource: { contact: 1, newsletter: 0, account: 1 } });
    expect(parseLeads(JSON.stringify(leads))).toEqual(leads);
    expect(parseLeads('[{"id":"x"},{"id":"y","email":"e","source":"bogus","sent":[]}]')).toEqual([]);
    expect(parseLeads("{")).toEqual([]);
    expect(parseLeads(null)).toEqual([]);
  });
});
