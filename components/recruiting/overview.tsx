"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { useCopy, useLookups, useWorkspace } from "@/hooks/use-workspace";
import { localePath } from "@/lib/locale-routing";
import { addTask, toggleTask } from "@/lib/recruiting/actions";
import { STAGES, daysBetween, fullName, isoDate } from "@/lib/recruiting/model";
import { attention, formatDate, formatDateTime, formatMoney, kpis, openApplications, stageCounts } from "@/lib/recruiting/metrics";
import { cn } from "@/lib/utils";
import { Bar, EmptyState, KpiTile, PageHeader, Panel, Pill, PrimaryButton, STAGE_TONE, TextInput } from "./ui";
import { useNow } from "./shared";

export function OverviewView() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useLocale();
  const now = useNow();
  const lookups = useLookups(ws);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");

  const k = useMemo(() => (ws ? kpis(ws, now) : null), [ws, now]);
  const att = useMemo(() => (ws ? attention(ws, now) : null), [ws, now]);
  const counts = useMemo(() => (ws ? stageCounts(openApplications(ws)) : null), [ws]);
  const tasks = useMemo(() => {
    if (!ws) return [];
    const openTasks = ws.tasks.filter((t) => !t.done).sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
    const done = ws.tasks.filter((t) => t.done).slice(0, 3);
    return [...openTasks, ...done];
  }, [ws]);
  const upcoming = useMemo(
    () => (ws ? ws.interviews.filter((i) => i.status === "scheduled" && new Date(i.scheduledAt).getTime() >= now.getTime() - 3600_000).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 5) : []),
    [ws, now]
  );
  const recent = useMemo(() => (ws ? ws.activities.slice(0, 8) : []), [ws]);

  if (!ws || !k || !att || !counts) return null;
  const today = isoDate(now);
  const money = (n: number) => formatMoney(n, ws.settings.currency, locale);
  const maxStage = Math.max(1, ...STAGES.map((s) => counts[s]));

  const attentionItems: { key: string; text: string; href: string; tone: "warn" | "bad" | "info" }[] = [];
  if (att.interviewsToday.length) attentionItems.push({ key: "today", text: c.overview.attention.interviewsToday(att.interviewsToday.length), href: localePath(locale, "/workspace/interviews"), tone: "info" });
  if (att.overdueTasks.length) attentionItems.push({ key: "tasks", text: c.overview.attention.overdueTasks(att.overdueTasks.length), href: "#tasks", tone: "bad" });
  if (att.stale.length) attentionItems.push({ key: "stale", text: c.overview.attention.stale(att.stale.length), href: localePath(locale, "/workspace/pipeline"), tone: "warn" });
  if (att.deadlines.length) attentionItems.push({ key: "deadlines", text: c.overview.attention.deadlines(att.deadlines.length), href: `${localePath(locale, "/workspace/jobs")}?id=${att.deadlines[0]}`, tone: "warn" });
  if (att.consentExpired.length) attentionItems.push({ key: "expired", text: c.overview.attention.consentExpired(att.consentExpired.length), href: `${localePath(locale, "/workspace/candidates")}?id=${att.consentExpired[0]}`, tone: "bad" });
  if (att.consentExpiring.length) attentionItems.push({ key: "expiring", text: c.overview.attention.consentExpiring(att.consentExpiring.length), href: `${localePath(locale, "/workspace/candidates")}?id=${att.consentExpiring[0]}`, tone: "warn" });
  if (att.unscored.length) attentionItems.push({ key: "unscored", text: c.overview.attention.unscored(att.unscored.length), href: `${localePath(locale, "/workspace/pipeline")}?app=${att.unscored[0]!.id}`, tone: "info" });

  return (
    <div className="space-y-6">
      <PageHeader title={c.overview.greeting(ws.settings.agencyName)} intro={formatDate(today, locale)} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="overview-kpis">
        <KpiTile label={c.overview.kpis.openJobs} value={k.openJobs} />
        <KpiTile label={c.overview.kpis.activeCandidates} value={k.activeCandidates} />
        <KpiTile label={c.overview.kpis.interviewsThisWeek} value={k.interviewsThisWeek} tone={k.interviewsThisWeek > 0 ? "warn" : "neutral"} />
        <KpiTile label={c.overview.kpis.placementsYtd} value={k.placementsYtd} tone="good" hint={money(k.feesYtd)} />
        <KpiTile label={c.overview.kpis.pipelineValue} value={money(k.pipelineValue)} hint={c.reports.pipelineValue.hint} />
        <KpiTile label={c.overview.kpis.avgTimeToFill} value={k.avgTimeToFill === null ? c.common.none : c.common.days(k.avgTimeToFill)} />
        <Panel className="sm:col-span-2" title={c.overview.funnel.title} hint={c.overview.funnel.hint}>
          <div className="space-y-2.5">
            {STAGES.filter((s) => s !== "placed").map((stage) => (
              <Bar key={stage} label={c.stages[stage]} value={counts[stage]} max={maxStage} meta={String(counts[stage])} tone={STAGE_TONE[stage] === "neutral" ? "accent" : STAGE_TONE[stage]} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={c.overview.attention.title} className="lg:col-span-2">
          {attentionItems.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 aria-hidden className="size-4 text-emerald-400" /> {c.overview.attention.none}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {attentionItems.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="flex min-h-11 items-center gap-3 py-2 text-sm hover:underline">
                    <AlertTriangle aria-hidden className={cn("size-4 shrink-0", item.tone === "bad" ? "text-rose-400" : item.tone === "warn" ? "text-amber-400" : "text-sky-400")} />
                    <span>{item.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={c.overview.upcoming.title}>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">{c.overview.upcoming.empty}</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((i) => {
                const app = lookups.application(i.applicationId);
                const cand = app && lookups.candidate(app.candidateId);
                const job = app && lookups.job(app.jobId);
                return (
                  <li key={i.id} className="text-sm">
                    <Link href={localePath(locale, "/workspace/interviews")} className="block hover:underline">
                      <span className="font-medium">{cand ? fullName(cand) : "?"}</span>
                      <span className="text-muted-foreground"> · {job?.title ?? "?"}</span>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(i.scheduledAt, locale)} · {c.interviewType[i.type]}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel id="tasks" title={c.overview.tasks.title}>
          <form
            className="mb-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!taskTitle.trim()) return;
              addTask({ title: taskTitle.trim(), dueAt: taskDue || null, candidateId: null, jobId: null });
              setTaskTitle("");
              setTaskDue("");
            }}
          >
            <TextInput aria-label={c.overview.tasks.add} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder={c.overview.tasks.placeholder} className="flex-1" />
            <TextInput aria-label={c.overview.tasks.due} type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="sm:w-44" />
            <PrimaryButton type="submit" disabled={!taskTitle.trim()}>
              <Plus aria-hidden /> {c.common.add}
            </PrimaryButton>
          </form>
          {tasks.length === 0 ? (
            <EmptyState title={c.overview.tasks.empty} />
          ) : (
            <ul className="divide-y divide-border">
              {tasks.map((t) => {
                const overdue = !t.done && t.dueAt && t.dueAt < today;
                const cand = t.candidateId ? lookups.candidate(t.candidateId) : undefined;
                const job = t.jobId ? lookups.job(t.jobId) : undefined;
                return (
                  <li key={t.id} className="flex items-start gap-3 py-2.5">
                    <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} aria-label={t.done ? c.overview.tasks.reopen : c.overview.tasks.done} className="mt-1 size-4 accent-[var(--foreground)]" />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", t.done && "text-muted-foreground line-through")}>{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.dueAt && (
                          <span className={cn(overdue && "text-rose-300")}>
                            {overdue ? c.common.overdueBy(daysBetween(t.dueAt, today)) : c.common.inDays(daysBetween(today, t.dueAt))}
                          </span>
                        )}
                        {(cand || job) && <span> · {[cand ? fullName(cand) : null, job?.title].filter(Boolean).join(" · ")}</span>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title={c.overview.activity.title}>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{c.overview.activity.empty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((a) => {
                const cand = a.candidateId ? lookups.candidate(a.candidateId) : undefined;
                return (
                  <li key={a.id} className="py-2.5 text-sm">
                    <p className="leading-snug">{a.text}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <Pill tone="neutral">{c.activityType[a.type]}</Pill>
                      {cand && <span>{fullName(cand)}</span>}
                      <span>{formatDateTime(a.at, locale)}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
