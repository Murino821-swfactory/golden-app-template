"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { BizLaunchWorkspace } from "@/components/bizlaunch/workspace";
import { OwnerLinks } from "@/components/owner/owner-links";
import { DataGrid } from "@/components/patterns/data-grid";
import { MapBase } from "@/components/patterns/map-base";
import { useContent } from "@/hooks/use-content";
import { DashboardStats } from "@/components/dashboard/stats";
import { config } from "@/lib/prototype-config";

/**
 * The signed-in page. Which blocks appear is decided by `prototype.config.json` alone —
 * a pattern renders iff its config slice is present. No prototype-specific code.
 */

const hasGrid = config.patterns.dataGrid !== undefined;
const hasMap = config.patterns.mapBase !== undefined;

function DashboardContent() {
  const dashboard = useContent().dashboard;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {dashboard?.title ?? config.appName}
        </h1>
        {dashboard?.intro && <p className="mt-2 text-muted-foreground">{dashboard.intro}</p>}
      </header>
      <OwnerLinks />

      <BizLaunchWorkspace />

      {hasGrid && <DashboardStats />}
      {hasMap && <MapBase />}
      {hasGrid && <DataGrid />}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
