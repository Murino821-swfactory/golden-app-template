"use client";

import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";
import type { HeaderLabels } from "../header/labels";
import { useDismiss } from "../header/use-dismiss";

export interface LanguageLink {
  /** BCP 47 code, shown upper-case beside the name in the popup. */
  code: string;
  /** The endonym — "Slovenčina", not "Slovak": a visitor who landed on the wrong language
   * has to be able to read the way out of it. */
  name: string;
  href: string;
  current: boolean;
}

const MONO = { fontFamily: "var(--shared-font-mono)" };

/** The mark on the language on screen: for the eye what `aria-current` is for a reader. */
function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className="shrink-0"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Language choice as LINKS, never a callback: changing language changes the document, so
 * it is navigation, and a crawler has to be able to follow it (golden rule 3). Fewer than
 * two languages renders nothing.
 *
 * `dropdown` is the bar (≥1024px): a globe, an icon among the header's icons like the colour
 * wheel and "Aa" [founder decision 2026-11-25 — it read `EN ▾` before, the one control set in
 * words], and a click opens the popup with the languages to choose from. Colour and font step
 * on a click because every step is worth seeing; a language is picked, so it gets a list. The
 * language on screen is in the button's `aria-label` and marked in the popup.
 * `list` is the mobile menu panel.
 */
export function LanguageSwitcher({
  languages,
  labels,
  layout = "dropdown",
  onNavigate,
}: {
  languages: readonly LanguageLink[];
  labels: Pick<HeaderLabels, "language">;
  layout?: "dropdown" | "list";
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  if (languages.length < 2) return null;
  const current = languages.find((l) => l.current) ?? languages[0]!;

  const links = languages.map((l) => (
    <Link
      key={l.code}
      href={l.href}
      hrefLang={l.code}
      lang={l.code}
      aria-current={l.current ? "page" : undefined}
      onClick={() => {
        setOpen(false);
        onNavigate?.();
      }}
      className={
        layout === "list"
          ? "flex min-h-14 items-center justify-between gap-3 border-b border-[var(--shared-rule)] text-[15px] transition-colors hover:text-[var(--shared-accent)] " +
            (l.current ? "text-[var(--shared-accent)]" : "text-[var(--shared-ink)]")
          : "flex min-h-11 items-center gap-3 px-4 text-sm transition-colors hover:text-[var(--shared-accent)] " +
            (l.current ? "text-[var(--shared-accent)]" : "text-[var(--shared-ink)]")
      }
    >
      <span className={layout === "list" ? undefined : "flex-1"}>{l.name}</span>
      {l.current && <Check />}
      {layout === "dropdown" && (
        // For the eye only: the name already says which language this is.
        <span
          aria-hidden
          className="w-6 text-right text-[11px] uppercase tracking-[0.08em] text-[var(--shared-ink-muted)]"
          style={MONO}
        >
          {l.code}
        </span>
      )}
    </Link>
  ));

  if (layout === "list") {
    return (
      <nav aria-label={labels.language} className="flex flex-col" data-shared-control="language">
        <p
          className="pt-6 pb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--shared-ink-muted)]"
          style={MONO}
        >
          {labels.language}
        </p>
        {links}
      </nav>
    );
  }

  return (
    <div
      ref={ref}
      className="relative"
      data-shared-control="language"
      // Escape from inside the popup: the focused link is about to be hidden, so the focus
      // goes back to the icon instead of falling to the top of the document.
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) buttonRef.current?.focus();
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={popupId}
        // No visible text, so this is the control's only name — and the only place the bar
        // says which language is on screen.
        aria-label={`${labels.language}: ${current.name}`}
        className={
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors hover:text-[var(--shared-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)] " +
          (open ? "text-[var(--shared-accent)]" : "text-[var(--shared-ink-muted)]")
        }
      >
        {/* A line icon at the weight of the cart and the figure beside it. */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          focusable="false"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      </button>
      {/* Always in the markup, `hidden` while closed: the links stay in the exported HTML
          for a crawler, which never clicks the icon. Its height is capped to the window, so
          a long list scrolls inside the popup and never moves the page. */}
      <nav
        id={popupId}
        aria-label={labels.language}
        hidden={!open}
        className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-5rem)] min-w-[13rem] overflow-y-auto rounded-lg border border-[var(--shared-rule)] bg-[var(--shared-bg)] pb-1 shadow-lg transition-[opacity,translate] duration-150 starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none"
      >
        <p
          className="border-b border-[var(--shared-rule)] px-4 pt-3 pb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--shared-ink-muted)]"
          style={MONO}
        >
          {labels.language}
        </p>
        {links}
      </nav>
    </div>
  );
}
