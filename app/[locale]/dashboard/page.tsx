"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { localePath } from "@/lib/locale-routing";
import { researchCopy } from "@/lib/law-expert/copy";
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
  const t = useTranslations("dashboard");

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
      <StatCard value={total} label={t("recordsLabel", { entity: entityLabel })} icon="📋" />
      <StatCard value={thisMonth} label={t("addedThisMonth")} icon="📈" />
      <StatCard value={fieldCount} label={t("trackedFields")} icon="🏷️" />
    </div>
  );
}

function DashboardContent() {
  const dashboard = useContent().dashboard;
  const locale = useLocale();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {dashboard?.title ?? config.appName}
        </h1>
        <Button asChild className="h-11 px-5">
          <Link href={localePath(locale, "/research")}>{researchCopy(locale).dashboardLink}</Link>
        </Button>
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
