"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/app/shell";
import { CalendarPage } from "@/components/app/pages/calendar";

/** law-expert workspace — calendar. Signed-in only; the shell carries the navigation. */
export default function Page() {
  return (
    <AuthGuard>
      <AppShell active="calendar">
        <CalendarPage />
      </AppShell>
    </AuthGuard>
  );
}
