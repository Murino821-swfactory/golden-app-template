"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState, type ReactNode } from "react";
import type { HeaderLabels } from "../header/labels";
import { useDismiss } from "../header/use-dismiss";

/**
 * The user, as the host sees it. The package never touches auth: who is signed in and how
 * to sign out arrive as props. A shared component that reached for Firebase itself would
 * tie the sign-in of tokenwise.sk to that of apps.tokenwise.sk, which the origin split
 * (2026-09-21) exists to keep apart.
 */
export interface HeaderUser {
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export type UserMenuItem =
  | {
      label: string;
      href: string;
      /** A plain `<a>`, not next/link: for paths outside the host's router (/demo/golden). */
      native?: boolean;
      /** Opens a new tab with `rel="noopener noreferrer"` — always for another origin. */
      newTab?: boolean;
      icon?: ReactNode;
    }
  | { label: string; onSelect: () => void; icon?: ReactNode };

const ITEM_BASE =
  "flex min-h-11 w-full items-center gap-2 px-3 text-left text-[13px] transition-colors hover:text-[var(--shared-accent)]";
const ITEM = `${ITEM_BASE} text-[var(--shared-ink)]`;

export function UserMenu({
  user,
  signInHref,
  items,
  onSignOut,
  labels,
}: {
  user: HeaderUser | null | "loading";
  signInHref: string;
  items: readonly UserMenuItem[];
  onSignOut: () => void | Promise<void>;
  labels: Pick<HeaderLabels, "signIn" | "signOut" | "account">;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  if (user === "loading") {
    return (
      <div className="flex h-11 w-11 items-center justify-center" aria-hidden data-shared-control="user">
        <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--shared-ink)]/10" />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href={signInHref}
        // On a phone the visible label is gone, and this is the only accessible name left.
        aria-label={labels.signIn}
        data-shared-control="user"
        className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded px-2 text-[12px] tracking-[0.05em] text-[var(--shared-ink-muted)] transition-colors hover:text-[var(--shared-accent)]"
        style={{ fontFamily: "var(--shared-font-mono)" }}
      >
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
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="hidden sm:inline">{labels.signIn}</span>
      </Link>
    );
  }

  const initial = (user.displayName?.[0] || user.email?.[0] || "U").toUpperCase();

  return (
    <div ref={ref} className="relative" data-shared-control="user">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={labels.account}
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)]"
      >
        {user.photoURL ? (
          <Image src={user.photoURL} alt="" width={32} height={32} className="rounded-full" unoptimized />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--shared-accent)] text-xs font-bold text-[var(--shared-bg)]">
            {initial}
          </span>
        )}
      </button>

      {/* A disclosure of plain links and buttons, not an ARIA `menu`: role="menu" promises
          arrow-key navigation this list does not implement. */}
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] rounded-lg border border-[var(--shared-rule)] bg-[var(--shared-bg)] py-1 shadow-lg"
        >
          <div className="border-b border-[var(--shared-rule)] px-3 py-2">
            <p className="truncate text-[13px] font-medium text-[var(--shared-ink)]">
              {user.displayName || user.email}
            </p>
            {user.displayName && user.email && (
              <p className="truncate text-[11px] text-[var(--shared-ink-muted)]">{user.email}</p>
            )}
          </div>
          {items.map((item) => {
            if ("onSelect" in item) {
              return (
                <button
                  key={item.label}
                  type="button"
                 
                  className={ITEM}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            }
            const tab = item.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
            return item.native || item.newTab ? (
              <a key={item.label} href={item.href} className={ITEM} onClick={close} {...tab}>
                {item.icon}
                {item.label}
              </a>
            ) : (
              <Link key={item.label} href={item.href} className={ITEM} onClick={close}>
                {item.icon}
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
           
            className={`${ITEM_BASE} text-[var(--shared-ink-muted)]`}
            onClick={async () => {
              setOpen(false);
              await onSignOut();
            }}
          >
            {labels.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
