"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * The landing's visual language (2026-10-19, after mdx.so — founder request): display
 * headlines set light with one medium-weight phrase, two-tone paragraphs, pill buttons
 * whose arrow steps up and out on hover, soft pools of the accent behind the words, thin
 * rules and large radii. Every colour is a semantic token, so "Change colour" repaints it
 * all; every weight is a weight of the face on screen, so "Change font" keeps the shape.
 */

/**
 * Splits a heading so one phrase carries the weight — the one emphasis the palette rule
 * leaves (one hue, so emphasis is weight, never a second colour). A headline with a dash
 * leads with its first clause; a longer one closes on its last two words; a short one is
 * set medium throughout. The rendered text is the configured string, character for
 * character: tests, search engines and assistive technology read the same words.
 */
export function DisplayText({ text }: { text: string }) {
  const dash = /\s[—–]\s/.exec(text);
  if (dash) {
    return (
      <>
        <span className="font-medium">{text.slice(0, dash.index)}</span>
        {dash[0]}
        {text.slice(dash.index + dash[0].length)}
      </>
    );
  }
  const words = text.trim().split(/\s+/);
  if (words.length < 5) return <span className="font-medium">{text}</span>;
  return (
    <>
      {words.slice(0, -2).join(" ")}
      {" "}
      <span className="font-medium">{words.slice(-2).join(" ")}</span>
    </>
  );
}

/**
 * A paragraph whose lead is in the ink and whose rest is in the muted tone — the reference's
 * two-tone copy, without a second string in the config. The lead ends at the first colon;
 * a paragraph without one, or with a lead too long to be a lead, stays muted throughout.
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

/** A small label with the accent's dot before it — the reference's "• Get Started". */
export function Eyebrow({ children, className, ...rest }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground",
        className
      )}
      {...rest}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
      {children}
    </p>
  );
}

const PILL =
  "group/pill inline-flex min-h-13 items-center justify-center gap-3 rounded-full px-5 py-3 text-center text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] transition-[transform,background-color,color,border-color] duration-500 ease-[cubic-bezier(.625,.05,0,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none sm:px-6 sm:text-[12px] sm:tracking-[0.16em]";

const PILL_VARIANT = {
  /** The one action of a block: the ink as a surface, the page colour as its text. */
  solid:
    "bg-foreground text-background shadow-[0_14px_40px_-14px_color-mix(in_oklab,var(--foreground)_60%,transparent)] hover:scale-[0.96]",
  /** The quieter choice beside it: a rule that fills on hover. */
  outline:
    "border border-foreground/30 bg-transparent text-foreground hover:border-foreground hover:bg-foreground hover:text-background",
} as const;

export type PillVariant = keyof typeof PILL_VARIANT;

/** The arrow that leaves to the top right as its twin arrives from the bottom left. */
function PillArrow() {
  const arrow =
    "size-4 transition-transform duration-500 ease-[cubic-bezier(.625,.05,0,1)] motion-reduce:transition-none";
  return (
    <span aria-hidden className="relative size-4 shrink-0 overflow-hidden">
      <ArrowUpRight className={cn(arrow, "group-hover/pill:-translate-y-full group-hover/pill:translate-x-full")} />
      <ArrowUpRight
        className={cn(
          arrow,
          "absolute inset-0 -translate-x-full translate-y-full group-hover/pill:translate-x-0 group-hover/pill:translate-y-0"
        )}
      />
    </span>
  );
}

export function PillLink({
  variant = "solid",
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: PillVariant }) {
  return (
    <Link className={cn(PILL, PILL_VARIANT[variant], className)} {...rest}>
      <span>{children}</span>
      <PillArrow />
    </Link>
  );
}

export function PillButton({
  variant = "outline",
  className,
  children,
  type = "button",
  ...rest
}: ComponentProps<"button"> & { variant?: PillVariant }) {
  return (
    <button
      type={type}
      className={cn(PILL, PILL_VARIANT[variant], "disabled:pointer-events-none disabled:opacity-50", className)}
      {...rest}
    >
      <span>{children}</span>
      <PillArrow />
    </button>
  );
}

/** A soft pool of the accent behind a headline — the reference's blurred ellipses. The
 * parent is `relative isolate`, so the pool sits under the words and over the page. */
export function Glow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute -z-10 rounded-full bg-primary/20 blur-[90px]", className)}
    />
  );
}

/** A section's display heading. */
export const DISPLAY_H2 =
  "text-balance text-4xl font-light leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-6xl";

/** The breathing room every section of the landing keeps. */
export const SECTION = "scroll-mt-24 relative isolate mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36";
