"use client";

import Link from "next/link";
import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Wordmark, type LogoProps } from "../brand/Wordmark";
import { FontSwitcher } from "../switchers/FontSwitcher";
import { LanguageSwitcher, type LanguageLink } from "../switchers/LanguageSwitcher";
import type { FontId } from "../theming/font-families";
import type { HeaderLabels } from "./labels";
import type { NavItem } from "./nav";

const ROW =
  "flex min-h-14 items-center border-b border-[var(--shared-rule)] text-left text-[15px] uppercase tracking-[0.12em] text-[var(--shared-ink)] transition-colors hover:text-[var(--shared-accent)]";

/**
 * The full-screen menu below 1024px. It exists for every variant, a prototype's included:
 * with no nav it still carries the font and the languages, which do not fit the bar.
 *
 * Portalled to `<body>` on purpose: the header carries a backdrop-filter, and an ancestor
 * with one becomes the containing block for `position: fixed` descendants. Rendered in
 * place, the panel sized itself to the header and the page showed straight through it.
 */
export function MenuPanel({
  id,
  logo,
  items,
  onContact,
  defaultFont,
  languages,
  labels,
  toggleRef,
  onClose,
}: {
  id: string;
  logo: LogoProps;
  items: readonly NavItem[];
  onContact?: () => void;
  defaultFont: FontId;
  languages: readonly LanguageLink[];
  labels: HeaderLabels;
  toggleRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const closeAndReturnFocus = () => {
    onClose();
    toggleRef.current?.focus();
  };

  // Escape closes, and the toggle takes focus back so keyboard users are not dropped at
  // the top of the document.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, toggleRef]);

  // The panel is `lg:hidden`, so at >=1024px it stops being visible — without this the
  // scroll lock would survive a rotation or resize with no way to undo it.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 64rem)");
    const onChange = () => mq.matches && onClose();
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [onClose]);

  // Lock the page behind the panel: a scroll-driven page would move underneath it.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const gutter = { paddingLeft: "var(--shared-gutter)", paddingRight: "var(--shared-gutter)" };

  return createPortal(
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={labels.menu}
      data-shared-ui-menu=""
      className="fixed inset-0 z-50 flex flex-col bg-[var(--shared-bg)] text-[var(--shared-ink)] lg:hidden"
    >
      <div className="flex items-center justify-between gap-3 py-4" style={gutter}>
        <Wordmark {...logo} />
        <button
          ref={closeRef}
          type="button"
          onClick={closeAndReturnFocus}
          aria-label={labels.closeMenu}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--shared-ink-muted)] transition-colors hover:text-[var(--shared-accent)]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden focusable="false">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto pt-4 pb-12" style={gutter}>
        {items.length > 0 && (
          <nav aria-label={labels.nav} className="flex flex-col" style={{ fontFamily: "var(--shared-font-mono)" }}>
            {items.map((item) =>
              item.action === "contact" ? (
                <button
                  key={item.label}
                  type="button"
                  className={ROW}
                  onClick={() => {
                    onClose();
                    onContact?.();
                  }}
                >
                  {item.label}
                </button>
              ) : (
                <Link key={item.label} href={item.href!} onClick={onClose} className={ROW}>
                  {item.label}
                </Link>
              )
            )}
          </nav>
        )}
        <FontSwitcher defaultFont={defaultFont} labels={labels} layout="row" />
        <LanguageSwitcher languages={languages} labels={labels} layout="list" onNavigate={onClose} />
      </div>
    </div>,
    document.body
  );
}
