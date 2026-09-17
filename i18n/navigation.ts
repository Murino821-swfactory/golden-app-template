import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation. Every `Link` and `router.push` in the app goes through these.
 *
 * Plain `next/link` would drop the prefix: a Slovak visitor clicking "sign in" would be
 * pushed to `/login`, which exists only as `/sk/login` and `/en/login`, and land on a 404
 * — or, worse under a base path, on nothing at all.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
