"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { Download } from "lucide-react";
import { useCopy, useLookups, useWorkspace } from "@/hooks/use-workspace";
import { downloadText, placementsCsv } from "@/lib/recruiting/export";
import { STAGES } from "@/lib/recruiting/model";
import {
  averageDaysInStage, feeTotals, feesByClient, feesByMonth, formatMoney, formatMonth, funnel, percent, pipelineValue, sourceStats, timeToFill,
} from "@/lib/recruiting/metrics";
import { Bar, EmptyState, KpiTile, PageHeader, Panel, STAGE_TONE, SecondaryButton } from "./ui";
import { useNow } from "./shared";

export function ReportsView() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useLocale();
  const lookups = useLookups(ws);
  const now = useNow();

  const data = useMemo(() => {
    if (!ws) return null;
    return {
      funnel: funnel(ws.applications),
      ttf: timeToFill(ws),
      stageDays: averageDaysInStage(ws.applications),
      sources: sourceStats(ws),
      byClient: feesByClient(ws),
      byMonth: feesByMonth(ws, now, 6),
      totals: feeTotals(ws),
      pipeline: pipelineValue(ws),
    };
  }, [ws, now]);

  if (!ws || !data) return null;
  const money = (n: number) => formatMoney(n, ws.settings.currency, locale);
  const maxReached = Math.max(1, ...data.funnel.map((f) => f.reached));
  const maxMonth = Math.max(1, ...data.byMonth.map((m) => m.amount));
  const maxClient = Math.max(1, ...data.byClient.map((m) => m.amount));
  const maxSource = Math.max(1, ...data.sources.map((s) => s.candidates));
  const maxPipeline = Math.max(1, ...data.pipeline.rows.map((r) => r.weighted));

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.reports.title}
        intro={c.reports.intro}
        actions={
          <SecondaryButton onClick={() => downloadText("placements.csv", placementsCsv(ws, ["start", "candidate", "job", "client", "salary", "fee_percent", "fee", "guarantee_until", "invoice"]), "text/csv")}>
            <Download aria-hidden /> {c.reports.exportCsv}
          </SecondaryButton>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={c.reports.revenue.total} value={money(data.totals.total)} />
        <KpiTile label={c.reports.revenue.invoiced} value={money(data.totals.invoiced)} />
        <KpiTile label={c.reports.revenue.paid} value={money(data.totals.paid)} tone="good" />
        <KpiTile label={c.reports.revenue.outstanding} value={money(data.totals.outstanding)} tone={data.totals.outstanding > 0 ? "warn" : "neutral"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={c.reports.funnel.title} hint={c.reports.funnel.hint} data-testid="report-funnel">
          <div className="space-y-2.5">
            {data.funnel.map((step) => (
              <Bar
                key={step.stage}
                label={c.stages[step.stage]}
                value={step.reached}
                max={maxReached}
                meta={`${step.reached} ${c.reports.funnel.reached}${step.conversion !== null ? ` · ${percent(step.conversion)}` : ""}`}
                tone={STAGE_TONE[step.stage] === "neutral" ? "accent" : STAGE_TONE[step.stage]}
              />
            ))}
          </div>
        </Panel>

        <Panel title={c.reports.timeToFill.title} hint={c.reports.timeToFill.hint}>
          {data.ttf.perJob.length === 0 ? (
            <p className="text-sm text-muted-foreground">{c.reports.timeToFill.noData}</p>
          ) : (
            <div className="space-y-3">
              <p className="text-3xl font-semibold tabular-nums">
                {c.reports.timeToFill.days(data.ttf.average ?? 0)} <span className="text-sm font-normal text-muted-foreground">{c.reports.timeToFill.avg}</span>
              </p>
              <div className="space-y-2.5">
                {data.ttf.perJob.map((row) => (
                  <Bar key={row.jobId} label={lookups.job(row.jobId)?.title ?? row.jobId} value={row.days} max={Math.max(1, ...data.ttf.perJob.map((r) => r.days))} meta={c.reports.timeToFill.days(row.days)} />
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title={c.reports.stageTime.title} hint={c.reports.stageTime.hint}>
          <div className="space-y-2.5">
            {STAGES.filter((s) => s !== "placed").map((stage) => {
              const value = data.stageDays[stage];
              return <Bar key={stage} label={c.stages[stage]} value={value ?? 0} max={Math.max(1, ...STAGES.map((s) => data.stageDays[s] ?? 0))} meta={value === null ? c.common.none : c.reports.timeToFill.days(value)} tone={STAGE_TONE[stage] === "neutral" ? "accent" : STAGE_TONE[stage]} />;
            })}
          </div>
        </Panel>

        <Panel title={c.reports.sources.title} hint={c.reports.sources.hint}>
          {data.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">{c.reports.empty}</p>
          ) : (
            <div className="space-y-2.5">
              {data.sources.map((s) => (
                <Bar key={s.source} label={c.source[s.source]} value={s.candidates} max={maxSource} meta={`${s.candidates} ${c.reports.sources.candidates} · ${s.placed} ${c.reports.sources.placed}`} tone={s.placed > 0 ? "good" : "accent"} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title={`${c.reports.revenue.title} · ${c.reports.revenue.byMonth}`} hint={c.reports.revenue.hint}>
          <div className="flex h-40 items-end gap-2" role="img" aria-label={c.reports.revenue.byMonth}>
            {data.byMonth.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[11px] tabular-nums text-muted-foreground">{m.amount ? money(m.amount) : ""}</span>
                <div className="w-full rounded-t-md bg-emerald-400/80" style={{ height: `${Math.max(2, Math.round((m.amount / maxMonth) * 100))}%` }} />
                <span className="text-[11px] text-muted-foreground">{formatMonth(m.key, locale)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={`${c.reports.revenue.title} · ${c.reports.revenue.byClient}`}>
          {data.byClient.length === 0 ? (
            <p className="text-sm text-muted-foreground">{c.reports.empty}</p>
          ) : (
            <div className="space-y-2.5">
              {data.byClient.map((row) => (
                <Bar key={row.key} label={row.label} value={row.amount} max={maxClient} meta={money(row.amount)} tone="good" />
              ))}
            </div>
          )}
        </Panel>

        <Panel title={c.reports.pipelineValue.title} hint={c.reports.pipelineValue.hint} className="lg:col-span-2">
          {data.pipeline.rows.length === 0 ? (
            <EmptyState title={c.reports.empty} />
          ) : (
            <div className="space-y-2.5">
              {data.pipeline.rows.map((row) => (
                <Bar
                  key={row.jobId}
                  label={`${lookups.job(row.jobId)?.title ?? row.jobId} · ${lookups.client(lookups.job(row.jobId)?.clientId ?? "")?.name ?? ""}`}
                  value={row.weighted}
                  max={maxPipeline}
                  meta={`${money(row.weighted)} · ${Math.round(row.weight * 100)} % × ${money(row.expectedFee)}`}
                />
              ))}
              <p className="pt-1 text-right text-sm">
                {c.reports.revenue.total}: <span className="font-semibold tabular-nums">{money(data.pipeline.total)}</span>
              </p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
