"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/app/shell";
import { TeamPage } from "@/components/app/pages/team";

/** law-expert workspace — team. Signed-in only; the shell carries the navigation. */
export default function Page() {
  return (
    <AuthGuard>
      <AppShell active="team">
        <TeamPage />
      </AppShell>
    </AuthGuard>
  );
}
