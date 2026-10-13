"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/app/shell";
import { Research } from "@/components/law-expert/research";

/** law-expert (OTH-91): research over InfoSúd and NS SR decisions, inside the workspace shell.
 * Signed-in only — the API needs the visitor's ID token, and the daily memo quota is per user. */
export default function ResearchPage() {
  return (
    <AuthGuard>
      <AppShell active="research">
        <Research />
      </AppShell>
    </AuthGuard>
  );
}
