"use client";

import { useLocale, useTranslations } from "next-intl";
import { StatCard } from "@/components/features";
import { useContent } from "@/hooks/use-content";
import { useRecords } from "@/hooks/use-records";
import { dashboardKpis } from "@/lib/kpi";
import { config } from "@/lib/prototype-config";

export function DashboardStats() {
  const { records, entityLabel, loading } = useRecords();
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const labels = useContent().dashboard?.kpiLabels;
  const cards = dashboardKpis(
    records,
    config.patterns.dashboard?.kpis,
    labels,
    { total: t("recordsLabel", { entity: entityLabel }), thisMonth: t("addedThisMonth") },
    new Date(),
    locale
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <StatCard key={card.id} value={loading ? "—" : card.value} label={card.label} />
      ))}
    </div>
  );
}
