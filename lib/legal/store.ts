"use client";

import { useCallback, useSyncExternalStore } from "react";
import { todayIso } from "./dates";
import { seedWorkspace } from "./seed";
import type { Workspace, WorkspaceKind } from "./types";

/**
 * Where the workspace lives in the demo: this browser profile, under one localStorage key.
 *
 * A production system keeps it on a server with per-firm access rules (spec §7); the demo
 * keeps it here so a presentation never depends on a network, a quota or a second user. The
 * settings page says so, offers a JSON export and can reset the seed. The store is a tiny
 * external store so every page and card reads the same object and re-renders on any write.
 */
export const STORAGE_KEY = "law-expert.workspace.v1";

type Listener = () => void;

let current: Workspace | null = null;
let loaded = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn());
}

function read(): Workspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Workspace;
    return parsed && parsed.version === 1 && Array.isArray(parsed.matters) ? parsed : null;
  } catch {
    return null;
  }
}

function write(ws: Workspace) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
  } catch {
    // Private mode or a full quota: the page keeps working from memory for this visit.
  }
}

/** The workspace, seeded on first use. Null only on the server, where nothing renders yet. */
export function getWorkspace(): Workspace | null {
  if (typeof window === "undefined") return null;
  if (!loaded) {
    current = read();
    if (!current) {
      current = seedWorkspace("firm", todayIso());
      write(current);
    }
    loaded = true;
  }
  return current;
}

export function updateWorkspace(mutate: (ws: Workspace) => Workspace): Workspace {
  const base = getWorkspace();
  if (!base) throw new Error("workspace is only available in the browser");
  current = mutate(base);
  write(current);
  emit();
  return current;
}

export function resetWorkspace(kind: WorkspaceKind): Workspace {
  current = seedWorkspace(kind, todayIso());
  loaded = true;
  write(current);
  emit();
  return current;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** For tests and the harness: start from a known workspace without touching storage. */
export function installWorkspace(ws: Workspace): void {
  current = ws;
  loaded = true;
  emit();
}

const serverSnapshot = () => null;

export function useWorkspace(): { ws: Workspace | null; update: (mutate: (ws: Workspace) => Workspace) => void; reset: (kind: WorkspaceKind) => void } {
  const ws = useSyncExternalStore(subscribe, getWorkspace, serverSnapshot);
  const update = useCallback((mutate: (ws: Workspace) => Workspace) => {
    updateWorkspace(mutate);
  }, []);
  const reset = useCallback((kind: WorkspaceKind) => {
    resetWorkspace(kind);
  }, []);
  return { ws, update, reset };
}

export function newId(prefix: string): string {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

/** The next free file number of the year, e.g. 2026/0051. */
export function nextMatterNumber(ws: Workspace, year: number): string {
  const prefix = `${year}/`;
  const max = ws.matters
    .filter((m) => m.number.startsWith(prefix))
    .reduce((n, m) => Math.max(n, Number(m.number.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function nextInvoiceNumber(ws: Workspace, year: number): string {
  const prefix = `${year}/`;
  const max = ws.invoices
    .filter((i) => i.number.startsWith(prefix))
    .reduce((n, i) => Math.max(n, Number(i.number.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}
