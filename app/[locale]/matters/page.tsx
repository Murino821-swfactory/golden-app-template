"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/app/shell";
import { MattersPage } from "@/components/app/pages/matters";

/** law-expert workspace — matters. Signed-in only; the shell carries the navigation. */
export default function Page() {
  return (
    <AuthGuard>
      <AppShell active="matters">
        <MattersPage />
      </AppShell>
    </AuthGuard>
  );
}
