"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/app/shell";
import { DashboardPage } from "@/components/app/pages/dashboard";

/**
 * The signed-in home of law-expert: today's agenda, deadlines at risk, unbilled work and the
 * team's workload. The generic template dashboard (KPI cards + data grid) is replaced on this
 * branch by the workspace (sw-factory spec 2026-10-13-law-expert-practice-system-design.md).
 */
export default function Page() {
  return (
    <AuthGuard>
      <AppShell active="dashboard">
        <DashboardPage />
      </AppShell>
    </AuthGuard>
  );
}
