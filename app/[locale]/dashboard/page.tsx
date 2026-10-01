"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ResearchArchive } from "@/components/law-expert/archive";
import { Button } from "@/components/ui/button";
import { localePath } from "@/lib/locale-routing";
import { researchCopy } from "@/lib/law-expert/copy";
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
  const locale = useLocale();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {dashboard?.title ?? config.appName}
          </h1>
          {dashboard?.intro && <p className="mt-2 text-muted-foreground">{dashboard.intro}</p>}
        </div>
        <Button asChild className="h-11 px-5">
          <Link href={localePath(locale, "/research")}>{researchCopy(locale).dashboardLink}</Link>
        </Button>
      </header>
      <OwnerLinks />

      <ResearchArchive locale={locale === "sk" ? "sk" : "en"} />

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
