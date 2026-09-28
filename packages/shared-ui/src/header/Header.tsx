"use client";

import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";
import { Wordmark, type LogoProps } from "../brand/Wordmark";
import { CartButton, type CartProps } from "../cart/CartButton";
import { FontSwitcher } from "../switchers/FontSwitcher";
import { LanguageSwitcher, type LanguageLink } from "../switchers/LanguageSwitcher";
import { PaletteSwitcher } from "../switchers/PaletteSwitcher";
import type { ColorSchemeId } from "../theming/color-schemes";
import type { FontId } from "../theming/font-families";
import { UserMenu, type HeaderUser, type UserMenuItem } from "../user-menu/UserMenu";
import { VERSION } from "../version";
import { DEFAULT_LABELS, type HeaderLabels } from "./labels";
import { MenuPanel } from "./MenuPanel";
import { navFor, type HeaderVariant } from "./nav";

export interface HeaderProps {
  /** Picks the nav (see nav.ts). `prototype` has none. */
  variant: HeaderVariant;
  logo: LogoProps;
  /** `sticky` pushes content; `fixed` and `absolute` overlay it. `absolute` is fully
   * transparent — for a landing hero. */
  position?: "sticky" | "fixed" | "absolute";
  /** Adds Contact to the landing/public nav. */
  onContact?: () => void;
  /** The palette the host renders first. Absent: no palette switcher (tokenwise.sk, wave 1). */
  palette?: ColorSchemeId;
  /** The font the host renders first — the same id it puts on `<html data-font>`. */
  font: FontId;
  /** Fewer than two: no language switcher. */
  languages?: readonly LanguageLink[];
  /** Absent: the host has no accounts and the header shows no user control at all (a
   * prototype without Google sign-in). `null` is signed out. */
  user?: HeaderUser | null | "loading";
  signInHref?: string;
  userMenuItems?: readonly UserMenuItem[];
  onSignOut?: () => void | Promise<void>;
  /** Wave 1: count 0 and no `onOpen` — a click says the cart is empty. */
  cart?: CartProps;
  labels?: Partial<HeaderLabels>;
}

const NAV_LINK =
  "hidden min-h-11 items-center px-2 text-[12px] tracking-[0.05em] text-[var(--shared-ink-muted)] transition-colors hover:text-[var(--shared-accent)] lg:flex";

/**
 * The one header of tokenwise.sk and of every prototype.
 *
 *   ≥1024px  [logo]  nav…  [● Change colour] [Aa Inter] [EN ▾] [cart] [user]
 *   <1024px  [logo…]              [● Change colour] [cart] [user] [☰]
 *   <640px   [logo…]                               [●] [cart] [user] [☰]
 *
 * Translucent over the page (the host's background at 88% with a backdrop blur), no bottom
 * rule — as tokenwise.sk's header was before it moved here. Every colour and typeface is a
 * `--shared-*` variable the host maps onto its own tokens; the package reads nothing else.
 */
export function Header({
  variant,
  logo,
  position = "sticky",
  onContact,
  palette,
  font,
  languages = [],
  user,
  signInHref,
  userMenuItems = [],
  onSignOut,
  cart = { count: 0 },
  labels: labelOverrides,
}: HeaderProps) {
  const labels: HeaderLabels = { ...DEFAULT_LABELS, ...labelOverrides };
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const closeMenu = useCallback(() => setMenuOpen(false), [setMenuOpen]);
  const items = navFor(variant, Boolean(onContact), labels.contact);

  const positionClass =
    position === "fixed"
      ? "fixed left-0 right-0"
      : position === "absolute"
        ? "absolute left-0 right-0"
        : "sticky";

  return (
    <header
      data-shared-ui={VERSION}
      className={`${positionClass} top-0 z-30 flex items-center justify-between gap-3 py-4 text-[var(--shared-ink)] backdrop-blur-sm`}
      style={{
        background:
          position === "absolute"
            ? undefined
            : "color-mix(in srgb, var(--shared-bg) 88%, transparent)",
        paddingLeft: "var(--shared-gutter)",
        paddingRight: "var(--shared-gutter)",
      }}
    >
      <Wordmark {...logo} />

      <div className="flex shrink-0 items-center gap-1">
        {items.length > 0 && (
          <nav
            aria-label={labels.nav}
            className="hidden items-center gap-1 lg:flex"
            style={{ fontFamily: "var(--shared-font-mono)" }}
          >
            {items.map((item) =>
              item.action === "contact" ? (
                <button key={item.label} type="button" onClick={onContact} className={NAV_LINK}>
                  {item.label}
                </button>
              ) : (
                <Link key={item.label} href={item.href!} className={NAV_LINK}>
                  {item.label}
                </Link>
              )
            )}
          </nav>
        )}

        {palette && <PaletteSwitcher defaultScheme={palette} labels={labels} />}

        {/* Nav, font and language sit in the bar from 1024px and in the menu below it.
            Measured on tokenwise.sk (2026-09-25): the full row overflows by 213px at 640 and
            113px at 768, and fits from 900 — so the bar/menu swap is `lg`, not `sm`. */}
        <div className="hidden lg:flex">
          <FontSwitcher defaultFont={font} labels={labels} />
        </div>
        <div className="hidden lg:flex">
          <LanguageSwitcher languages={languages} labels={labels} />
        </div>

        <CartButton cart={cart} labels={labels} />
        {user !== undefined && (
          <UserMenu
            user={user}
            signInHref={signInHref ?? "/login"}
            items={userMenuItems}
            onSignOut={onSignOut ?? (() => {})}
            labels={labels}
          />
        )}

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={labels.openMenu}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          className="flex h-11 w-11 items-center justify-center text-[var(--shared-ink-muted)] transition-colors hover:text-[var(--shared-accent)] lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden focusable="false">
            <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <MenuPanel
          id={menuId}
          logo={logo}
          items={items}
          onContact={onContact}
          defaultFont={font}
          languages={languages}
          labels={labels}
          toggleRef={toggleRef}
          onClose={closeMenu}
        />
      )}
    </header>
  );
}
