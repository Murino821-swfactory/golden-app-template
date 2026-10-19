"use client";

import { usePathname } from "next/navigation";
import { routeFromPathname } from "@/lib/locale-routing";

/**
 * The app's name set large across the foot of the landing — the reference closes on its
 * wordmark the same way. Only on the landing: under the workspace it would be noise. The
 * size is clamped to the viewport and the words may break, so a long name wraps instead
 * of scrolling the page sideways on a 360px phone. Decorative: the line beside it already
 * names the app for assistive technology.
 */
export function FooterWordmark({ name }: { name: string }) {
  const route = routeFromPathname(usePathname());
  if (route !== "/") return null;
  return (
    <p aria-hidden data-footer-wordmark className="mb-10 select-none break-words text-[clamp(2.75rem,9vw,8.5rem)] font-medium leading-[0.9] tracking-[-0.045em] text-foreground sm:mb-14">
      {name}
    </p>
  );
}
