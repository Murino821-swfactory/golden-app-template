/** Dashboard numbers from the visitor's records. Pure; locale-aware formatting. */
import type { Kpi } from "./prototype-config";
import type { EntityRecord } from "./records";

export interface KpiCard {
  id: string;
  label: string;
  value: string;
}

const isSet = (v: unknown) => v !== undefined && v !== null && v !== "";

export function computeKpi(records: readonly EntityRecord[], kpi: Kpi, locale: string): string {
  if (kpi.agg === "count") return new Intl.NumberFormat(locale).format(records.length);
  if (kpi.agg === "share") {
    const share = records.length === 0 ? 0 : records.filter((r) => r.values[kpi.field] === kpi.value).length / records.length;
    return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(share);
  }
  const nums = records.map((r) => r.values[kpi.field]).filter(isSet).map(Number).filter(Number.isFinite);
  if (nums.length === 0) return "—";
  const sum = nums.reduce((a, b) => a + b, 0);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(kpi.agg === "sum" ? sum : sum / nums.length);
}

export function dashboardKpis(
  records: readonly EntityRecord[],
  kpis: readonly Kpi[] | undefined,
  labels: Record<string, string> | undefined,
  fallback: { total: string; thisMonth: string },
  now: Date,
  locale: string
): KpiCard[] {
  if (kpis && kpis.length > 0) {
    return kpis.map((kpi) => ({ id: kpi.id, label: labels?.[kpi.id] ?? kpi.id, value: computeKpi(records, kpi, locale) }));
  }
  const thisMonth = records.filter(
    (r) => r.createdAt.getUTCMonth() === now.getUTCMonth() && r.createdAt.getUTCFullYear() === now.getUTCFullYear()
  ).length;
  const fmt = new Intl.NumberFormat(locale);
  return [
    { id: "total", label: fallback.total, value: fmt.format(records.length) },
    { id: "thisMonth", label: fallback.thisMonth, value: fmt.format(thisMonth) },
  ];
}
