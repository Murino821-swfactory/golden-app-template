"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/app/shell";
import { DeadlinesPage } from "@/components/app/pages/deadlines";

/** law-expert workspace — deadlines. Signed-in only; the shell carries the navigation. */
export default function Page() {
  return (
    <AuthGuard>
      <AppShell active="deadlines">
        <DeadlinesPage />
      </AppShell>
    </AuthGuard>
  );
}
