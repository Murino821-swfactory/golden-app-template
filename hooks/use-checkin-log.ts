"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  STORAGE_KEY,
  parseLog,
  setNote as setNoteIn,
  todayKey,
  toggle as toggleIn,
  type CheckinLog,
  type DayKey,
  type PillarId,
} from "@/lib/checkin-engine";

/**
 * The check-in log, persisted in localStorage (OTH-84 asks for local storage, not an
 * account), read through `useSyncExternalStore`. The page is a static export, so the server
 * snapshot is "not read yet": `today` is null there and the page renders a skeleton instead
 * of guessing this visitor's log or date.
 *
 * localStorage throws outright in some privacy modes; the log then lives in memory for the
 * visit and `persistent` is false so the page can say so.
 */

const listeners = new Set<() => void>();
const EMPTY: CheckinLog = {};

let memory: string | null = null;
let blocked = false;
let cached: { raw: string | null; log: CheckinLog } | null = null;

function readRaw(): string | null {
  if (blocked) return memory;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    blocked = true;
    return memory;
  }
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && listener();
  // Coming back to the tab tomorrow must move "today" too.
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

/** Same raw string → same object, as useSyncExternalStore requires. */
function getLog(): CheckinLog {
  const raw = readRaw();
  if (!cached || cached.raw !== raw) cached = { raw, log: parseLog(raw) };
  return cached.log;
}

function write(log: CheckinLog) {
  const raw = JSON.stringify(log);
  memory = raw;
  if (!blocked) {
    try {
      window.localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      blocked = true;
    }
  }
  emit();
}

const getToday = () => todayKey();
const getPersistent = () => !blocked;
const serverLog = () => EMPTY;
const serverToday = () => null;
const serverPersistent = () => true;

export function useCheckinLog() {
  const log = useSyncExternalStore(subscribe, getLog, serverLog);
  const today: DayKey | null = useSyncExternalStore(subscribe, getToday, serverToday);
  const persistent = useSyncExternalStore(subscribe, getPersistent, serverPersistent);

  const toggle = useCallback((day: DayKey, pillar: PillarId) => write(toggleIn(getLog(), day, pillar)), []);
  const setNote = useCallback((day: DayKey, note: string) => write(setNoteIn(getLog(), day, note)), []);

  return { log, today, ready: today !== null, persistent, toggle, setNote };
}
