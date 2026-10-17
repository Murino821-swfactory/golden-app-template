/**
 * scenarios.ts — each scene's data → the one shape the publish bar words and draws
 * (`ScenarioContent`). Pure, so the captions and cards are testable from data alone.
 */
import type { ScenarioContent } from "./channels";
import type { StudioCopy } from "./copy";
import { hostOf, projectsSummary, sortProjects, type LiveProject } from "./projects";
import { commitsOf, recordTotals, sortErasByCommits, type Era, type WeekDigest } from "./record";
import type { GameScore } from "./ship-it";

export const PROJECTS_URL = "https://tokenwise.sk/projects";
export const HISTORY_URL = "https://tokenwise.sk/how-it-works";

export function projectsContent(projects: readonly LiveProject[], copy: StudioCopy): ScenarioContent {
  const sorted = sortProjects(projects);
  const s = projectsSummary(sorted);
  const c = copy.projects;
  return {
    scenario: "projects",
    title: c.captionTitle(s.count),
    summary: c.captionSummary(s.newest?.name ?? "—", s.owners),
    lines: sorted.slice(0, 8).map((p) => c.captionLine(p.name, hostOf(p.url))),
    stats: [
      { label: c.statProjects, value: String(s.count) },
      { label: c.statLikes, value: String(s.likes) },
      { label: c.statOwners, value: String(s.owners) },
      { label: c.statNewest, value: s.newest?.name ?? "—" },
    ],
    url: PROJECTS_URL,
    hashtags: c.hashtags,
  };
}

export function recordContent(eras: readonly Era[], copy: StudioCopy): ScenarioContent {
  const t = recordTotals(eras);
  const byCommits = sortErasByCommits(eras);
  const top = byCommits[0];
  const c = copy.history;
  return {
    scenario: "history",
    title: c.captionTitle(t.commits, t.days),
    summary: top ? c.captionSummary(top.title, commitsOf(top)) : "",
    lines: byCommits.slice(0, 8).map((e) => c.eraLine(e.numeral, e.title, commitsOf(e))),
    stats: [
      { label: "commits", value: String(t.commits) },
      { label: c.days(t.days).replace(/^\d+\s*/, ""), value: String(t.days) },
      { label: c.era.toLowerCase() + "s", value: String(t.eras) },
      { label: top ? c.commits(commitsOf(top)).replace(/^\d+\s*/, "") : "", value: top ? String(commitsOf(top)) : "—" },
    ],
    url: HISTORY_URL,
    hashtags: c.hashtags,
  };
}

export function repoContent(repo: string, weeks: readonly WeekDigest[], copy: StudioCopy): ScenarioContent {
  const commits = weeks.reduce((n, w) => n + w.commits, 0);
  const top = weeks[0];
  const authors = new Set(weeks.flatMap((w) => w.authors)).size;
  const c = copy.history;
  return {
    scenario: "history",
    title: c.repoTitle(repo, commits),
    summary: top ? c.repoSummary(weeks.length, top.weekStart, top.commits) : "",
    lines: weeks.slice(0, 8).map((w) => c.weekLine(w.weekStart, w.commits, w.messages[0] ?? "")),
    stats: [
      { label: "commits", value: String(commits) },
      { label: "weeks", value: String(weeks.length) },
      { label: c.authors(authors).replace(/^\d+\s*/, ""), value: String(authors) },
      { label: top ? c.weekOf(top.weekStart) : "", value: top ? String(top.commits) : "—" },
    ],
    url: `https://github.com/${repo}`,
    hashtags: c.hashtags,
  };
}

export function gameContent(score: GameScore, bestLevel: number, pageUrl: string, copy: StudioCopy): ScenarioContent {
  const c = copy.game;
  return {
    scenario: "game",
    title: c.captionTitle(score.shipped, score.level),
    summary: c.captionSummary(score.squashed, score.escaped),
    lines: [c.lineShipped(score.shipped), c.lineSquashed(score.squashed), c.lineMissed(score.missed), c.lineEscaped(score.escaped), c.lineBest(bestLevel)],
    stats: [
      { label: c.level, value: String(score.level) },
      { label: c.shipped, value: String(score.shipped) },
      { label: c.squashed, value: String(score.squashed) },
      { label: c.escaped, value: String(score.escaped) },
    ],
    url: pageUrl,
    hashtags: c.hashtags,
  };
}
