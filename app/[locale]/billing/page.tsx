"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/app/shell";
import { BillingPage } from "@/components/app/pages/billing";

/** law-expert workspace — billing. Signed-in only; the shell carries the navigation. */
export default function Page() {
  return (
    <AuthGuard>
      <AppShell active="billing">
        <BillingPage />
      </AppShell>
    </AuthGuard>
  );
}
