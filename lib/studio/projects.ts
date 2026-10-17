/**
 * projects.ts — the "live projects" scenario: every public project the factory runs or
 * its owners adopted, the same list tokenwise.sk/projects shows.
 *
 * The live source is Firestore `projects` (`publicVisible` and `active`), readable by
 * anyone under factory-web's rules and served from the same Firebase project every
 * prototype uses. The bundled snapshot below is what the scene shows while that loads,
 * and what it falls back to when Firestore is not configured (local builds, the smoke
 * gate) — real documents, frozen on 2026-10-16, never invented.
 */

export interface LiveProject {
  key: string;
  name: string;
  description: string | null;
  /** The production address, or null while the project has none. */
  url: string | null;
  likeCount: number;
  creatorName: string | null;
  ownerName: string | null;
  /** YYYY-MM-DD. */
  createdAt: string;
}

export const PROJECTS_SNAPSHOT_AS_OF = "2026-10-16";

export const PROJECTS_SNAPSHOT: LiveProject[] = [
  { key: "oss-billing", name: "OSS Billing", description: "Automated EU OSS VAT billing for SaaS makers selling to consumers worldwide.", url: "https://tokenwise.sk/newapp/oss-billing", likeCount: 0, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-10-11" },
  { key: "reading-diary", name: "Reading Diary", description: "A reading diary for primary-school pupils with a quiz before each book counts.", url: "https://apps.tokenwise.sk/newapp/reading-diary", likeCount: 0, creatorName: "Miroslav", ownerName: "Zoja", createdAt: "2026-10-11" },
  { key: "realitny-makler", name: "Realitný maklér", description: "An agency's current listings on a map, every enquiry with a phone number and the offer it concerns.", url: "https://apps.tokenwise.sk/newapp/realitny-makler", likeCount: 1, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-10-11" },
  { key: "integracia-openbanking-system-2", name: "integrácia PSD2", description: "Expense records, reporting and forecasts on top of open-banking (PSD2) data.", url: "https://apps.tokenwise.sk/newapp/integracia-openbanking-system-2", likeCount: 0, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-10-11" },
  { key: "travel-expert", name: "Travel expert", description: "Hotel bookings and business-trip records in one place.", url: "https://apps.tokenwise.sk/newapp/travel-expert", likeCount: 0, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-10-11" },
  { key: "fundraising", name: "fundraising", description: "Grant calls, their status and the documents each one needs.", url: "https://apps.tokenwise.sk/newapp/fundraising", likeCount: 0, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-10-11" },
  { key: "new-game", name: "New game", description: "A hobby game connecting Unreal Engine 5 through an NPC server.", url: "https://apps.tokenwise.sk/newapp/new-game", likeCount: 0, creatorName: "Miroslav", ownerName: "Peter", createdAt: "2026-10-09" },
  { key: "continue", name: "Continue", description: "A web orchestrator and dashboard for local AI coding agents and their token quotas.", url: "https://apps.tokenwise.sk/newapp/continue", likeCount: 0, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-09-29" },
  { key: "sportsevent", name: "Sportsevent", description: "Organising a sports event: tasks, and the programme for participants across venues.", url: "https://apps.tokenwise.sk/newapp/sportsevent", likeCount: 0, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-09-26" },
  { key: "gitpulse-studio", name: "GitPulse Studio", description: "Commits and pull requests turned into posts, visuals and clips — this app.", url: "https://tokenwise.sk/newapp/gitpulse-studio", likeCount: 1, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-09-24" },
  { key: "law-expert", name: "Law expert", description: "A lawyer's workspace that consolidates a large legal database into answers.", url: "https://tokenwise.sk/newapp/law-expert", likeCount: 1, creatorName: "Tomáš", ownerName: "Tomáš", createdAt: "2026-09-24" },
  { key: "faunatrack", name: "FaunaTrack", description: "GPS telemetry for wildlife with inactivity alerts and territory geofences.", url: "https://tokenwise.sk/newapp/faunatrack", likeCount: 0, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-09-24" },
  { key: "bizlaunch-cee", name: "BizLaunch CEE", description: "Founding a company abroad: one transparent comparison and a clear procedure.", url: "https://tokenwise.sk/newapp/bizlaunch-cee", likeCount: 0, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-09-21" },
  { key: "unbroken", name: "Unbroken", description: "A habit tracker that removes the all-or-nothing guilt of a missed day.", url: "https://apps.tokenwise.sk/newapp/unbroken", likeCount: 0, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-09-19" },
  { key: "cv-matcher", name: "CV Matcher", description: "Instant match scores between CVs and a position, with feedback for candidates.", url: "https://cvmatcher.tokenwise.sk", likeCount: 1, creatorName: "Miša", ownerName: "Miša", createdAt: "2026-09-19" },
  { key: "factory-web", name: "tokenwise", description: "The software factory's public face — tokenwise.sk itself.", url: "https://tokenwise.sk", likeCount: 0, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-08-04" },
  { key: "propcheck", name: "PropCheck", description: "Map-based property due-diligence tool.", url: "https://propcheck.tokenwise.sk", likeCount: 0, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-08-04" },
  { key: "collectibles", name: "Collectibles", description: "Trading-card catalog and collection manager.", url: "https://assetide.com", likeCount: 1, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-08-04" },
  { key: "wismeo", name: "Wismeo", description: "Real-estate portfolio management portal.", url: "https://www.wismeo.com/sk", likeCount: 1, creatorName: "Miroslav", ownerName: "Ivan", createdAt: "2026-08-04" },
  { key: "wellnesspodhajska", name: "Wellness Podhájska", description: "Wellness resort website with bookings and multilingual content.", url: "https://wellnesspodhajska.sk", likeCount: 0, creatorName: "Miroslav", ownerName: "Miroslav", createdAt: "2026-08-02" },
  { key: "gameday", name: "GameDay", description: "App for organizing amateur sports matches.", url: "https://gameday.tokenwise.sk", likeCount: 1, creatorName: "Mišo", ownerName: "Mišo", createdAt: "2026-08-01" },
];

/** The order tokenwise.sk/projects uses: most liked first, then newest. */
export function sortProjects(list: readonly LiveProject[]): LiveProject[] {
  return [...list].sort((a, b) => b.likeCount - a.likeCount || b.createdAt.localeCompare(a.createdAt));
}

export interface ProjectsSummary {
  count: number;
  likes: number;
  /** Distinct owners credited on the cards. */
  owners: number;
  newest: LiveProject | null;
}

export function projectsSummary(list: readonly LiveProject[]): ProjectsSummary {
  const owners = new Set(list.map((p) => p.ownerName).filter((n): n is string => Boolean(n)));
  const newest = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  return { count: list.length, likes: list.reduce((n, p) => n + p.likeCount, 0), owners: owners.size, newest };
}

/** "https://www.wismeo.com/sk" → "wismeo.com/sk"; a project address, not a protocol. */
export function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "");
    return u.host.replace(/^www\./, "") + path;
  } catch {
    return url;
  }
}

/** The first sentence, at most `max` characters — a card line, not a brief. */
export function shortDescription(text: string | null | undefined, max = 120): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentence = clean.split(/(?<=[.!?])\s/)[0] ?? clean;
  const base = sentence.length <= max ? sentence : clean;
  return base.length <= max ? base : base.slice(0, max - 1).trimEnd() + "…";
}

/** A Firestore document → a card, or null when it is not a project the grid shows. */
export function toLiveProject(key: string, data: Record<string, unknown>): LiveProject | null {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) return null;
  const environments = data.environments as { production?: { url?: unknown } } | undefined;
  const url = typeof environments?.production?.url === "string" ? environments.production.url : null;
  const createdAtRaw = data.createdAt as { toDate?: () => Date } | string | undefined;
  const createdAt =
    typeof createdAtRaw === "string"
      ? createdAtRaw.slice(0, 10)
      : createdAtRaw && typeof createdAtRaw.toDate === "function"
        ? createdAtRaw.toDate().toISOString().slice(0, 10)
        : "";
  return {
    key,
    name,
    description: typeof data.description === "string" ? data.description : null,
    url,
    likeCount: typeof data.likeCount === "number" ? data.likeCount : 0,
    creatorName: typeof data.creatorName === "string" ? data.creatorName : null,
    ownerName: typeof data.ownerName === "string" ? data.ownerName : null,
    createdAt,
  };
}

/**
 * The live list from Firestore. Throws when Firebase is not configured or the read is
 * refused; the scene then keeps the snapshot and says so.
 */
export async function loadLiveProjects(): Promise<LiveProject[]> {
  const [{ getFirestoreInstance }, { collection, getDocs, limit, orderBy, query, where }] = await Promise.all([
    import("@/lib/firebase"),
    import("firebase/firestore"),
  ]);
  const db = getFirestoreInstance();
  const q = query(
    collection(db, "projects"),
    where("publicVisible", "==", true),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toLiveProject(d.id, d.data() as Record<string, unknown>)).filter((p): p is LiveProject => p !== null);
}
