"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";

/**
 * The sign-in control, ported from tokenwise.sk's `user-menu.tsx` so a prototype's header
 * reads as part of the same family as the site that sold it.
 *
 * Signed out it is an icon with a label that collapses below `sm`, which is why the
 * `aria-label` is not optional: on a phone the visible text is gone and the label is the
 * only accessible name left.
 */
export function UserMenu() {
  const t = useTranslations("common");
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (loading) {
    return (
      <div className="flex h-11 w-11 items-center justify-center" aria-hidden>
        <div className="h-5 w-5 animate-pulse rounded-full bg-foreground/10" />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label={t("signIn")}
        className="flex min-h-11 items-center gap-2 rounded px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
        <span className="hidden sm:inline">{t("signIn")}</span>
      </Link>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={t("account")}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-foreground/5"
      >
        {user.photoURL ? (
          <Image
            src={user.photoURL}
            alt=""
            width={32}
            height={32}
            className="rounded-full"
            unoptimized
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium text-card-foreground">
              {user.displayName || user.email}
            </p>
            {user.displayName && user.email && (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center px-3 text-sm text-card-foreground transition-colors hover:bg-foreground/5"
          >
            {t("dashboard")}
          </Link>
          <SignOutItem onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

function SignOutItem({ onDone }: { onDone: () => void }) {
  const t = useTranslations("common");
  const { signOut } = useAuth();

  return (
    <button
      type="button"
      role="menuitem"
      onClick={async () => {
        await signOut();
        onDone();
      }}
      className="flex min-h-11 w-full items-center px-3 text-left text-sm text-card-foreground transition-colors hover:bg-foreground/5"
    >
      {t("signOut")}
    </button>
  );
}
