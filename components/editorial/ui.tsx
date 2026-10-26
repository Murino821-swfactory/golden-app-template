import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { splitDisplay } from "@/lib/editorial";
import { cn } from "@/lib/utils";

/**
 * The small parts the editorial sections share. Styles live in `editorial.css` as
 * `.editorial-*` rules, because most of them are glows, gradients and pseudo-elements that
 * Tailwind utilities only make longer — and every colour there is a palette token, so
 * "Change colour" repaints all of it; every weight is a weight of the face on screen, so
 * "Change font" keeps the shape.
 */

/** The pill above a heading. `lines` draws the hairlines on either side (the hero's). */
export function Eyebrow({ children, lines, className, ...rest }: ComponentProps<"span"> & { lines?: boolean }) {
  return (
    <span data-eyebrow className={cn("editorial-eyebrow", lines && "editorial-eyebrow-lines", className)} {...rest}>
      {children}
    </span>
  );
}

/** "01", "02" … as large faint typography, never read aloud. */
export function Numeral({ index, className }: { index: number; className?: string }) {
  return (
    <span data-numeral aria-hidden className={cn("editorial-numeral", className)}>
      {String(index + 1).padStart(2, "0")}
    </span>
  );
}

/** The faint grid behind a section. Decoration, so it is hidden from assistive tech. */
export function GridBackdrop({ className }: { className?: string }) {
  return <div aria-hidden className={cn("editorial-grid pointer-events-none absolute inset-0 -z-10", className)} />;
}

/** A display headline set light, with one phrase in weight (`lib/editorial.ts`). */
export function DisplayText({ text }: { text: string }) {
  const split = splitDisplay(text);
  return (
    <>
      {split.before}
      <span data-display-emphasis className="font-medium">
        {split.emphasis}
      </span>
      {split.after}
    </>
  );
}

/**
 * A paragraph whose lead is in the ink and whose rest is in the muted tone — two-tone copy
 * without a second string in the config. The lead ends at the first colon; a paragraph
 * without one, or with a lead too long to be a lead, stays muted throughout.
 */
export function TwoTone({ text }: { text: string }) {
  const at = text.indexOf(":");
  if (at < 0 || at > 90) return <>{text}</>;
  return (
    <>
      <span className="text-foreground">{text.slice(0, at + 1)}</span>
      {text.slice(at + 1)}
    </>
  );
}

/** Each word in its own span, numbered across the whole paragraph, so CSS can light them
 * up one after another on scroll. Spaces stay as text, so copy and read-aloud are unchanged. */
export function Words({ text, from }: { text: string; from: number }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span key={i}>
          {i > 0 && " "}
          <span data-word style={{ "--i": from + i } as CSSProperties}>
            {word}
          </span>
        </span>
      ))}
    </>
  );
}

/** A section's heading: light, tight, balanced. */
export const DISPLAY_H2 = "editorial-h2 max-w-3xl text-balance text-3xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl";

/** A section's head: the heading centred, with the eyebrow when there is one. */
export function SectionHead({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center gap-4 text-center">{children}</div>;
}
