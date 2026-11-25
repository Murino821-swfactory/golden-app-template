"use client";

import { nextAppearance, type Appearance } from "../theming/color-schemes";
import { appearanceStore } from "../theming/stores";
import { format, type HeaderLabels } from "../header/labels";

/**
 * Dark or light — one button that turns the page over, beside "Change colour" and the font
 * [founder decision 2026-11-25: the dark-only rule is dropped, the visitor chooses].
 *
 * `inline` is the header bar: an icon and nothing else, like its neighbours — a moon while
 * the page is dark, a sun while it is light, in the 1.5px line of the cart and the figure.
 * The icon is the side on screen, as "Aa" is the face on screen; the words are in
 * `aria-label`. `row` is the menu below 1024px: "Appearance: ☾ Dark", full width. The bar has
 * no room for a fifth control on a phone — the logo needs 122px and four controls leave it
 * 128px at 360px — so the switch sits where the font does.
 */

/** A crescent: the disc's large arc, then the bite's small one back. */
const MOON = "M16.9 11.9A7.2 7.2 0 1 1 8.1 3.1 6.6 6.6 0 0 0 16.9 11.9Z";
/** Eight rays around the disc drawn below. */
const RAYS =
  "M10 2.25V4M10 16v1.75M2.25 10H4M16 10h1.75M4.52 4.52l1.24 1.24M14.24 14.24l1.24 1.24M4.52 15.48l1.24-1.24M14.24 5.76l1.24-1.24";

function AppearanceIcon({ appearance }: { appearance: Appearance }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      data-appearance-icon={appearance}
    >
      {appearance === "dark" ? (
        <path d={MOON} />
      ) : (
        <>
          <circle cx="10" cy="10" r="3.5" />
          <path d={RAYS} />
        </>
      )}
    </svg>
  );
}

export function AppearanceSwitcher({
  defaultAppearance,
  labels,
  layout = "inline",
}: {
  defaultAppearance: Appearance;
  labels: Pick<
    HeaderLabels,
    "appearance" | "changeAppearanceLabel" | "appearanceDark" | "appearanceLight"
  >;
  layout?: "inline" | "row";
}) {
  const active = appearanceStore.use(defaultAppearance);
  const name = active === "dark" ? labels.appearanceDark : labels.appearanceLight;
  const ariaLabel = format(labels.changeAppearanceLabel, { name });
  const onClick = () => appearanceStore.select(nextAppearance(active));

  if (layout === "row") {
    return (
      <button
        type="button"
        data-shared-control="appearance"
        onClick={onClick}
        aria-label={ariaLabel}
        className="flex min-h-14 w-full items-center justify-between border-b border-[var(--shared-rule)] text-left text-[15px] uppercase tracking-[0.12em] text-[var(--shared-ink)] transition-colors hover:text-[var(--shared-accent)]"
        style={{ fontFamily: "var(--shared-font-mono)" }}
      >
        <span>{labels.appearance}</span>
        <span className="flex items-center gap-2 normal-case tracking-normal">
          <AppearanceIcon appearance={active} />
          {name}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-shared-control="appearance"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--shared-ink)] transition-colors hover:text-[var(--shared-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)]"
    >
      <AppearanceIcon appearance={active} />
    </button>
  );
}
