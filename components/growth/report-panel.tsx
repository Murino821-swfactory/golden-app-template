"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Figure } from "@/components/studio/ui";
import type { GrowthCopy } from "@/lib/growth/copy";
import { CHANNEL_IDS, CONTENT_KINDS, EMPTY_METRICS, METRIC_KEYS, buildReport, reportContent, reportFileName, reportMarkdown, type Goals, type WeekMetrics } from "@/lib/growth/report";
import { goalsStore, metricsStore } from "@/lib/growth/store";
import type { ScenarioContent } from "@/lib/studio/channels";
import type { PublishLogEntry } from "@/lib/studio/publish";
import { cn } from "@/lib/utils";

interface Props {
  copy: GrowthCopy;
  week: string;
  log: readonly PublishLogEntry[];
  pickedRef: string | null;
  onPick: (content: ScenarioContent) => void;
}

function toCount(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function NumberField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <Input id={id} type="number" inputMode="numeric" min={0} value={value} onChange={(e) => onChange(toCount(e.target.value))} className="h-10 tabular-nums" />
    </label>
  );
}

function GoalRow({ label, have, goal, met, copy }: { label: string; have: number; goal: number; met: boolean; copy: GrowthCopy }) {
  const pct = goal > 0 ? Math.min(100, Math.round((have / goal) * 100)) : 0;
  return (
    <li className="space-y-1" data-testid="goal-row" data-met={met}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {have} / {goal} · <span className={cn(met && "text-primary")}>{met ? copy.report.met : copy.report.notMet}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

/** The week's report: produced, numbers (typed in), goals, suggestion, download, publish. */
export function ReportPanel({ copy, week, log, pickedRef, onPick }: Props) {
  const c = copy.report;
  const metricsByWeek = metricsStore.use();
  const goals = goalsStore.use();
  const report = week ? buildReport({ weekStart: week, log, metricsByWeek, goals }) : null;
  const metrics = (week && metricsByWeek[week]) || EMPTY_METRICS;
  const ref = week ? `report:${week}` : null;

  const setMetric = (key: keyof WeekMetrics, value: number) => {
    if (!week) return;
    metricsStore.set({ ...metricsByWeek, [week]: { ...metrics, [key]: value } });
  };
  const setGoal = (next: Goals) => goalsStore.set(next);

  const download = () => {
    if (!report) return;
    const blob = new Blob([reportMarkdown(report, copy)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = reportFileName(report.weekStart);
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <div className="space-y-8" data-testid="report-panel">
      <div>
        <h2 className="text-lg font-semibold">{c.heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{c.intro}</p>
        <p className="mt-1 text-sm font-medium tabular-nums" data-testid="report-range">
          {report ? c.range(report.weekStart, report.weekEnd) : "…"}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Figure label={c.produced} value={report ? String(report.total) : "…"} accent />
        <Figure label={c.reach} value={String(metrics.reach)} />
        <Figure label={c.registrations} value={String(metrics.registrations)} />
        <Figure label={c.followers} value={String(metrics.followers)} />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label={c.produced} className="rounded-xl border border-border/60 bg-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{c.produced}</h3>
          {report && report.total > 0 ? (
            <ul className="mt-2 space-y-1 text-sm" data-testid="produced-list">
              {CONTENT_KINDS.filter((k) => report.produced[k]).map((k) => (
                <li key={k} className="flex justify-between tabular-nums">
                  <span>{copy.kinds[k]}</span>
                  <span>{report.produced[k]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{c.empty}</p>
          )}
          {report && report.total > 0 && (
            <>
              <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.byChannel}</h4>
              <ul className="mt-1 space-y-1 text-sm">
                {CHANNEL_IDS.filter((ch) => report.byChannel[ch]).map((ch) => (
                  <li key={ch} className="flex justify-between tabular-nums">
                    <span>{copy.channels[ch]}</span>
                    <span>{report.byChannel[ch]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section aria-label={c.metricsHeading} className="rounded-xl border border-border/60 bg-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{c.metricsHeading}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{c.metricsIntro}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {METRIC_KEYS.map((key) => (
              <div key={key}>
                <NumberField id={`metric-${key}`} label={c[key]} value={metrics[key]} onChange={(n) => setMetric(key, n)} />
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">{report?.deltas ? c.vsLast(report.deltas[key]) : c.noLast}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section aria-label={c.goalsHeading} className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{c.goalsHeading}</h3>
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">{c.weeklyGoals}</h4>
            <div className="grid grid-cols-3 gap-2">
              <NumberField id="goal-pieces" label={c.goalPieces} value={goals.weekly.pieces} onChange={(n) => setGoal({ ...goals, weekly: { ...goals.weekly, pieces: n } })} />
              <NumberField id="goal-reach" label={c.goalReach} value={goals.weekly.reach} onChange={(n) => setGoal({ ...goals, weekly: { ...goals.weekly, reach: n } })} />
              <NumberField id="goal-registrations" label={c.goalRegistrations} value={goals.weekly.registrations} onChange={(n) => setGoal({ ...goals, weekly: { ...goals.weekly, registrations: n } })} />
            </div>
            {report && (
              <ul className="space-y-2">
                <GoalRow label={c.goalPieces} {...report.weekly.pieces} copy={copy} />
                <GoalRow label={c.goalReach} {...report.weekly.reach} copy={copy} />
                <GoalRow label={c.goalRegistrations} {...report.weekly.registrations} copy={copy} />
              </ul>
            )}
            {report && (
              <p className="text-xs text-muted-foreground" data-testid="suggestion">
                {c.suggestion}: {report.suggested.pieces} · {report.suggested.reach} · {report.suggested.registrations}{" "}
                <Button type="button" variant="ghost" size="sm" onClick={() => setGoal({ ...goals, weekly: report.suggested })}>
                  {c.applySuggestion}
                </Button>
              </p>
            )}
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-medium">{c.monthlyGoal}</h4>
            <div className="grid grid-cols-2 gap-2">
              <NumberField id="goal-month-registrations" label={c.goalRegistrations} value={goals.monthly.registrations} onChange={(n) => setGoal({ ...goals, monthly: { ...goals.monthly, registrations: n } })} />
              <NumberField id="goal-month-followers" label={c.goalFollowers} value={goals.monthly.followers} onChange={(n) => setGoal({ ...goals, monthly: { ...goals.monthly, followers: n } })} />
            </div>
            {report && (
              <ul className="space-y-2">
                <GoalRow label={c.goalRegistrations} {...report.monthly.registrations} copy={copy} />
                <GoalRow label={c.goalFollowers} {...report.monthly.followers} copy={copy} />
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="h-9" onClick={download} disabled={!report} data-testid="report-download">
          {c.download}
        </Button>
        <Button type="button" variant={pickedRef === ref ? "secondary" : "outline"} className="h-9" onClick={() => report && onPick(reportContent(report, copy))} disabled={!report} aria-pressed={pickedRef === ref} data-testid="report-pick">
          {pickedRef === ref ? copy.plan.picked : copy.plan.pick}
        </Button>
        <span className="text-xs text-muted-foreground">{c.publishHint}</span>
      </div>
    </div>
  );
}
