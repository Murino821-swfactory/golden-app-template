import Link from "next/link";

export interface LogoProps {
  href: string;
  /** tokenwise.sk: `tokenwise`; a prototype: its `appName`. */
  text: string;
  /** Painted in the accent right after `text` — tokenwise.sk's `.sk`. */
  accent?: string;
}

/**
 * The logo, in the fixed display face (Big Shoulders 800): the brand does not follow the
 * visitor's font choice. A long app name truncates before any control in the header gives
 * way, which is why the link can shrink (`min-w-0`) and nothing else in the row can.
 */
export function Wordmark({ href, text, accent }: LogoProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 min-w-0 items-center rounded-sm text-[1.4rem] font-extrabold tracking-[0.01em] text-[var(--shared-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)]"
      style={{ fontFamily: "var(--shared-font-display)" }}
    >
      <span className="truncate">
        {text}
        {accent && <span className="text-[var(--shared-accent)]">{accent}</span>}
      </span>
    </Link>
  );
}
