/**
 * profile.ts — the Instagram profile kit's rules: the bio limit, the highlight covers in
 * their order, the fresh-start checklist, and a highlight worded as a story for the
 * publish bar. Pure; the words are in `copy.ts`.
 */
import type { ScenarioContent } from "@/lib/studio/channels";
import type { GrowthCopy } from "./copy";
import { SITE_URL } from "./plan";

/** Instagram's bio limit. */
export const BIO_MAX = 150;
/** Instagram truncates a highlight's title past this. */
export const HIGHLIGHT_TITLE_MAX = 15;

export const HIGHLIGHT_IDS = ["apps", "results", "about", "faq", "start"] as const;
export type HighlightId = (typeof HIGHLIGHT_IDS)[number];

export const CHECKLIST_IDS = ["bio", "name", "logo", "archive", "post-who", "post-what", "post-how", "highlights", "friends", "follow", "daily"] as const;
export type ChecklistId = (typeof CHECKLIST_IDS)[number];

export function bioFits(bio: string): boolean {
  return bio.length > 0 && bio.length <= BIO_MAX;
}

/** Every bio variant and highlight title in a language fits the network's limits — the
 * copy is checked by the suite, not by the visitor. */
export function profileCopyIssues(copy: GrowthCopy): string[] {
  const issues: string[] = [];
  copy.profile.bios.forEach((bio, i) => {
    if (!bioFits(bio)) issues.push(`bio ${i + 1} is ${bio.length} characters (max ${BIO_MAX})`);
  });
  for (const id of HIGHLIGHT_IDS) {
    const h = copy.profile.highlights[id];
    if (!h) issues.push(`highlight ${id} has no copy`);
    else if (h.title.length > HIGHLIGHT_TITLE_MAX) issues.push(`highlight ${id} title "${h.title}" exceeds ${HIGHLIGHT_TITLE_MAX}`);
  }
  for (const id of CHECKLIST_IDS) if (!copy.profile.checklist[id]) issues.push(`checklist step ${id} has no copy`);
  return issues;
}

export function toggleDone(done: readonly string[], id: string): string[] {
  return done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
}

export function checklistProgress(done: readonly string[]): { done: number; total: number } {
  return { done: CHECKLIST_IDS.filter((id) => done.includes(id)).length, total: CHECKLIST_IDS.length };
}

/** A highlight as a three-story set for the bar: the cover's purpose is the summary,
 * the stories are the lines. */
export function highlightContent(id: HighlightId, copy: GrowthCopy): ScenarioContent {
  const h = copy.profile.highlights[id];
  return {
    scenario: "profile",
    kind: "story",
    ref: `highlight:${id}`,
    title: `${h?.title ?? id} — ${copy.profile.handle}`,
    summary: h?.purpose ?? "",
    lines: [...(h?.stories ?? []), copy.productLine],
    stats: [
      { label: copy.profile.highlightsHeading, value: h?.title ?? id },
      { label: copy.kinds.story, value: String(h?.stories.length ?? 0) },
    ],
    url: id === "apps" ? `${SITE_URL}projects` : SITE_URL,
    hashtags: copy.plan.hashtags,
  };
}
