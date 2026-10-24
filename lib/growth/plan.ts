/**
 * plan.ts — the content plan as data: an idea bank (pillar × shape × channels), seven
 * weekly slots, and a deterministic rotation so a given week always shows the same plan
 * and no two consecutive weeks repeat an idea. Pure; the words are in `copy.ts`, the
 * publishing in the studio's bar (`ideaContent` → `ScenarioContent`).
 */
import type { ChannelId, ContentKind, ScenarioContent } from "@/lib/studio/channels";
import type { PublishLogEntry } from "@/lib/studio/publish";
import type { GrowthCopy, Pillar } from "./copy";

export const SITE_URL = "https://tokenwise.sk/";

export const IDEA_IDS = [
  "who-we-are",
  "shopify-site",
  "build-use-result",
  "efficiency",
  "services-summary",
  "ai-agents",
  "how-to-register",
  "daily-ops",
  "free-checklist",
  "repurpose-youtube",
  "origin-story",
  "proof-projects",
  "faq-story",
  "weekly-recap",
  "token-offer",
] as const;
export type IdeaId = (typeof IDEA_IDS)[number];

export interface Idea {
  id: IdeaId;
  pillar: Pillar;
  kind: ContentKind;
  /** Where the shape fits best — the bar still offers all five. */
  channels: ChannelId[];
  /** Where the caption sends people. */
  url: string;
}

export const IDEAS: readonly Idea[] = [
  { id: "who-we-are", pillar: "brand", kind: "post", channels: ["instagram", "facebook"], url: SITE_URL },
  { id: "shopify-site", pillar: "proof", kind: "reel", channels: ["instagram", "tiktok", "youtube"], url: SITE_URL },
  { id: "build-use-result", pillar: "proof", kind: "video", channels: ["youtube", "tiktok", "facebook"], url: SITE_URL },
  { id: "efficiency", pillar: "educational", kind: "post", channels: ["facebook", "instagram", "site"], url: `${SITE_URL}how-it-works` },
  { id: "services-summary", pillar: "brand", kind: "post", channels: ["site", "facebook", "instagram"], url: SITE_URL },
  { id: "ai-agents", pillar: "educational", kind: "story", channels: ["instagram", "facebook"], url: `${SITE_URL}how-it-works` },
  { id: "how-to-register", pillar: "value", kind: "story", channels: ["instagram", "facebook"], url: SITE_URL },
  { id: "daily-ops", pillar: "value", kind: "story", channels: ["instagram"], url: SITE_URL },
  { id: "free-checklist", pillar: "value", kind: "post", channels: ["facebook", "instagram", "site"], url: SITE_URL },
  { id: "repurpose-youtube", pillar: "educational", kind: "reel", channels: ["tiktok", "instagram"], url: "https://www.youtube.com/@tokenwisefactory" },
  { id: "origin-story", pillar: "brand", kind: "story", channels: ["instagram", "facebook"], url: `${SITE_URL}how-it-works` },
  { id: "proof-projects", pillar: "proof", kind: "post", channels: ["instagram", "facebook", "site"], url: `${SITE_URL}projects` },
  { id: "faq-story", pillar: "educational", kind: "story", channels: ["instagram"], url: SITE_URL },
  { id: "weekly-recap", pillar: "proof", kind: "article", channels: ["site", "facebook"], url: `${SITE_URL}how-it-works` },
  { id: "token-offer", pillar: "value", kind: "post", channels: ["instagram", "facebook"], url: SITE_URL },
];

export const IDEA_BY_ID: Record<IdeaId, Idea> = Object.fromEntries(IDEAS.map((i) => [i.id, i])) as Record<IdeaId, Idea>;

export interface Slot {
  /** 0 = Monday. */
  day: number;
  kind: ContentKind;
  pillar: Pillar;
}

/** The week's rhythm: posts on weekdays, the wow reel and the video around them, the
 * article on Sunday for the site — plus a story every day, said in the copy. */
export const WEEK_SLOTS: readonly Slot[] = [
  { day: 0, kind: "post", pillar: "educational" },
  { day: 1, kind: "reel", pillar: "proof" },
  { day: 2, kind: "story", pillar: "value" },
  { day: 3, kind: "post", pillar: "brand" },
  { day: 4, kind: "video", pillar: "proof" },
  { day: 5, kind: "reel", pillar: "educational" },
  { day: 6, kind: "article", pillar: "proof" },
];

/** The Monday of the week an ISO date or timestamp falls in (UTC), `YYYY-MM-DD`. */
export function mondayOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

export function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` of the slot's day inside the week. */
export function dateOfSlot(weekStart: string, day: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day);
  return d.toISOString().slice(0, 10);
}

const EPOCH_MONDAY = Date.UTC(2026, 0, 5); // a Monday

/** Whole weeks since the epoch Monday — the rotation's clock. */
export function weekIndexOf(weekStart: string): number {
  const t = new Date(`${weekStart}T00:00:00Z`).getTime();
  return Math.floor((t - EPOCH_MONDAY) / (7 * 86_400_000));
}

/** The ideas a slot can take: same shape and pillar first; same shape alone when the
 * pillar has none of that shape. */
export function poolFor(slot: Slot, ideas: readonly Idea[] = IDEAS): Idea[] {
  const exact = ideas.filter((i) => i.kind === slot.kind && i.pillar === slot.pillar);
  return exact.length ? exact : ideas.filter((i) => i.kind === slot.kind);
}

export interface PlannedSlot {
  slot: Slot;
  idea: Idea;
  date: string;
}

/** The seven planned items of a week; the pick rotates with the week so the same idea
 * does not come back the following week when the pool allows it. */
export function weekPlan(weekStart: string, ideas: readonly Idea[] = IDEAS): PlannedSlot[] {
  const index = weekIndexOf(weekStart);
  return WEEK_SLOTS.map((slot, i) => {
    const pool = poolFor(slot, ideas);
    const idea = pool[((index + i) % pool.length + pool.length) % pool.length] ?? ideas[0]!;
    return { slot, idea, date: dateOfSlot(weekStart, slot.day) };
  });
}

/** Successful publishes only — a cancelled share sheet is not a post. */
export function isPublished(entry: Pick<PublishLogEntry, "outcome">): boolean {
  return entry.outcome === "shared" || entry.outcome === "opened" || entry.outcome === "downloaded" || entry.outcome === "published";
}

/** Whether this planned item went out in this week, by the log's `ref`. */
export function slotDone(ideaId: IdeaId, weekStart: string, log: readonly PublishLogEntry[]): boolean {
  return log.some((e) => e.ref === ideaId && isPublished(e) && mondayOf(e.at) === weekStart);
}

export function planProgress(weekStart: string, log: readonly PublishLogEntry[], plan = weekPlan(weekStart)): { done: number; total: number } {
  return { done: plan.filter((p) => slotDone(p.idea.id, weekStart, log)).length, total: plan.length };
}

/** One idea, worded for the publish bar. The product line is the plan's caption rule;
 * the coupon line joins the promo idea when a code is set. */
export function ideaContent(idea: Idea, copy: GrowthCopy, opts: { coupon?: string } = {}): ScenarioContent {
  const words = copy.plan.ideas[idea.id];
  const lines = [...(words?.beats ?? [])];
  if (idea.id === "token-offer") lines.push(opts.coupon ? copy.plan.couponLine(opts.coupon) : copy.plan.couponMissing);
  lines.push(copy.productLine);
  return {
    scenario: "plan",
    kind: idea.kind,
    ref: idea.id,
    title: words?.hook ?? idea.id,
    summary: words?.summary ?? "",
    lines,
    stats: [
      { label: copy.pillars[idea.pillar], value: copy.kinds[idea.kind] },
      { label: copy.plan.recommended, value: idea.channels.map((c) => copy.channels[c]).join(" · ") },
    ],
    url: idea.url,
    hashtags: copy.plan.hashtags,
  };
}
