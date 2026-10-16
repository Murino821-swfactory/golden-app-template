/**
 * client-store.ts — values only the browser knows (its address, its storage, what it can
 * record), read the React way: through `useSyncExternalStore`, so the server render and
 * the first client render agree and the real value arrives right after hydration — no
 * setState inside an effect (react-hooks/set-state-in-effect), no hydration warning.
 * Same pattern as `lib/listing-inquiry.ts`.
 */
import { useSyncExternalStore } from "react";

const never = () => () => {};

/** A browser-only primitive. Primitives only: the snapshot has to be stable between reads. */
export function useBrowserValue<T extends string | number | boolean | null>(read: () => T, server: T): T {
  return useSyncExternalStore(never, read, () => server);
}

export interface StoredValue<T> {
  read(): T;
  set(value: T): void;
  /** The hook: the stored value, re-rendering every subscriber on `set`. */
  use(): T;
}

/**
 * One value in localStorage with any number of React subscribers. `fallback` doubles as
 * the server snapshot, so for an array or object it must be one constant reference.
 */
export function createStoredValue<T>(key: string, fallback: T, parse: (raw: string) => T, serialize: (value: T) => string): StoredValue<T> {
  let cached: { value: T } | null = null;
  const listeners = new Set<() => void>();
  const read = (): T => {
    if (cached) return cached.value;
    let value = fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) value = parse(raw);
    } catch {
      /* storage blocked or malformed — the fallback stands */
    }
    cached = { value };
    return value;
  };
  const set = (value: T) => {
    cached = { value };
    try {
      window.localStorage.setItem(key, serialize(value));
    } catch {
      /* storage full or blocked — subscribers still see the value for this page */
    }
    for (const listener of listeners) listener();
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return {
    read,
    set,
    use: () => useSyncExternalStore(subscribe, read, () => fallback),
  };
}
