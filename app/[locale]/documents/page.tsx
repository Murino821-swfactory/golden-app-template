"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/app/shell";
import { DocumentsPage } from "@/components/app/pages/documents";

/** law-expert workspace — documents. Signed-in only; the shell carries the navigation. */
export default function Page() {
  return (
    <AuthGuard>
      <AppShell active="documents">
        <DocumentsPage />
      </AppShell>
    </AuthGuard>
  );
}
