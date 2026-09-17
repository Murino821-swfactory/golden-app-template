"use client";

import Link from "next/link";
import { PaletteSwitcher } from "@/components/layout/palette-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { config } from "@/lib/prototype-config";

/**
 * The header every page of a prototype shows.
 *
 * Contents are deliberately three controls and a name — palette, sign-in, and (once the
 * prototype ships more than one locale) the language switcher. No nav: a prototype has
 * two or three routes, and a menu over them is chrome pretending to be a product.
 *
 * The name comes from `prototype.config.json`. It used to come from `messages/en.json`,
 * whose `common.appName` is the string "Golden App" — so every prototype, whatever the
 * customer named it, introduced itself as the template in its own header and footer. The
 * `<title>` was right, which is exactly why the smoke suite never saw it.
 */
export function Header() {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 py-3 backdrop-blur-sm"
      style={{
        background: "color-mix(in srgb, var(--background) 88%, transparent)",
        paddingLeft: "var(--gutter)",
        paddingRight: "var(--gutter)",
      }}
    >
      <Link
        href="/"
        className="font-heading text-sm font-semibold tracking-tight text-foreground"
      >
        {config.appName}
      </Link>

      <div className="flex items-center gap-1">
        <PaletteSwitcher />
        {config.patterns.authGoogle !== undefined && <UserMenu />}
      </div>
    </header>
  );
}
