"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/app/shell";
import { HearingsPage } from "@/components/app/pages/hearings";

/** law-expert workspace — hearings. Signed-in only; the shell carries the navigation. */
export default function Page() {
  return (
    <AuthGuard>
      <AppShell active="hearings">
        <HearingsPage />
      </AppShell>
    </AuthGuard>
  );
}
