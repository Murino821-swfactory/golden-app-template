"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { AlertTriangle, CalendarClock, CheckCircle2, Info } from "lucide-react";
import { useCopy, useCurrentAgent, useLookups, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import type { WorkspaceCopy } from "@/lib/realestate/copy";
import { addTask, toggleTask } from "@/lib/realestate/actions";
import { formatMoney, formatTime, formatWeekday } from "@/lib/realestate/format";
import { attention, dealsByStage, kpis, viewingsOn, type AttentionItem } from "@/lib/realestate/metrics";
import { fullName, isoDate, type Transaction, type WorkspaceLocale } from "@/lib/realestate/model";
import { localePath } from "@/lib/locale-routing";
import { cn } from "@/lib/utils";
import { Timeline, linkHref, useNow } from "./shared";
import { Bar, KpiTile, PageHeader, Panel, PrimaryButton, STAGE_TONE, Segmented, TextInput } from "./ui";

function attentionText(c: WorkspaceCopy, item: AttentionItem, locale: WorkspaceLocale): string {
  switch (item.kind) {
    case "unansweredDemand": return c.attention.unansweredDemand(item.value, item.subject);
    case "viewingToday": return c.attention.viewingToday(item.subject);
    case "reservationExpiring": return c.attention.reservationExpiring(item.value, item.subject);
    case "amlMissing": return c.attention.amlMissing(item.subject);
    case "energyCertificateMissing": return c.attention.energyCertificateMissing(item.subject);
    case "exclusivityEnding": return c.attention.exclusivityEnding(item.value, item.subject);
    case "leaseEnding": return c.attention.leaseEnding(item.value, item.subject);
    case "rentOverdue": return c.attention.rentOverdue(formatMoney(item.value, locale), item.subject);
    case "consentExpiring": return c.attention.consentExpiring(item.value, item.subject);
    case "staleDeal": return c.attention.staleDeal(item.value, item.subject);
    case "taskOverdue": return c.attention.taskOverdue(item.value, item.subject);
    case "longOnMarket": return c.attention.longOnMarket(item.value, item.subject);
  }
}

function attentionHref(locale: string, item: AttentionItem): string {
  if (item.link.kind === "viewing") return localePath(locale, "/workspace/viewings");
  if (item.link.kind === "task") return localePath(locale, "/workspace/tasks");
  return linkHref(locale, { kind: item.link.kind, id: item.link.id });
}

export function Overview() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const routeLocale = useLocale();
  const now = useNow();
  const agent = useCurrentAgent(ws);
  const lookups = useLookups(ws);
  const agency = ws?.settings.mode === "agency";
  const manager = agent?.role === "owner" || agent?.role === "manager";
  const [scope, setScope] = useState<"mine" | "all">(agency && manager ? "all" : "mine");
  const [task, setTask] = useState("");
  const agentId = scope === "mine" || !agency ? agent?.id ?? null : null;
  const k = useMemo(() => (ws ? kpis(ws, now, agentId) : null), [ws, now, agentId]);
  const items = useMemo(() => (ws ? attention(ws, now, agentId, fullName) : []), [ws, now, agentId]);
  const today = isoDate(now);
  const viewings = useMemo(() => (ws ? viewingsOn(ws, today).filter((v) => !agentId || v.agentId === agentId) : []), [ws, today, agentId]);
  const tasks = useMemo(() => (ws ? ws.tasks.filter((t) => !t.done && t.due <= today && (!agentId || t.agentId === agentId)).sort((a, b) => a.due.localeCompare(b.due)) : []), [ws, today, agentId]);
  const stages = useMemo(() => (ws ? (["sale", "rent"] as Transaction[]).map((t) => ({ transaction: t, rows: dealsByStage(ws, t) })) : []), [ws]);
  if (!ws || !k || !agent) return null;

  const title = scope === "all" ? ws.settings.agencyName : `${agent.firstName} ${agent.lastName}`;
  const maxStage = Math.max(1, ...stages.flatMap((s) => s.rows.map((r) => r.count)));
  const Icon = ({ tone }: { tone: AttentionItem["tone"] }) => (tone === "bad" ? <AlertTriangle aria-hidden className="size-4 shrink-0 text-rose-300" /> : tone === "warn" ? <AlertTriangle aria-hidden className="size-4 shrink-0 text-amber-300" /> : <Info aria-hidden className="size-4 shrink-0 text-sky-300" />);

  return (
    <div className="space-y-6">
      <PageHeader title={c.overview.title} intro={c.overview.intro(title, formatWeekday(today, locale))} actions={agency ? <Segmented label={c.overview.title} value={scope} onChange={setScope} options={[{ value: "mine", label: c.overview.scopeMine }, { value: "all", label: c.overview.scopeAll }]} /> : undefined} />

      <div data-testid="overview-kpis" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiTile label={c.overview.kpi.activeListings} value={k.activeListings} hint={c.overview.kpiHint.activeListings} />
        <KpiTile label={c.overview.kpi.newDemands7d} value={k.newDemands7d} hint={c.overview.kpiHint.newDemands7d} tone={k.newDemands7d > 0 ? "good" : "neutral"} />
        <KpiTile label={c.overview.kpi.viewingsThisWeek} value={k.viewingsThisWeek} hint={c.overview.kpiHint.viewingsThisWeek} />
        <KpiTile label={c.overview.kpi.openDeals} value={k.openDeals} hint={c.overview.kpiHint.openDeals} />
        <KpiTile label={c.overview.kpi.pipelineCommission} value={formatMoney(k.pipelineCommission, locale)} hint={c.overview.kpiHint.pipelineCommission} tone="good" />
        <KpiTile label={c.overview.kpi.tasksDueToday} value={k.tasksDueToday} hint={c.overview.kpiHint.tasksDueToday} tone={k.tasksDueToday > 0 ? "warn" : "neutral"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Panel title={c.attention.heading} testId="attention-list">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{c.attention.empty}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((item, i) => (
                <li key={`${item.kind}-${item.link.id}-${i}`}>
                  <Link href={attentionHref(routeLocale, item)} className="flex min-h-11 items-center gap-3 py-2 text-sm hover:underline underline-offset-4">
                    <Icon tone={item.tone} />
                    <span className="min-w-0 flex-1">{attentionText(c, item, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title={c.overview.agenda} testId="today-agenda">
            {viewings.length === 0 && tasks.length === 0 && <p className="text-sm text-muted-foreground">{c.overview.agendaEmpty}</p>}
            <ul className="space-y-2">
              {viewings.map((v) => {
                const p = lookups.property(v.propertyId);
                const x = lookups.contact(v.contactId);
                return (
                  <li key={v.id} className="flex items-start gap-3 text-sm">
                    <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-sky-300" />
                    <span className="min-w-0">
                      <span className="font-medium tabular-nums">{formatTime(v.start, locale)}</span> · {p?.title}
                      <span className="block text-xs text-muted-foreground">{c.viewings.with} {x ? fullName(x) : ""}</span>
                    </span>
                  </li>
                );
              })}
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-3 text-sm">
                  <button type="button" onClick={() => toggleTask(t.id)} aria-label={c.tasks.markDone} className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-foreground/30 hover:bg-foreground hover:text-background">
                    <CheckCircle2 aria-hidden className="size-4 opacity-0 hover:opacity-100" />
                  </button>
                  <span className={cn("min-w-0", t.due < today && "text-rose-200")}>{t.title}</span>
                </li>
              ))}
            </ul>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!task.trim()) return;
                addTask({ title: task.trim(), due: today, priority: "normal", agentId: agent.id, link: null });
                setTask("");
              }}
            >
              <TextInput aria-label={c.overview.quickTask} value={task} onChange={(e) => setTask(e.target.value)} placeholder={c.overview.quickTaskPlaceholder} />
              <PrimaryButton type="submit" disabled={!task.trim()}>{c.common.add}</PrimaryButton>
            </form>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={c.overview.pipeline} hint={c.overview.pipelineHint} actions={<Link href={localePath(routeLocale, "/workspace/deals")} className="text-sm text-muted-foreground underline-offset-4 hover:underline">{c.overview.viewAll}</Link>}>
          <div className="space-y-5">
            {stages.map(({ transaction, rows }) => (
              <div key={transaction} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.transaction[transaction]}</p>
                {rows.map((r) => (
                  <Bar key={r.stage} label={c.stage[r.stage]} value={r.count} max={maxStage} meta={`${r.count} · ${formatMoney(r.weighted, locale)}`} tone={STAGE_TONE[r.stage]} />
                ))}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={c.overview.recent}>
          <Timeline activities={ws.activities.slice(0, 8)} link={null} compact />
        </Panel>
      </div>
    </div>
  );
}
