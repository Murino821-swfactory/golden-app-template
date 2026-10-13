"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/app/shell";
import { SettingsPage } from "@/components/app/pages/settings";

/** law-expert workspace — settings. Signed-in only; the shell carries the navigation. */
export default function Page() {
  return (
    <AuthGuard>
      <AppShell active="settings">
        <SettingsPage />
      </AppShell>
    </AuthGuard>
  );
}
