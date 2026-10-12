/**
 * store.ts — the workspace in memory, mirrored to localStorage.
 *
 * A static export has no server, so one recruiter's desk lives in their browser under a
 * versioned key, the same way the job library already does (`cv-matcher:job-library:v1`).
 * The store is a tiny external store for React's `useSyncExternalStore`: `null` until
 * `initWorkspace` has run on the client (the server render and the first client render
 * agree on that, so there is no hydration mismatch), then a frozen snapshot replaced
 * wholesale on every write. Writes go through `update`, which clones, mutates, stamps
 * `updatedAt`, persists and notifies. Another tab's write arrives through the `storage`
 * event and replaces the snapshot the same way.
 */
import { WORKSPACE_VERSION, type Workspace } from "./model";
import { seedWorkspace } from "./seed";

export const WORKSPACE_KEY = "cv-matcher:workspace:v1";

type Listener = () => void;

let snapshot: Workspace | null = null;
let storageBlocked = false;
let listening = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): Workspace | null {
  return snapshot;
}

export function getServerSnapshot(): null {
  return null;
}

/** True when the browser refused to persist — the workspace then lasts this visit only. */
export function isStorageBlocked(): boolean {
  return storageBlocked;
}

const ARRAYS = ["clients", "jobs", "candidates", "applications", "interviews", "placements", "tasks", "activities"] as const;

/** Reject damaged or foreign data instead of loading an arbitrary shape (same rule as the
 * job library). Deep validation would duplicate the types; the arrays and the version are
 * the invariants every view relies on. */
export function parseWorkspace(raw: unknown): Workspace {
  if (!raw || typeof raw !== "object") throw new Error("not an object");
  const data = raw as Record<string, unknown>;
  if (data.version !== WORKSPACE_VERSION) throw new Error("unsupported version");
  if (!data.settings || typeof data.settings !== "object") throw new Error("missing settings");
  for (const key of ARRAYS) {
    if (!Array.isArray(data[key])) throw new Error(`missing ${key}`);
    for (const item of data[key] as unknown[]) {
      if (!item || typeof item !== "object" || typeof (item as { id?: unknown }).id !== "string") throw new Error(`invalid ${key}`);
    }
  }
  const seededLocale = data.seededLocale === "sk" ? "sk" : "en";
  return { ...(data as unknown as Workspace), seededLocale };
}

function persist(ws: Workspace): void {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(ws));
    storageBlocked = false;
  } catch {
    storageBlocked = true;
  }
}

function listenToOtherTabs(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== WORKSPACE_KEY || !event.newValue) return;
    try {
      snapshot = parseWorkspace(JSON.parse(event.newValue));
      emit();
    } catch {
      /* another tab wrote something this version cannot read; keep what we have */
    }
  });
}

/** Load from localStorage, or seed the demo on a first visit. Idempotent. */
export function initWorkspace(locale: "en" | "sk"): void {
  if (snapshot) return;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(WORKSPACE_KEY);
  } catch {
    storageBlocked = true;
  }
  if (stored) {
    try {
      snapshot = parseWorkspace(JSON.parse(stored));
    } catch {
      snapshot = seedWorkspace(locale);
      persist(snapshot);
    }
  } else {
    snapshot = seedWorkspace(locale);
    persist(snapshot);
  }
  listenToOtherTabs();
  emit();
}

/** Every write: clone → mutate → stamp → persist → notify. The mutator sees a deep copy,
 * so it may assign freely; views only ever hold immutable snapshots. */
export function update(mutate: (draft: Workspace) => void): void {
  if (!snapshot) return;
  const draft = structuredClone(snapshot);
  mutate(draft);
  draft.updatedAt = new Date().toISOString();
  snapshot = draft;
  persist(draft);
  emit();
}

export function replaceWorkspace(next: Workspace): void {
  snapshot = { ...next, updatedAt: new Date().toISOString() };
  persist(snapshot);
  emit();
}

/** Test seam: forget everything, as if the page had never loaded. */
export function resetStoreForTests(): void {
  snapshot = null;
}
