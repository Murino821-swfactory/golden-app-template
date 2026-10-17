/**
 * report.ts — the weekly report, computed: what went out (this browser's publish log, by
 * shape and by channel), the numbers typed in for the week (reach, followers, visits,
 * registrations) against the week before, and the goals — weekly and monthly — with a
 * suggestion for next week. Pure, so the suite can hold it to the arithmetic; the words
 * are in `copy.ts`, the Markdown and the publishable article come out of here too.
 */
import type { ChannelId, ContentKind, ScenarioContent } from "@/lib/studio/channels";
import type { PublishLogEntry } from "@/lib/studio/publish";
import type { GrowthCopy } from "./copy";
import { SITE_URL, dateOfSlot, isPublished, mondayOf, shiftWeek } from "./plan";

export interface WeekMetrics {
  reach: number;
  followers: number;
  visits: number;
  registrations: number;
}

export const EMPTY_METRICS: WeekMetrics = { reach: 0, followers: 0, visits: 0, registrations: 0 };
export const METRIC_KEYS: readonly (keyof WeekMetrics)[] = ["reach", "followers", "visits", "registrations"];

export interface Goals {
  weekly: { pieces: number; reach: number; registrations: number };
  monthly: { registrations: number; followers: number };
}

export const DEFAULT_GOALS: Goals = {
  weekly: { pieces: 7, reach: 1000, registrations: 5 },
  monthly: { registrations: 20, followers: 500 },
};

export const CONTENT_KINDS: readonly ContentKind[] = ["post", "story", "reel", "video", "article"];
export const CHANNEL_IDS: readonly ChannelId[] = ["site", "facebook", "instagram", "tiktok", "youtube"];

/** The shape of a logged piece: what the content said, else what the channel implies. */
export function kindOf(entry: Pick<PublishLogEntry, "kind" | "channel">): ContentKind {
  if (entry.kind) return entry.kind;
  switch (entry.channel) {
    case "site":
      return "article";
    case "tiktok":
    case "youtube":
      return "video";
    default:
      return "post";
  }
}

export function entriesInWeek(log: readonly PublishLogEntry[], weekStart: string): PublishLogEntry[] {
  return log.filter((e) => isPublished(e) && mondayOf(e.at) === weekStart);
}

export interface GoalLine {
  have: number;
  goal: number;
  met: boolean;
}

export interface WeekReport {
  weekStart: string;
  weekEnd: string;
  produced: Record<ContentKind, number>;
  total: number;
  byChannel: Record<ChannelId, number>;
  metrics: WeekMetrics;
  previous: WeekMetrics | null;
  /** This week minus the week before, when there is one. */
  deltas: WeekMetrics | null;
  goals: Goals;
  weekly: { pieces: GoalLine; reach: GoalLine; registrations: GoalLine };
  monthly: { registrations: GoalLine; followers: GoalLine };
  /** Next week's weekly goals: a met goal grows by a fifth, a missed one stays. */
  suggested: Goals["weekly"];
}

function count<K extends string>(keys: readonly K[], items: readonly K[]): Record<K, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const item of items) if (item in out) out[item] += 1;
  return out;
}

function line(have: number, goal: number): GoalLine {
  return { have, goal, met: goal > 0 && have >= goal };
}

export function suggestWeekly(weekly: WeekReport["weekly"], goals: Goals["weekly"]): Goals["weekly"] {
  const grow = (g: number, met: boolean) => (met ? Math.ceil(g * 1.2) : g);
  return {
    pieces: grow(goals.pieces, weekly.pieces.met),
    reach: grow(goals.reach, weekly.reach.met),
    registrations: grow(goals.registrations, weekly.registrations.met),
  };
}

/** The weeks of a month: those whose Monday falls in the month of `weekStart`. */
export function weeksOfMonth(weekStart: string, metricsByWeek: Readonly<Record<string, WeekMetrics>>): string[] {
  const month = weekStart.slice(0, 7);
  return Object.keys(metricsByWeek)
    .filter((w) => w.slice(0, 7) === month)
    .sort();
}

export function buildReport(input: {
  weekStart: string;
  log: readonly PublishLogEntry[];
  metricsByWeek: Readonly<Record<string, WeekMetrics>>;
  goals: Goals;
}): WeekReport {
  const { weekStart, log, metricsByWeek, goals } = input;
  const entries = entriesInWeek(log, weekStart);
  const produced = count(CONTENT_KINDS, entries.map(kindOf));
  const byChannel = count(CHANNEL_IDS, entries.map((e) => e.channel));
  const metrics = metricsByWeek[weekStart] ?? EMPTY_METRICS;
  const previous = metricsByWeek[shiftWeek(weekStart, -1)] ?? null;
  const deltas = previous
    ? { reach: metrics.reach - previous.reach, followers: metrics.followers - previous.followers, visits: metrics.visits - previous.visits, registrations: metrics.registrations - previous.registrations }
    : null;
  const monthWeeks = weeksOfMonth(weekStart, metricsByWeek);
  const monthRegistrations = monthWeeks.reduce((n, w) => n + (metricsByWeek[w]?.registrations ?? 0), 0) + (monthWeeks.includes(weekStart) ? 0 : metrics.registrations);
  const latestFollowers = monthWeeks.length ? (metricsByWeek[monthWeeks[monthWeeks.length - 1]!]?.followers ?? 0) : metrics.followers;
  const weekly = {
    pieces: line(entries.length, goals.weekly.pieces),
    reach: line(metrics.reach, goals.weekly.reach),
    registrations: line(metrics.registrations, goals.weekly.registrations),
  };
  return {
    weekStart,
    weekEnd: dateOfSlot(weekStart, 6),
    produced,
    total: entries.length,
    byChannel,
    metrics,
    previous,
    deltas,
    goals,
    weekly,
    monthly: { registrations: line(monthRegistrations, goals.monthly.registrations), followers: line(latestFollowers, goals.monthly.followers) },
    suggested: suggestWeekly(weekly, goals.weekly),
  };
}

/** The report as a Markdown file — the same facts in the shape a founder files. */
export function reportMarkdown(r: WeekReport, copy: GrowthCopy): string {
  const c = copy.report;
  const out = [`# ${c.articleTitle(r.weekStart)}`, "", c.range(r.weekStart, r.weekEnd), "", `## ${c.mdProduced}`, ""];
  for (const kind of CONTENT_KINDS) if (r.produced[kind]) out.push(`- ${c.lineProduced(copy.kinds[kind], r.produced[kind])}`);
  if (!r.total) out.push(`- ${c.empty}`);
  out.push("", `### ${c.byChannel}`, "");
  for (const ch of CHANNEL_IDS) if (r.byChannel[ch]) out.push(`- ${copy.channels[ch]}: ${r.byChannel[ch]}`);
  out.push("", `## ${c.mdNumbers}`, "");
  for (const key of METRIC_KEYS) {
    const delta = r.deltas ? ` (${c.vsLast(r.deltas[key])})` : "";
    out.push(`- ${c[key]}: ${r.metrics[key]}${delta}`);
  }
  out.push("", `## ${c.mdGoals}`, "");
  out.push(`- ${c.lineGoal(c.goalPieces, r.weekly.pieces.have, r.weekly.pieces.goal)} → ${r.suggested.pieces}`);
  out.push(`- ${c.lineGoal(c.goalReach, r.weekly.reach.have, r.weekly.reach.goal)} → ${r.suggested.reach}`);
  out.push(`- ${c.lineGoal(c.goalRegistrations, r.weekly.registrations.have, r.weekly.registrations.goal)} → ${r.suggested.registrations}`);
  out.push("", `## ${c.mdMonthly}`, "");
  out.push(`- ${c.lineGoal(c.goalRegistrations, r.monthly.registrations.have, r.monthly.registrations.goal)}`);
  out.push(`- ${c.lineGoal(c.goalFollowers, r.monthly.followers.have, r.monthly.followers.goal)}`);
  out.push("");
  return out.join("\n");
}

/** The report as a build-in-public post for the bar. */
export function reportContent(r: WeekReport, copy: GrowthCopy): ScenarioContent {
  const c = copy.report;
  const lines = CONTENT_KINDS.filter((k) => r.produced[k]).map((k) => c.lineProduced(copy.kinds[k], r.produced[k]));
  lines.push(c.lineGoal(c.goalPieces, r.weekly.pieces.have, r.weekly.pieces.goal));
  lines.push(c.lineGoal(c.goalRegistrations, r.weekly.registrations.have, r.weekly.registrations.goal));
  lines.push(copy.productLine);
  return {
    scenario: "report",
    kind: "article",
    ref: `report:${r.weekStart}`,
    title: c.articleTitle(r.weekStart),
    summary: c.articleSummary(r.total, r.metrics.reach, r.metrics.registrations),
    lines,
    stats: [
      { label: c.produced, value: String(r.total) },
      { label: c.reach, value: String(r.metrics.reach) },
      { label: c.registrations, value: String(r.metrics.registrations) },
      { label: c.followers, value: String(r.metrics.followers) },
    ],
    url: `${SITE_URL}how-it-works`,
    hashtags: c.hashtags,
  };
}

export function reportFileName(weekStart: string): string {
  return `${weekStart}-weekly-report.md`;
}
