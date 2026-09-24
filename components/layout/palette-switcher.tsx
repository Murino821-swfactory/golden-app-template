"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  COLOR_SCHEME_IDS,
  PALETTES,
  nextSchemeId,
  rolesFor,
  type ColorSchemeId,
} from "@/lib/color-schemes";
import { config } from "@/lib/prototype-config";

/**
 * "Change colour" — one button that steps to the next palette and wraps after the last
 * [founder decision 2026-09-24]. Fifteen swatches do not fit a 390px header, and a picker
 * asks the visitor for a decision they did not come to make; one step at a time is play.
 *
 * The palette a visitor is looking at lives in the DOM (`html[data-scheme]`) and in
 * localStorage — outside React, because the bootstrap script in app/shell.tsx sets it
 * before React exists. `useSyncExternalStore` is the primitive for reading exactly that
 * kind of state, and it keeps `window` out of the render path during static export via
 * `getServerSnapshot`. The alternative (read it in an effect, then setState) would render
 * one frame with the wrong palette named.
 *
 * The choice is per-browser and deliberately does NOT travel: `prototype.config.json`
 * still decides what every new visitor sees first, so the customer's wizard pick remains
 * the app's identity rather than whatever the last person clicked.
 */

const STORAGE_KEY = "scheme";
const CHANGE_EVENT = "scheme-change";

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
  const t = useTranslations("common");
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const roles = rolesFor(active);

  return (
    <button
      type="button"
      onClick={() => selectScheme(nextSchemeId(active))}
      // Starts with the visible label (WCAG 2.5.3, label in name), then says what a sighted
      // visitor learns from the page itself: which palette, and where in the cycle it is.
      aria-label={t("changeColourLabel", {
        name: PALETTES[active].name,
        position: COLOR_SCHEME_IDS.indexOf(active) + 1,
        total: COLOR_SCHEME_IDS.length,
      })}
      className="flex h-11 shrink-0 items-center gap-2 rounded-md px-2 text-xs font-medium text-foreground transition-colors hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {/* Both halves of the pair, painted by the same pure rule the page uses — so the
          swatch can never advertise a colour the scheme does not actually produce. */}
      <span
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 rounded-full border border-foreground/60"
        style={{
          background: `linear-gradient(90deg, ${roles.background} 50%, ${roles.primary} 50%)`,
        }}
      />
      <span className="whitespace-nowrap">{t("changeColour")}</span>
    </button>
  );
}
