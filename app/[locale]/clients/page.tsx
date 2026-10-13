"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/app/shell";
import { ClientsPage } from "@/components/app/pages/clients";

/** law-expert workspace — clients. Signed-in only; the shell carries the navigation. */
export default function Page() {
  return (
    <AuthGuard>
      <AppShell active="clients">
        <ClientsPage />
      </AppShell>
    </AuthGuard>
  );
}
