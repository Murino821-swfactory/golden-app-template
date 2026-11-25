/**
 * The visitor's palette, font, appearance and button look live in the DOM
 * (`html[data-scheme]`, `html[data-font]`, `html[data-appearance]`, `html[data-button]`) and
 * in localStorage — outside React, because
 * `ThemeBootstrap` sets them before React exists. `useSyncExternalStore` is the primitive for reading exactly that kind of state,
 * and `getServerSnapshot` keeps `window` out of the render path during static export.
 * Reading it in an effect and then setting state would render one frame with the wrong
 * palette or font named.
 *
 * The choice is per-browser and per-origin, and deliberately does not travel: the host
 * decides what a first-time visitor sees (its `data-*` default on `<html>`).
 */
import { useSyncExternalStore } from "react";

export interface AttributeStore<T extends string> {
  /** localStorage key, also read by the bootstrap script. */
  storageKey: string;
  use(serverDefault: T): T;
  select(value: T): void;
}

export function createAttributeStore<T extends string>(opts: {
  /** `dataset` key on `<html>`, e.g. `scheme` for `data-scheme`. */
  attribute: string;
  storageKey: string;
  event: string;
  ids: readonly T[];
  /** What else the document needs when a value is chosen — the appearance also moves
   * shadcn's `.dark` class. The bootstrap script does the same for a returning visitor. */
  apply?: (value: T) => void;
}): AttributeStore<T> {
  const { attribute, storageKey, event, ids, apply } = opts;

  const subscribe = (onChange: () => void) => {
    window.addEventListener(event, onChange);
    return () => window.removeEventListener(event, onChange);
  };

  return {
    storageKey,
    use(serverDefault: T): T {
      return useSyncExternalStore(
        subscribe,
        () => {
          const current = document.documentElement.dataset[attribute];
          return (ids as readonly string[]).includes(current ?? "")
            ? (current as T)
            : serverDefault;
        },
        () => serverDefault
      );
    },
    select(value: T): void {
      document.documentElement.dataset[attribute] = value;
      apply?.(value);
      try {
        localStorage.setItem(storageKey, value);
      } catch {
        // Private mode: the choice still applies to this page view, it just will not persist.
      }
      window.dispatchEvent(new Event(event));
    },
  };
}
