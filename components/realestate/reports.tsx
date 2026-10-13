"use client";

import { useMemo, useState } from "react";
import { useCopy, useLookups, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { downloadText, toCsv } from "@/lib/realestate/export";
import { formatDate, formatMoney, formatMonth, formatPercent } from "@/lib/realestate/format";
import { averageDaysOnMarket, byAgent, bySource, commissionAmount, commissionByMonth, dealsByStage, funnel, inventoryByStatus, monthlyRentRoll } from "@/lib/realestate/metrics";
import { addMonths, fullName } from "@/lib/realestate/model";
import { useNow } from "./shared";
import { Bar, KpiTile, PROPERTY_TONE, PageHeader, Panel, STAGE_TONE, SecondaryButton, Segmented } from "./ui";

export function Reports() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const lookups = useLookups(ws);
  const now = useNow();
  const [months, setMonths] = useState<"3" | "6" | "12">("6");
  const since = useMemo(() => addMonths(now, -Number(months)), [now, months]);
  const data = useMemo(() => {
    if (!ws) return null;
    return {
      funnel: funnel(ws, since),
      dom: averageDaysOnMarket(ws),
      byMonth: commissionByMonth(ws, now, Number(months)),
      agents: byAgent(ws, since),
      sources: bySource(ws, since),
      inventory: inventoryByStatus(ws),
      stages: [...dealsByStage(ws, "sale"), ...dealsByStage(ws, "rent").map((r) => ({ ...r, rent: true }))],
      rentRoll: monthlyRentRoll(ws),
    };
  }, [ws, since, now, months]);
  if (!ws || !data) return null;
  const f = data.funnel;
  const pct = (a: number, b: number) => (b > 0 ? formatPercent(Math.round((a / b) * 1000) / 10, locale) : "—");
  const maxMonth = Math.max(1, ...data.byMonth.map((b) => b.amount));
  const won = ws.deals.filter((d) => d.status === "won" && d.closedAt && d.closedAt >= since.toISOString());
  const exportCsv = () =>
    downloadText(`deals-${months}m.csv`, toCsv(c.reports.csvHeaders, won.map((d) => [formatDate(d.closedAt!, locale), lookups.property(d.propertyId)?.title ?? "", c.transaction[d.transaction], fullName(lookups.contact(d.buyerId) ?? { firstName: "", lastName: "" }), d.agreedPrice, commissionAmount(d.commission, d.agreedPrice), lookups.agent(d.agentId) ? `${lookups.agent(d.agentId)!.firstName} ${lookups.agent(d.agentId)!.lastName}` : ""])), "text/csv");
  const total = data.byMonth.reduce((s, b) => s + b.amount, 0);
  return (
    <div className="space-y-6">
      <PageHeader title={c.reports.title} intro={c.reports.intro} actions={<><Segmented label={c.reports.period} value={months} onChange={setMonths} options={[{ value: "3", label: c.reports.months(3) }, { value: "6", label: c.reports.months(6) }, { value: "12", label: c.reports.months(12) }]} /><SecondaryButton onClick={exportCsv}>{c.reports.exportCsv}</SecondaryButton></>} />
      <div data-testid="report-kpis" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiTile label={c.reports.commissionByMonth} value={formatMoney(total, locale)} hint={c.reports.deals(won.length)} tone="good" />
        <KpiTile label={c.reports.daysOnMarket} value={data.dom ?? "—"} hint={c.reports.daysOnMarketHint} />
        <KpiTile label={c.reports.funnel} value={pct(f.won, f.demands)} hint={c.reports.conversion(c.reports.demands, c.reports.won)} />
        <KpiTile label={c.reports.rentRoll} value={formatMoney(data.rentRoll, locale)} hint={c.reports.rentRollHint} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={c.reports.funnel} hint={c.reports.funnelHint} testId="report-funnel">
          <div className="space-y-3">
            <Bar label={c.nav.demands} value={f.demands} max={Math.max(1, f.demands)} meta={String(f.demands)} tone="info" />
            <Bar label={c.nav.viewings} value={f.viewings} max={Math.max(1, f.demands)} meta={`${f.viewings} · ${pct(f.viewings, f.demands)}`} tone="info" />
            <Bar label={c.stage.offer} value={f.offers} max={Math.max(1, f.demands)} meta={`${f.offers} · ${pct(f.offers, f.viewings)}`} tone="warn" />
            <Bar label={c.dealStatus.won} value={f.won} max={Math.max(1, f.demands)} meta={`${f.won} · ${pct(f.won, f.offers)}`} tone="good" />
          </div>
        </Panel>
        <Panel title={c.reports.commissionByMonth} testId="report-months">
          <div className="flex h-44 items-end gap-2" role="img" aria-label={c.reports.commissionByMonth}>
            {data.byMonth.map((b) => (
              <div key={b.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] tabular-nums text-muted-foreground">{b.amount > 0 ? formatMoney(b.amount, locale) : ""}</span>
                <div className="w-full rounded-t-md bg-emerald-400/70" style={{ height: `${Math.max(2, Math.round((b.amount / maxMonth) * 100))}%` }} title={`${formatMonth(b.month, locale)}: ${formatMoney(b.amount, locale)}`} />
                <span className="truncate text-[10px] text-muted-foreground">{formatMonth(b.month, locale)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={c.reports.byAgent}>
          <div className="space-y-3">
            {data.agents.filter((a) => a.agent.role !== "assistant").map((a) => <Bar key={a.agent.id} label={`${a.agent.firstName} ${a.agent.lastName}`} value={a.gross} max={Math.max(1, ...data.agents.map((x) => x.gross))} meta={`${formatMoney(a.gross, locale)} · ${c.reports.deals(a.wonDeals)}`} />)}
          </div>
        </Panel>
        <Panel title={c.reports.bySource}>
          {data.sources.length === 0 ? <p className="text-sm text-muted-foreground">{c.reports.noData}</p> : (
            <div className="space-y-3">
              {data.sources.map((s) => <Bar key={s.source} label={c.source[s.source]} value={s.demands} max={Math.max(1, ...data.sources.map((x) => x.demands))} meta={`${s.demands} · ${s.won} ${c.reports.won}`} tone="info" />)}
            </div>
          )}
        </Panel>
        <Panel title={c.reports.inventory}>
          <div className="space-y-3">
            {data.inventory.map((i) => <Bar key={i.status} label={c.propertyStatus[i.status]} value={i.count} max={Math.max(1, ...data.inventory.map((x) => x.count))} meta={String(i.count)} tone={PROPERTY_TONE[i.status]} />)}
          </div>
        </Panel>
        <Panel title={c.reports.pipelineByStage}>
          <div className="space-y-3">
            {data.stages.filter((s) => s.count > 0).map((s) => <Bar key={`${s.stage}-${"rent" in s ? "r" : "s"}`} label={`${c.stage[s.stage]}${"rent" in s ? ` · ${c.transaction.rent}` : ""}`} value={s.count} max={Math.max(1, ...data.stages.map((x) => x.count))} meta={`${s.count} · ${formatMoney(s.weighted, locale)}`} tone={STAGE_TONE[s.stage]} />)}
          </div>
        </Panel>
      </div>
    </div>
  );
}
