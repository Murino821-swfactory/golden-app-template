/**
 * record.ts — the "history" scenario: a git history told by its commits.
 *
 * Two sources, one shape. The bundled record (`record-data.ts`) is the factory's own
 * story from tokenwise.sk/how-it-works — fifteen eras with a commit count each, which this
 * module can sort by commits. The live source is any PUBLIC GitHub repository, read from
 * the REST API in the browser and grouped into weekly digests, the unit GitPulse Studio
 * publishes. Private repositories need a token the demo never holds, so the record is the
 * fallback and the live fetch is the visitor's choice (a button, never a page load).
 */
import { ERAS, RECORD_CONTINUATION, RECORD_UPDATE_2026_10_12, type Era } from "./record-data";

export type { Era, EraEntry } from "./record-data";

/** What the bundled record describes and when it was frozen. */
export const RECORD_SOURCE = { repos: ["sw-factory", "factory-web"], asOf: "2026-10-12" } as const;

export function allEras(): Era[] {
  return [...ERAS, ...RECORD_CONTINUATION, ...RECORD_UPDATE_2026_10_12];
}

/** "9 days · 129 commits" → 129. An era without a count sorts last. */
export function commitsOf(era: Pick<Era, "scale">): number {
  const m = /(\d[\d\s]*)\s*commits?/i.exec(era.scale);
  return m ? Number(m[1].replace(/\s/g, "")) : 0;
}

/** "9 days · 129 commits" → 9. */
export function daysOf(era: Pick<Era, "scale">): number {
  const m = /(\d+)\s*days?/i.exec(era.scale);
  return m ? Number(m[1]) : 0;
}

/** Most commits first; equal counts keep their chronological order. */
export function sortErasByCommits<T extends Pick<Era, "scale">>(eras: readonly T[]): T[] {
  return eras
    .map((era, i) => ({ era, i }))
    .sort((a, b) => commitsOf(b.era) - commitsOf(a.era) || a.i - b.i)
    .map(({ era }) => era);
}

export function recordTotals(eras: readonly Pick<Era, "scale">[]): { commits: number; days: number; eras: number } {
  return {
    commits: eras.reduce((n, e) => n + commitsOf(e), 0),
    days: eras.reduce((n, e) => n + daysOf(e), 0),
    eras: eras.length,
  };
}

/* ── Live GitHub ──────────────────────────────────────────────────────────────────── */

export interface CommitInfo {
  sha: string;
  /** ISO 8601, the author date. */
  date: string;
  /** The subject line only. */
  message: string;
  author: string;
}

export interface WeekDigest {
  /** Monday of the week, YYYY-MM-DD (UTC). */
  weekStart: string;
  commits: number;
  authors: string[];
  /** Up to five subject lines, newest first. */
  messages: string[];
}

/** `owner/name`, the way GitHub prints it. */
export function isRepoSlug(value: string): boolean {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.trim());
}

/** The Monday (UTC) of the week an ISO date falls in, as YYYY-MM-DD. */
export function weekStartOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

/** Commits → weekly digests, busiest week first (ties: newest first). */
export function groupByWeek(commits: readonly CommitInfo[]): WeekDigest[] {
  const weeks = new Map<string, { authors: Set<string>; messages: string[] }>();
  const sorted = [...commits].sort((a, b) => b.date.localeCompare(a.date));
  for (const c of sorted) {
    const key = weekStartOf(c.date);
    if (!key) continue;
    const w = weeks.get(key) ?? { authors: new Set<string>(), messages: [] };
    if (c.author) w.authors.add(c.author);
    w.messages.push(c.message);
    weeks.set(key, w);
  }
  return [...weeks.entries()]
    .map(([weekStart, w]) => ({
      weekStart,
      commits: w.messages.length,
      authors: [...w.authors],
      messages: w.messages.slice(0, 5),
    }))
    .sort((a, b) => b.commits - a.commits || b.weekStart.localeCompare(a.weekStart));
}

/** The GitHub `GET /repos/{owner}/{repo}/commits` payload → what the digest needs. */
export function parseGitHubCommits(json: unknown): CommitInfo[] {
  if (!Array.isArray(json)) return [];
  const out: CommitInfo[] = [];
  for (const item of json) {
    const sha = typeof item?.sha === "string" ? item.sha : "";
    const commit = item?.commit;
    const date = typeof commit?.author?.date === "string" ? commit.author.date : typeof commit?.committer?.date === "string" ? commit.committer.date : "";
    if (!sha || !date) continue;
    const message = typeof commit?.message === "string" ? commit.message.split("\n")[0].trim() : "";
    const author =
      typeof item?.author?.login === "string" ? item.author.login : typeof commit?.author?.name === "string" ? commit.author.name : "";
    out.push({ sha, date, message, author });
  }
  return out;
}

export type GitHubFailure = "not-found" | "rate-limited" | "unavailable";

export class GitHubError extends Error {
  constructor(public readonly reason: GitHubFailure) {
    super(`github: ${reason}`);
  }
}

const COMMITS_PER_PAGE = 100;

/**
 * Up to `pages` × 100 of a public repository's newest commits. Unauthenticated: sixty
 * requests an hour per address, which is why the scene caches the answer and only calls
 * this on a click.
 */
export async function fetchRepoCommits(
  repo: string,
  { pages = 3, fetchImpl = fetch }: { pages?: number; fetchImpl?: typeof fetch } = {}
): Promise<CommitInfo[]> {
  if (!isRepoSlug(repo)) throw new GitHubError("not-found");
  const all: CommitInfo[] = [];
  for (let page = 1; page <= pages; page++) {
    const res = await fetchImpl(
      `https://api.github.com/repos/${repo.trim()}/commits?per_page=${COMMITS_PER_PAGE}&page=${page}`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (res.status === 404) throw new GitHubError("not-found");
    if (res.status === 403 || res.status === 429) throw new GitHubError("rate-limited");
    if (!res.ok) throw new GitHubError("unavailable");
    const batch = parseGitHubCommits(await res.json());
    all.push(...batch);
    if (batch.length < COMMITS_PER_PAGE) break;
  }
  return all;
}

/** A visitor's last successful fetch, kept for fifteen minutes so a reload is free. */
export const GITHUB_CACHE_PREFIX = "gitpulse.github.v1:";
export const GITHUB_CACHE_MS = 15 * 60 * 1000;

interface CachedCommits {
  at: number;
  commits: CommitInfo[];
}

export function readCachedCommits(repo: string, now = Date.now()): CommitInfo[] | null {
  try {
    const raw = window.localStorage.getItem(GITHUB_CACHE_PREFIX + repo);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedCommits>;
    if (typeof parsed.at !== "number" || !Array.isArray(parsed.commits)) return null;
    if (now - parsed.at > GITHUB_CACHE_MS) return null;
    return parsed.commits as CommitInfo[];
  } catch {
    return null;
  }
}

export function writeCachedCommits(repo: string, commits: CommitInfo[], now = Date.now()): void {
  try {
    window.localStorage.setItem(GITHUB_CACHE_PREFIX + repo, JSON.stringify({ at: now, commits } satisfies CachedCommits));
  } catch {
    /* storage full or blocked — the next click fetches again */
  }
}
