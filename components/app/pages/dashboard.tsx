"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { useResearchServices } from "@/components/law-expert/services";
import type { SavedResearch } from "@/lib/law-expert/saved";
import { appCopy, asLocale } from "@/lib/legal/copy";
import { addDays, daysBetween, todayIso } from "@/lib/legal/dates";
import { daysLeft, deadlineUrgency } from "@/lib/legal/deadlines";
import { receivables, utilisation, workInProgress } from "@/lib/legal/billing";
import { formatDate, formatMinutes, percent } from "@/lib/legal/format";
import { formatEur } from "@/lib/legal/tariff";
import { useWorkspace } from "@/lib/legal/store";
import { localePath } from "@/lib/locale-routing";
import { NAV_ROUTES } from "../shell";
import { Avatar, Badge, Empty, Notice, Panel, Progress, Row, Stat } from "../ui";

type AgendaItem = { key: string; date: string; time?: string; kind: "hearing" | "deadline" | "task"; label: string; title: string; subtitle: string; href: string; tone: "neutral" | "danger" | "accent" };

function RecentResearch({ locale }: { locale: "sk" | "en" }) {
  const copy = appCopy(locale);
  const { store } = useResearchServices();
  const [rows, setRows] = useState<SavedResearch[] | null>(null);
  useEffect(() => {
    let live = true;
    store.list().then((r) => live && setRows(r.slice(0, 3))).catch(() => live && setRows([]));
    return () => { live = false; };
  }, [store]);
  return (
    <Panel title={copy.dashboard.research} action={<Button asChild variant="outline" size="sm"><Link href={localePath(locale, NAV_ROUTES.research)}>{copy.dashboard.researchOpen}</Link></Button>}>
      <p className="mb-3 text-xs text-muted-foreground">{copy.dashboard.researchHint}</p>
      {rows === null ? <p className="text-sm text-muted-foreground">{copy.common.loading}</p>
        : rows.length === 0 ? <Empty>{copy.dashboard.researchEmpty}</Empty>
        : <ul className="space-y-2">{rows.map((r) => (
          <li key={r.id}>
            <Row href={`${localePath(locale, NAV_ROUTES.research)}?tab=archive&open=${encodeURIComponent(r.id)}`}>
              <span className="block truncate font-medium">{r.title}</span>
              <span className="text-xs text-muted-foreground">{formatDate(r.snapshot.searchedAt.slice(0, 10), locale)} · {(r.snapshot.search?.items ?? r.snapshot.memo?.sources ?? []).length} {locale === "sk" ? "rozhodnutí" : "decisions"}</span>
            </Row>
          </li>
        ))}</ul>}
    </Panel>
  );
}

export function DashboardPage() {
  const locale = asLocale(useLocale());
  const copy = appCopy(locale);
  const { ws, reset } = useWorkspace();
  if (!ws) return <p role="status" className="text-sm text-muted-foreground">{copy.common.loading}</p>;

  const today = todayIso();
  const me = ws.members.find((m) => m.id === ws.currentMemberId) ?? ws.members[0]!;
  const matterOf = (id: string) => ws.matters.find((m) => m.id === id);
  const memberOf = (id: string) => ws.members.find((m) => m.id === id);
  const open = ws.matters.filter((m) => m.stage !== "closed");
  const openDeadlines = ws.deadlines.filter((d) => d.status === "open");
  const overdue = openDeadlines.filter((d) => daysLeft(d, today) < 0);
  const within7 = openDeadlines.filter((d) => { const n = daysLeft(d, today); return n >= 0 && n <= 7; });
  const weekEnd = addDays(today, 6);
  const hearingsWeek = ws.hearings.filter((h) => h.status === "scheduled" && h.kind === "hearing" && h.date >= today && h.date <= weekEnd);
  const wip = workInProgress(ws.timeEntries);
  const aged = receivables(ws.invoices, today);
  const overdueAmount = Math.round((aged.total - aged.current) * 100) / 100;

  const agenda: AgendaItem[] = [
    ...ws.hearings.filter((h) => h.status === "scheduled" && h.date >= today && h.date <= addDays(today, 7)).map((h) => ({
      key: `h${h.id}`, date: h.date, time: h.time, kind: "hearing" as const, label: copy.hearingKinds[h.kind], title: matterOf(h.matterId)?.title ?? "",
      subtitle: `${h.location}${h.room ? `, ${h.room}` : ""}`, href: `${localePath(locale, NAV_ROUTES.hearings)}?id=${h.id}`, tone: h.kind === "hearing" ? ("accent" as const) : ("neutral" as const),
    })),
    ...openDeadlines.filter((d) => { const n = daysLeft(d, today); return n >= 0 && n <= 7; }).map((d) => ({
      key: `d${d.id}`, date: d.dueDate, time: undefined, kind: "deadline" as const, label: copy.calendar.deadline, title: d.title, subtitle: `${matterOf(d.matterId)?.number ?? ""} · ${matterOf(d.matterId)?.title ?? ""}`,
      href: `${localePath(locale, NAV_ROUTES.matters)}?id=${d.matterId}&tab=deadlines`, tone: daysLeft(d, today) === 0 ? ("danger" as const) : ("neutral" as const),
    })),
    ...ws.tasks.filter((t) => t.status !== "done" && t.dueDate >= today && t.dueDate <= addDays(today, 7)).map((t) => ({
      key: `t${t.id}`, date: t.dueDate, time: undefined, kind: "task" as const, label: copy.calendar.task, title: t.title, subtitle: `${memberOf(t.assigneeId)?.name ?? ""}${t.matterId ? ` · ${matterOf(t.matterId)?.number ?? ""}` : ""}`,
      href: t.matterId ? `${localePath(locale, NAV_ROUTES.matters)}?id=${t.matterId}` : localePath(locale, NAV_ROUTES.calendar), tone: "neutral" as const,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99"));

  const atRisk = openDeadlines.filter((d) => daysLeft(d, today) <= 3).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const myTasks = ws.tasks.filter((t) => t.assigneeId === me.id && t.status !== "done").sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
  const workload = ws.kind === "firm" ? utilisation(ws.members.filter((m) => m.capacityHoursWeek > 0), ws.timeEntries, addDays(today, -28), today) : [];
  const stale = daysBetween(ws.seededAt, today) > 21;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{formatDate(today, locale, "long")}</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{copy.dashboard.greeting}, {me.name.replace(/^(Mgr\.|JUDr\.|Ing\.|Bc\.)\s*/u, "").split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">{copy.dashboard.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-11"><Link href={localePath(locale, NAV_ROUTES.research)}>{copy.nav.research}</Link></Button>
          <Button asChild className="h-11"><Link href={`${localePath(locale, NAV_ROUTES.matters)}?new=1`}>{copy.matters.newMatter}</Link></Button>
        </div>
      </header>

      {stale && (
        <Notice tone="accent">
          <span className="mr-3">{copy.product.staleData}</span>
          <Button size="sm" variant="outline" onClick={() => reset(ws.kind)}>{copy.product.refreshData}</Button>
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label={copy.dashboard.openMatters} value={String(open.length)} href={localePath(locale, NAV_ROUTES.matters)} />
        <Stat label={copy.dashboard.deadlines7} value={String(within7.length)} hint={overdue.length ? `${overdue.length} ${copy.dashboard.overdue}` : undefined} tone={overdue.length ? "danger" : "neutral"} href={localePath(locale, NAV_ROUTES.deadlines)} />
        <Stat label={copy.dashboard.hearingsWeek} value={String(hearingsWeek.length)} href={localePath(locale, NAV_ROUTES.hearings)} />
        <Stat label={copy.dashboard.wip} value={formatEur(wip.amount, locale)} hint={`${formatMinutes(wip.minutes)} ${copy.dashboard.wipHint}`} href={localePath(locale, NAV_ROUTES.billing)} />
        <Stat label={copy.dashboard.receivables} value={formatEur(overdueAmount, locale)} hint={copy.dashboard.receivablesHint} tone={overdueAmount > 0 ? "danger" : "neutral"} href={`${localePath(locale, NAV_ROUTES.billing)}?tab=invoices`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <Panel title={copy.dashboard.agenda}>
            {agenda.length === 0 ? <Empty>{copy.dashboard.agendaEmpty}</Empty> : (
              <ol className="space-y-2">
                {agenda.map((it) => (
                  <li key={it.key}>
                    <Row href={it.href}>
                      <div className="flex items-start gap-3">
                        <div className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">
                          <span className="block font-medium text-foreground">{formatDate(it.date, locale, "weekday")}</span>
                          {it.time && <span>{it.time}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{it.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{it.subtitle}</p>
                        </div>
                        <Badge tone={it.tone} className="capitalize">{it.label}</Badge>
                      </div>
                    </Row>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title={copy.dashboard.atRisk} action={<Button asChild variant="ghost" size="sm"><Link href={localePath(locale, NAV_ROUTES.deadlines)}>{copy.common.viewAll}</Link></Button>}>
            {atRisk.length === 0 ? <Empty>{copy.dashboard.atRiskEmpty}</Empty> : (
              <ul className="space-y-2">
                {atRisk.map((d) => {
                  const n = daysLeft(d, today);
                  const urgency = deadlineUrgency(d, today);
                  return (
                    <li key={d.id}>
                      <Row href={`${localePath(locale, NAV_ROUTES.matters)}?id=${d.matterId}&tab=deadlines`}>
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{d.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{matterOf(d.matterId)?.number} · {matterOf(d.matterId)?.title} · {memberOf(d.responsibleId)?.name}</p>
                          </div>
                          <div className="text-right">
                            <Badge tone={urgency === "overdue" || urgency === "today" ? "danger" : "neutral"}>{copy.urgency[urgency]}</Badge>
                            <p className="mt-1 text-xs tabular-nums text-muted-foreground">{formatDate(d.dueDate, locale)} · {n < 0 ? `${-n} ${copy.dashboard.daysOver}` : `${n} ${copy.dashboard.daysLeft}`}</p>
                          </div>
                        </div>
                      </Row>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {ws.kind === "firm" && (
            <Panel title={copy.dashboard.workload} action={<Button asChild variant="ghost" size="sm"><Link href={localePath(locale, NAV_ROUTES.team)}>{copy.nav.team}</Link></Button>}>
              <p className="mb-3 text-xs text-muted-foreground">{copy.dashboard.workloadHint}</p>
              <ul className="space-y-3">
                {workload.map((u) => {
                  const m = memberOf(u.memberId)!;
                  return (
                    <li key={u.memberId} className="flex items-center gap-3 text-sm">
                      <Avatar initials={m.initials} title={m.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2"><span className="truncate font-medium">{m.name}</span><span className="shrink-0 text-xs text-muted-foreground">{formatMinutes(u.billableMinutes)} · {percent(u.utilisation, locale)}</span></div>
                        <Progress value={u.utilisation} label={m.name} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title={copy.dashboard.tasks}>
            {myTasks.length === 0 ? <Empty>{copy.dashboard.tasksEmpty}</Empty> : (
              <ul className="space-y-2">
                {myTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.matterId ? `${matterOf(t.matterId)?.number} · ` : ""}{formatDate(t.dueDate, locale)}</p>
                    </div>
                    <Badge tone={t.dueDate < today ? "danger" : t.priority === "high" ? "accent" : "muted"}>{t.dueDate < today ? copy.urgency.overdue : copy.taskStatus[t.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <RecentResearch locale={locale} />
          <Panel title={copy.dashboard.activity}>
            <ol className="space-y-3">
              {ws.activities.slice(0, 6).map((a) => {
                const m = memberOf(a.memberId);
                return (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <Avatar initials={m?.initials ?? "?"} title={m?.name} />
                    <div className="min-w-0">
                      <p>{a.text}</p>
                      <p className="text-xs text-muted-foreground">{m?.name} · {formatDate(a.at.slice(0, 10), locale)} {a.at.slice(11, 16)}{a.matterId ? ` · ${matterOf(a.matterId)?.number}` : ""}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
