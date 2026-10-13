"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appCopy, asLocale } from "@/lib/legal/copy";
import { addDays, daysInMonth, startOfMonth, todayIso, weekdayMondayFirst } from "@/lib/legal/dates";
import { isNonWorkingDay } from "@/lib/legal/holidays";
import { formatDate, formatMonth } from "@/lib/legal/format";
import { useWorkspace } from "@/lib/legal/store";
import { localePath } from "@/lib/locale-routing";
import { cn } from "@/lib/utils";
import { NAV_ROUTES } from "../shell";
import { Badge, Empty, PageHeader, Panel, Row } from "../ui";

type Item = { key: string; date: string; time?: string; kind: "hearing" | "deadline" | "task"; title: string; subtitle: string; href: string; done?: boolean };

export function CalendarPage() {
  const locale = asLocale(useLocale());
  const copy = appCopy(locale);
  const { ws } = useWorkspace();
  const today = todayIso();
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const items = useMemo<Item[]>(() => {
    if (!ws) return [];
    const matter = (id: string) => ws.matters.find((m) => m.id === id);
    return [
      ...ws.hearings.map((h) => ({ key: `h${h.id}`, date: h.date, time: h.time, kind: "hearing" as const, title: `${copy.hearingKinds[h.kind]} · ${matter(h.matterId)?.title ?? ""}`, subtitle: `${h.location}${h.room ? `, ${h.room}` : ""}`, href: `${localePath(locale, NAV_ROUTES.hearings)}?id=${h.id}`, done: h.status !== "scheduled" })),
      ...ws.deadlines.map((d) => ({ key: `d${d.id}`, date: d.dueDate, time: undefined, kind: "deadline" as const, title: d.title, subtitle: `${matter(d.matterId)?.number ?? ""} · ${matter(d.matterId)?.title ?? ""}`, href: `${localePath(locale, NAV_ROUTES.matters)}?id=${d.matterId}&tab=deadlines`, done: d.status === "done" })),
      ...ws.tasks.map((t) => ({ key: `t${t.id}`, date: t.dueDate, time: undefined, kind: "task" as const, title: t.title, subtitle: ws.members.find((m) => m.id === t.assigneeId)?.name ?? "", href: t.matterId ? `${localePath(locale, NAV_ROUTES.matters)}?id=${t.matterId}` : localePath(locale, NAV_ROUTES.dashboard), done: t.status === "done" })),
    ].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99"));
  }, [ws, copy, locale]);
  if (!ws) return <p role="status" className="text-sm text-muted-foreground">{copy.common.loading}</p>;

  const days = daysInMonth(month);
  const lead = weekdayMondayFirst(month);
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => addDays(month, i))];
  while (cells.length % 7) cells.push(null);
  const byDay = new Map<string, Item[]>();
  for (const it of items) byDay.set(it.date, [...(byDay.get(it.date) ?? []), it]);
  const shift = (n: number) => { const d = new Date(`${month}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); setMonth(d.toISOString().slice(0, 10)); };
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale === "sk" ? "sk-SK" : "en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 5 + i))));
  const kindLabel = { hearing: copy.calendar.hearing, deadline: copy.calendar.deadline, task: copy.calendar.task };
  const kindTone = (k: Item["kind"]): "accent" | "danger" | "muted" => (k === "hearing" ? "accent" : k === "deadline" ? "danger" : "muted");
  const monthItems = items.filter((it) => it.date.startsWith(month.slice(0, 7)));
  const dayItems = byDay.get(selected) ?? [];

  return (
    <div>
      <PageHeader title={copy.calendar.title} intro={copy.calendar.intro} actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-lg" aria-label={copy.calendar.prev} onClick={() => shift(-1)}><ChevronLeft className="size-4" aria-hidden /></Button>
          <span className="min-w-40 text-center font-heading text-base font-semibold capitalize">{formatMonth(month, locale)}</span>
          <Button variant="outline" size="icon-lg" aria-label={copy.calendar.next} onClick={() => shift(1)}><ChevronRight className="size-4" aria-hidden /></Button>
          <Button variant="ghost" size="lg" onClick={() => { setMonth(startOfMonth(today)); setSelected(today); }}>{copy.common.today}</Button>
        </div>
      } />
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{copy.calendar.legend}:</span>{(["hearing", "deadline", "task"] as const).map((k) => <Badge key={k} tone={kindTone(k)}>{kindLabel[k]}</Badge>)}</div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="hidden sm:block">
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{weekdays.map((w) => <div key={w} className="py-1 capitalize">{w}</div>)}</div>
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label={formatMonth(month, locale)}>
            {cells.map((day, i) => day === null ? <div key={`x${i}`} /> : (
              <button
                key={day}
                type="button"
                role="gridcell"
                aria-selected={day === selected}
                onClick={() => setSelected(day)}
                className={cn("flex min-h-20 flex-col gap-1 rounded-lg border p-1.5 text-left text-xs transition-colors hover:bg-muted", day === selected ? "border-primary" : "border-border", isNonWorkingDay(day) && "bg-muted/40", day === today && "ring-1 ring-primary")}
              >
                <span className={cn("tabular-nums", day === today && "font-semibold")}>{Number(day.slice(8))}</span>
                {(byDay.get(day) ?? []).slice(0, 3).map((it) => <span key={it.key} className={cn("truncate rounded px-1 py-0.5", it.kind === "hearing" && "bg-primary text-primary-foreground", it.kind === "deadline" && "border border-destructive/60 text-destructive", it.kind === "task" && "bg-muted text-muted-foreground", it.done && "opacity-50 line-through")}>{it.time ? `${it.time} ` : ""}{it.title}</span>)}
                {(byDay.get(day)?.length ?? 0) > 3 && <span className="text-muted-foreground">+{byDay.get(day)!.length - 3}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <Panel title={`${copy.calendar.dayAgenda} · ${formatDate(selected, locale, "weekday")}`}>
            {dayItems.length === 0 ? <Empty>{copy.calendar.empty}</Empty> : (
              <ul className="space-y-2">{dayItems.map((it) => <li key={it.key}><Row href={it.href}><div className="flex items-center gap-3"><span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">{it.time ?? ""}</span><div className="min-w-0 flex-1"><p className={cn("truncate font-medium", it.done && "text-muted-foreground line-through")}>{it.title}</p><p className="truncate text-xs text-muted-foreground">{it.subtitle}</p></div><Badge tone={kindTone(it.kind)}>{kindLabel[it.kind]}</Badge></div></Row></li>)}</ul>
            )}
          </Panel>
          <Panel title={formatMonth(month, locale)} className="sm:hidden">
            {monthItems.length === 0 ? <Empty>{copy.calendar.empty}</Empty> : (
              <ul className="space-y-2">{monthItems.map((it) => <li key={it.key}><Row href={it.href}><div className="flex items-center gap-3"><span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">{formatDate(it.date, locale, "weekday")}<br />{it.time ?? ""}</span><div className="min-w-0 flex-1"><p className={cn("truncate font-medium", it.done && "line-through")}>{it.title}</p><p className="truncate text-xs text-muted-foreground">{it.subtitle}</p></div><Badge tone={kindTone(it.kind)}>{kindLabel[it.kind]}</Badge></div></Row></li>)}</ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
