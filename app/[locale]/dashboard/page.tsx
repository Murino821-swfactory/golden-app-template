"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { StatCard } from "@/components/features";
import { DataGrid } from "@/components/patterns/data-grid";
import { MapBase } from "@/components/patterns/map-base";
import { useRecords } from "@/hooks/use-records";
import { useContent, useEntityFields } from "@/hooks/use-content";
import { config } from "@/lib/prototype-config";

/**
 * The signed-in page. Which blocks appear is decided by `prototype.config.json` alone —
 * a pattern renders iff its config slice is present. No prototype-specific code.
 */

const hasGrid = config.patterns.dataGrid !== undefined;
const hasMap = config.patterns.mapBase !== undefined;

function Stats() {
  const { records, entityLabel, loading } = useRecords();
  const fieldCount = useEntityFields().length;
  const total = loading ? "—" : records.length;

  const thisMonth = loading
    ? "—"
    : records.filter((r) => {
        const now = new Date();
        return (
          r.createdAt.getMonth() === now.getMonth() &&
          r.createdAt.getFullYear() === now.getFullYear()
        );
      }).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard value={total} label={`${entityLabel} records`} icon="📋" />
      <StatCard value={thisMonth} label="Added this month" icon="📈" />
      <StatCard value={fieldCount} label="Tracked fields" icon="🏷️" />
    </div>
  );
}

function DashboardContent() {
  const dashboard = useContent().dashboard;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {dashboard?.title ?? config.appName}
        </h1>
      </header>

      {hasGrid && <Stats />}
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
