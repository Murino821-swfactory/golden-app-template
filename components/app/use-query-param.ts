"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * One URL query parameter as state, for a static export. `useSearchParams` would demand a
 * Suspense boundary on every page; this reads `window.location` as an external store — null
 * on the server, the live value in the browser — and writes back with `replaceState`.
 */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

const serverSnapshot = () => null;

export function useQueryParam(name: string): [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(subscribe, () => new URLSearchParams(window.location.search).get(name), serverSnapshot);
  const set = useCallback(
    (next: string | null) => {
      const url = new URL(window.location.href);
      if (next === null) url.searchParams.delete(name);
      else url.searchParams.set(name, next);
      window.history.replaceState(null, "", url);
      emit();
    },
    [name]
  );
  return [value, set];
}
