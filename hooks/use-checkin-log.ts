"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  STORAGE_KEY,
  parseLog,
  parseSyncMeta,
  reconcile,
  setNote as setNoteIn,
  todayKey,
  toggle as toggleIn,
  type CheckinLog,
  type DayKey,
  type PillarId,
  type SyncMeta,
} from "@/lib/checkin-engine";
import { CloudDenied, pullCloud, pushCloud } from "@/lib/checkin-cloud";
import { useAuth } from "./use-auth";

/**
 * The check-in log, persisted in localStorage (OTH-84 asks for local storage, not an
 * account), read through `useSyncExternalStore`. The page is a static export, so the server
 * snapshot is "not read yet": `today` is null there and the page renders a skeleton instead
 * of guessing this visitor's log or date.
 *
 * Since 2026-10-13 a signed-in visitor's log also lives in their Firestore sandbox, so the
 * same streak shows on the phone and the laptop — and survives a cleared browser. The device
 * copy stays the working copy: every tap lands here first, the cloud follows a moment later,
 * and `lib/checkin-engine.ts`'s `reconcile` decides what to do when the two disagree.
 *
 * Everything here is one module-level store (log, sync meta, cloud state): several
 * components may mount the check-in, and one device talks to the cloud once, not once per
 * component. React only ever subscribes.
 *
 * localStorage throws outright in some privacy modes; the log then lives in memory for the
 * visit and `persistent` is false so the page can say so.
 */

export const SYNC_META_KEY = "unbroken:checkins:sync:v1";

export type CloudState = "off" | "syncing" | "synced" | "unavailable" | "error";

const PUSH_DELAY_MS = 1500;
const PULL_EVERY_MS = 60_000;

const listeners = new Set<() => void>();
const EMPTY: CheckinLog = {};

let memory: string | null = null;
let memoryMeta: string | null = null;
let blocked = false;
let cached: { raw: string | null; log: CheckinLog } | null = null;

function readRaw(key: string, fallback: string | null): string | null {
  if (blocked) return fallback;
  try {
    return window.localStorage.getItem(key);
  } catch {
    blocked = true;
    return fallback;
  }
}

function writeRaw(key: string, raw: string) {
  if (blocked) return;
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    blocked = true;
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
  const dayTimer = window.setInterval(listener, 30_000);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
    window.clearInterval(dayTimer);
  };
}

/** Same raw string → same object, as useSyncExternalStore requires. */
function getLog(): CheckinLog {
  const raw = readRaw(STORAGE_KEY, memory);
  if (!cached || cached.raw !== raw) cached = { raw, log: parseLog(raw) };
  return cached.log;
}

function getMeta(): SyncMeta {
  return parseSyncMeta(readRaw(SYNC_META_KEY, memoryMeta));
}

function setMeta(meta: SyncMeta) {
  const raw = JSON.stringify(meta);
  memoryMeta = raw;
  writeRaw(SYNC_META_KEY, raw);
}

// ── Cloud ─────────────────────────────────────────────────────────────────────────────

let cloudState: CloudState = "off";
/** The account this device is currently syncing for; null while signed out. */
let activeUid: string | null = null;
let denied = false;
let lastPull = 0;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;
let uploading: number | null = null;
let downloading: number | null = null;

function setCloud(state: CloudState) {
  cloudState = state;
  emit();
}

function fail(err: unknown, what: string) {
  if (err instanceof CloudDenied) {
    denied = true;
    setCloud("unavailable");
  } else {
    console.warn(`[checkin] cloud ${what} failed:`, err);
    setCloud("error");
  }
}

async function push(uid: string) {
  const session = generation;
  if (denied || activeUid !== uid || uploading === session || downloading === session || getMeta().uid !== uid) return;
  uploading = session;
  setCloud("syncing");
  try {
    const snapshot = getLog();
    const stamp = await pushCloud(uid, snapshot);
    if (activeUid !== uid || generation !== session) return;
    // A tap during the upload keeps the device dirty; its own push is already scheduled.
    const dirty = getLog() !== snapshot;
    setMeta({ uid, stamp, dirty });
    setCloud(dirty ? "syncing" : "synced");
    if (dirty) schedulePush(uid);
  } catch (err) {
    if (activeUid === uid && generation === session) fail(err, "push");
  } finally {
    if (uploading === session) uploading = null;
  }
}

/** Every local edit reaches the cloud a moment later; a burst of taps is one write. */
function schedulePush(uid: string) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void push(uid), PUSH_DELAY_MS);
}

async function pull(uid: string) {
  const session = generation;
  if (denied || activeUid !== uid || uploading === session || downloading === session) return;
  downloading = session;
  setCloud("syncing");
  try {
    const copy = await pullCloud(uid);
    if (activeUid !== uid || generation !== session) return;
    lastPull = Date.now();
    const result = reconcile(getLog(), getMeta(), copy, uid);
    // Retain the pending-write marker until the server acknowledges the upload.
    adopt(result.log, { ...result.meta, dirty: result.push });
    downloading = null;
    if (result.push) await push(uid);
    else setCloud("synced");
  } catch (err) {
    if (activeUid === uid && generation === session) fail(err, "pull");
  } finally {
    if (downloading === session) downloading = null;
  }
}

/** A local edit: the device copy changes and the cloud now lags behind it. */
function write(log: CheckinLog) {
  const raw = JSON.stringify(log);
  memory = raw;
  writeRaw(STORAGE_KEY, raw);
  const meta = getMeta();
  if (!meta.dirty) setMeta({ ...meta, dirty: true });
  if (activeUid && meta.uid === activeUid) {
    schedulePush(activeUid);
  }
  emit();
}

/** The cloud's verdict: the device copy is replaced without becoming "dirty". */
function adopt(log: CheckinLog, meta: SyncMeta) {
  const raw = JSON.stringify(log);
  memory = raw;
  writeRaw(STORAGE_KEY, raw);
  setMeta(meta);
  emit();
}

const getToday = () => todayKey();
const getPersistent = () => !blocked;
const getCloud = () => cloudState;
const serverLog = () => EMPTY;
const serverToday = () => null;
const serverPersistent = () => true;
const serverCloud: () => CloudState = () => "off";

export function useCheckinLog() {
  const log = useSyncExternalStore(subscribe, getLog, serverLog);
  const today: DayKey | null = useSyncExternalStore(subscribe, getToday, serverToday);
  const persistent = useSyncExternalStore(subscribe, getPersistent, serverPersistent);
  const cloud = useSyncExternalStore(subscribe, getCloud, serverCloud);
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  // Sign-in (or a new account on this device): agree with the cloud once, then again
  // whenever the tab comes back after a while — that is how another device's taps arrive.
  useEffect(() => {
    if (!uid) return;
    activeUid = uid;
    generation++;
    denied = false;
    void pull(uid);
    const onVisible = () => {
      if (document.visibilityState === "hidden") flush();
      else if (getMeta().dirty || Date.now() - lastPull > PULL_EVERY_MS) void pull(uid);
    };
    const flush = () => {
      if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
      if (getMeta().dirty) void push(uid);
    };
    const reconnect = () => void pull(uid);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", flush);
    window.addEventListener("online", reconnect);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("online", reconnect);
      if (activeUid === uid) {
        activeUid = null;
        generation++;
        if (pushTimer) clearTimeout(pushTimer);
        setCloud("off");
      }
    };
  }, [uid]);

  const toggle = useCallback((day: DayKey, pillar: PillarId) => write(toggleIn(getLog(), day, pillar)), []);
  const setNote = useCallback((day: DayKey, note: string) => write(setNoteIn(getLog(), day, note)), []);

  return { log, today, ready: today !== null, persistent, cloud, signedIn: uid !== null, toggle, setNote };
}
