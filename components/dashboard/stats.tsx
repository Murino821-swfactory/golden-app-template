"use client";

import { useLocale, useTranslations } from "next-intl";
import { StatCard } from "@/components/features";
import { useContent } from "@/hooks/use-content";
import { useRecords } from "@/hooks/use-records";
import { dashboardKpis } from "@/lib/kpi";
import { config } from "@/lib/prototype-config";
import { parseReservation, withLiveStatus } from "@/lib/parking";
import { PARKING_ENABLED } from "@/lib/parking-config";

export function DashboardStats() {
  const { records, extras, entityLabel, loading } = useRecords();
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const labels = useContent().dashboard?.kpiLabels;
  const now = new Date();
  // Parking (T-430): a running reservation reserves its spot on the map; the cards count the same.
  const counted = PARKING_ENABLED ? withLiveStatus(records, extras.flatMap((r) => parseReservation(r) ?? []), now) : records;
  const cards = dashboardKpis(
    counted,
    config.patterns.dashboard?.kpis,
    labels,
    { total: t("recordsLabel", { entity: entityLabel }), thisMonth: t("addedThisMonth") },
    now,
    locale
  );
  return (
    <div data-pattern="dashboard-stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <StatCard key={card.id} value={loading ? "—" : card.value} label={card.label} />
      ))}
    </div>
  );
}
