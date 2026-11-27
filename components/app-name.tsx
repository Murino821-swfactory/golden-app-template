"use client";

import { useAppName } from "@/hooks/use-content";

/** The app's name as text, for a server component such as the footer: the build's, or the
 * customer's on a golden-demo preview (`lib/customer-texts.ts`). */
export function AppName() {
  return <>{useAppName()}</>;
}
