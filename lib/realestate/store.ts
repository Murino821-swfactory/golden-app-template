/**
 * store.ts — the workspace in memory, mirrored to localStorage.
 *
 * A static export has no server, so one agency's desk lives in the visitor's browser under
 * a versioned key. The store is a tiny external store for React's `useSyncExternalStore`:
 * `null` until `initWorkspace` has run on the client (server render and first client render
 * agree on that, so there is no hydration mismatch), then a frozen snapshot replaced
 * wholesale on every write. Another tab's write arrives through the `storage` event.
 *
 * This module is the seam for a later per-account cloud desk: every view reads through
 * `useWorkspace`, every write goes through `update`.
 */
import { WORKSPACE_VERSION, type Workspace, type WorkspaceLocale } from "./model";
import { seedWorkspace } from "./seed";

export const WORKSPACE_KEY = "realitny-makler:workspace:v1";

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

const ARRAYS = ["agents", "properties", "contacts", "demands", "viewings", "deals", "leases", "documents", "tasks", "activities"] as const;

/** Reject damaged or foreign data instead of loading an arbitrary shape. The arrays, the
 * version and the settings are the invariants every view relies on. */
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
  const seededLocale: WorkspaceLocale = data.seededLocale === "sk" ? "sk" : "en";
  const seededAt = typeof data.seededAt === "string" ? data.seededAt : String(data.updatedAt ?? "");
  return { ...(data as unknown as Workspace), seededLocale, seededAt };
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
export function initWorkspace(locale: WorkspaceLocale): void {
  if (snapshot) return;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(WORKSPACE_KEY);
  } catch {
    storageBlocked = true;
  }
  if (stored) {
    try {
      const parsed = parseWorkspace(JSON.parse(stored));
      // An untouched demo follows the language on screen: switching to /sk before the first
      // change reseeds in Slovak. The moment anything was edited, the data is the visitor's.
      const untouched = parsed.updatedAt === parsed.seededAt;
      snapshot = untouched && parsed.seededLocale !== locale ? seedWorkspace(locale) : parsed;
      if (snapshot !== parsed) persist(snapshot);
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
