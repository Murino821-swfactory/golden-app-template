"use client";

import { useSyncExternalStore } from "react";
import { COLOR_SCHEME_IDS, rolesFor, type ColorSchemeId } from "@/lib/color-schemes";
import { config } from "@/lib/prototype-config";

/**
 * The palette a visitor is looking at lives in the DOM (`html[data-scheme]`) and in
 * localStorage — outside React, because the bootstrap script in app/layout.tsx sets it
 * before React exists. `useSyncExternalStore` is the primitive for reading exactly that
 * kind of state, and it keeps `window` out of the render path during static export via
 * `getServerSnapshot`. The alternative (read it in an effect, then setState) would render
 * one frame with the wrong swatch highlighted.
 *
 * The choice is per-browser and deliberately does NOT travel: `prototype.config.json`
 * still decides what every new visitor sees first, so the customer's wizard pick remains
 * the app's identity rather than whatever the last person clicked.
 */

const STORAGE_KEY = "scheme";
const CHANGE_EVENT = "scheme-change";

const LABELS: Record<ColorSchemeId, string> = {
  red: "Red",
  blue: "Blue",
  yellow: "Yellow",
  green: "Green",
};

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(CHANGE_EVENT, onStoreChange);
}

function getSnapshot(): ColorSchemeId {
  const current = document.documentElement.dataset.scheme;
  return (COLOR_SCHEME_IDS as readonly string[]).includes(current ?? "")
    ? (current as ColorSchemeId)
    : config.theme.colorScheme;
}

function getServerSnapshot(): ColorSchemeId {
  return config.theme.colorScheme;
}

function selectScheme(id: ColorSchemeId): void {
  document.documentElement.dataset.scheme = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode: the palette still applies for this page view, it just will not persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function PaletteSwitcher() {
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      role="radiogroup"
      aria-label="Colour scheme"
      className="flex items-center gap-1"
    >
      {COLOR_SCHEME_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={active === id}
          aria-label={LABELS[id]}
          onClick={() => selectScheme(id)}
          // A 44px hit area around a 14px swatch: the target meets the mobile-first
          // minimum without the swatch itself growing into a button.
          className="flex h-11 w-7 items-center justify-center sm:w-8"
        >
          {/* The swatch paints itself with that palette's own accent, derived by the same
              pure rule the page uses — so a swatch can never advertise a colour the
              scheme does not actually produce. */}
          <span
            aria-hidden
            className={
              "h-3.5 w-3.5 rounded-full border transition-[box-shadow,border-color] " +
              (active === id
                ? "border-foreground ring-2 ring-foreground/60"
                : "border-border hover:border-foreground/50")
            }
            style={{ background: rolesFor(id).primary }}
          />
        </button>
      ))}
    </div>
  );
}
