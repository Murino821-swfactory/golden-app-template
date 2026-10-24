import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The small parts the GitPulse landing sections share. Styles live in `app/landing.css`
 * as `.landing-*` rules, because most of them are glows, gradients and pseudo-elements
 * that Tailwind utilities only make longer — and every colour is a palette token, so
 * "Change colour" repaints all of it.
 */

/** The pill above a heading. `lines` draws the hairlines on either side (hero only). */
export function Eyebrow({ children, lines, className }: { children: ReactNode; lines?: boolean; className?: string }) {
  return (
    <span data-eyebrow className={cn("landing-eyebrow", lines && "landing-eyebrow-lines", className)}>
      {children}
    </span>
  );
}

/** "01", "02" … as large faint typography, never read aloud. */
export function Numeral({ index, className }: { index: number; className?: string }) {
  return (
    <span data-numeral aria-hidden className={cn("landing-numeral", className)}>
      {String(index + 1).padStart(2, "0")}
    </span>
  );
}

/** The faint grid behind a section. Decoration, so it is hidden from assistive tech. */
export function GridBackdrop({ className }: { className?: string }) {
  return <div aria-hidden className={cn("landing-grid pointer-events-none absolute inset-0 -z-10", className)} />;
}
