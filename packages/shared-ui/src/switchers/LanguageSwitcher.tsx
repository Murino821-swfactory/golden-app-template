"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { HeaderLabels } from "../header/labels";
import { useDismiss } from "../header/use-dismiss";

export interface LanguageLink {
  /** BCP 47 code, shown upper-case in the bar. */
  code: string;
  /** The endonym — "Slovenčina", not "Slovak": a visitor who landed on the wrong language
   * has to be able to read the way out of it. */
  name: string;
  href: string;
  current: boolean;
}

/**
 * Language choice as LINKS, never a callback: changing language changes the document, so
 * it is navigation, and a crawler has to be able to follow it (golden rule 3). Fewer than
 * two languages renders nothing.
 *
 * `dropdown` is the bar (≥640px): `EN ▾` opens the list. `list` is the mobile menu panel.
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
          ? "flex min-h-14 items-center border-b border-[var(--shared-rule)] text-[15px] transition-colors hover:text-[var(--shared-accent)] " +
            (l.current ? "text-[var(--shared-accent)]" : "text-[var(--shared-ink)]")
          : "flex min-h-11 items-center px-3 text-sm transition-colors hover:text-[var(--shared-accent)] " +
            (l.current ? "text-[var(--shared-accent)]" : "text-[var(--shared-ink)]")
      }
    >
      {l.name}
    </Link>
  ));

  if (layout === "list") {
    return (
      <nav aria-label={labels.language} className="flex flex-col" data-shared-control="language">
        <p
          className="pt-6 pb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--shared-ink-muted)]"
          style={{ fontFamily: "var(--shared-font-mono)" }}
        >
          {labels.language}
        </p>
        {links}
      </nav>
    );
  }

  return (
    <div ref={ref} className="relative" data-shared-control="language">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`${labels.language}: ${current.name}`}
        className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium uppercase text-[var(--shared-ink)] transition-colors hover:text-[var(--shared-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)]"
      >
        {current.code}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden focusable="false">
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      {/* Always in the markup, `hidden` while closed: the links stay in the exported HTML
          for a crawler, which never clicks the toggle. */}
      <nav
        aria-label={labels.language}
        hidden={!open}
        className="absolute right-0 top-full z-50 mt-2 min-w-[11rem] rounded-lg border border-[var(--shared-rule)] bg-[var(--shared-bg)] py-1 shadow-lg"
      >
        {links}
      </nav>
    </div>
  );
}
