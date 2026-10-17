import type { Digest } from "./types";

/**
 * github.ts — a week of a PUBLIC repository's activity, read in the visitor's browser from
 * api.github.com (no key; 60 requests/hour/IP is plenty for a demo) and reduced to the
 * bounded Digest the generation API accepts. The reducing functions are pure and the
 * fetching is one thin function around them, so the logic spec runs without a network —
 * and so does the studio, through SAMPLE_DIGEST, when GitHub is rate-limited or offline.
 */

export const REPO_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;

/** The Monday of the week `date` falls in, as an ISO date (the digest's `weekOf`). */
export function weekStart(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  utc.setUTCDate(utc.getUTCDate() - ((day + 6) % 7));
  return utc.toISOString().slice(0, 10);
}

export interface CommitLike {
  message: string;
  author: string;
}

export interface PullLike {
  title: string;
  mergedAt: string | null;
}

const MAX_HIGHLIGHTS = 8;
const HIGHLIGHT_CHARS = 140;

/** First lines of real work — merge/revert/bot noise is not a story worth telling. */
export function commitHighlights(commits: CommitLike[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const commit of commits) {
    const line = commit.message.split("\n", 1)[0]!.trim().slice(0, HIGHLIGHT_CHARS);
    const key = line.toLowerCase();
    if (!line || seen.has(key)) continue;
    if (/^(merge |revert )/i.test(line)) continue;
    if (/\[bot\]|dependabot/i.test(`${line} ${commit.author}`)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

export function buildDigest(input: {
  repo: string;
  weekOf: string;
  commits: CommitLike[];
  pulls: PullLike[];
  languages: string[];
  since: string;
  until: string;
}): Digest {
  const merged = input.pulls.filter((p) => p.mergedAt && p.mergedAt >= input.since && p.mergedAt < input.until);
  const authors = new Set(input.commits.map((c) => c.author.toLowerCase()).filter(Boolean));
  const highlights = [
    ...merged.map((p) => p.title.trim().slice(0, HIGHLIGHT_CHARS)).filter(Boolean),
    ...commitHighlights(input.commits),
  ].slice(0, MAX_HIGHLIGHTS);
  return {
    repo: input.repo,
    weekOf: input.weekOf,
    commits: input.commits.length,
    pullRequests: merged.length,
    contributors: authors.size,
    languages: input.languages.slice(0, 5),
    highlights,
  };
}

export type DigestOutcome =
  | { ok: true; digest: Digest }
  | { ok: false; error: "not-found" | "rate-limited" | "network" };

interface GhCommit { commit?: { message?: string; author?: { name?: string } }; author?: { login?: string } | null }
interface GhPull { title?: string; merged_at?: string | null }

async function gh(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { accept: "application/vnd.github+json" },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

/** The whole network half: three GitHub calls reduced by the pure functions above. */
export async function fetchDigest(repo: string, now = new Date()): Promise<DigestOutcome> {
  const weekOf = weekStart(now);
  const since = `${weekOf}T00:00:00Z`;
  const until = now.toISOString();
  try {
    const [commitsRes, pullsRes, langRes] = await Promise.all([
      gh(`/repos/${repo}/commits?since=${since}&per_page=100`),
      gh(`/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=50`),
      gh(`/repos/${repo}/languages`),
    ]);
    if (commitsRes.status === 404) return { ok: false, error: "not-found" };
    if (commitsRes.status === 403 || commitsRes.status === 429) return { ok: false, error: "rate-limited" };
    if (commitsRes.status !== 200 || !Array.isArray(commitsRes.body)) return { ok: false, error: "network" };
    const commits: CommitLike[] = (commitsRes.body as GhCommit[]).map((c) => ({
      message: c.commit?.message ?? "",
      author: c.author?.login ?? c.commit?.author?.name ?? "",
    }));
    const pulls: PullLike[] = Array.isArray(pullsRes.body)
      ? (pullsRes.body as GhPull[]).map((p) => ({ title: p.title ?? "", mergedAt: p.merged_at ?? null }))
      : [];
    const languages = langRes.status === 200 && langRes.body && typeof langRes.body === "object"
      ? Object.keys(langRes.body as Record<string, number>)
      : [];
    return { ok: true, digest: buildDigest({ repo, weekOf, commits, pulls, languages, since, until }) };
  } catch {
    return { ok: false, error: "network" };
  }
}

/** A believable week, for the demo path and for every environment without a network. */
export const SAMPLE_DIGEST: Digest = {
  repo: "tokenwise/gitpulse",
  weekOf: weekStart(new Date()),
  commits: 23,
  pullRequests: 5,
  contributors: 3,
  additions: 1840,
  deletions: 920,
  languages: ["TypeScript", "CSS"],
  highlights: [
    "Checkout rewrite shipped behind a feature flag",
    "Weekly digest API: quotas and cost logging",
    "Recap video composition with animated counters",
    "Fix flaky payment webhook test",
    "Dark-mode contrast pass on the dashboard",
  ],
};
