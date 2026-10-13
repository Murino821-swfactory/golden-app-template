"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { appCopy, asLocale } from "@/lib/legal/copy";
import { todayIso } from "@/lib/legal/dates";
import { computeDeadline, daysLeft, deadlineUrgency, DEADLINE_RULES, isValidIsoDate } from "@/lib/legal/deadlines";
import { formatDate } from "@/lib/legal/format";
import { newId, useWorkspace } from "@/lib/legal/store";
import type { DeadlinePreset, DeadlineUnit } from "@/lib/legal/types";
import { localePath } from "@/lib/locale-routing";
import { cn } from "@/lib/utils";
import { NAV_ROUTES } from "../shell";
import { Badge, Empty, Field, Notice, PageHeader, Panel, Row, Select, TextInput } from "../ui";

const PRESETS = Object.keys(DEADLINE_RULES) as (keyof typeof DEADLINE_RULES)[];
const UNITS: DeadlineUnit[] = ["days", "workingDays", "weeks", "months", "years"];

export function DeadlinesPage() {
  const locale = asLocale(useLocale());
  const copy = appCopy(locale);
  const { ws, update } = useWorkspace();
  const today = todayIso();
  const [showDone, setShowDone] = useState(false);
  const [preset, setPreset] = useState<DeadlinePreset>("appealCsp");
  const [startDate, setStartDate] = useState(today);
  const [amount, setAmount] = useState(15);
  const [unit, setUnit] = useState<DeadlineUnit>("days");
  const [matterId, setMatterId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState(false);
  if (!ws) return <p role="status" className="text-sm text-muted-foreground">{copy.common.loading}</p>;
  const rule = preset === "custom" ? { amount, unit } : DEADLINE_RULES[preset];
  const computed = isValidIsoDate(startDate) && rule.amount >= 1 ? computeDeadline(startDate, rule.amount, rule.unit) : null;
  const rows = ws.deadlines.filter((d) => showDone || d.status === "open").sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || a.dueDate.localeCompare(b.dueDate));
  const matter = (id: string) => ws.matters.find((m) => m.id === id);
  const member = (id: string) => ws.members.find((m) => m.id === id);
  const openMatters = ws.matters.filter((m) => m.stage !== "closed");
  const chosenMatter = matterId || openMatters[0]?.id || "";
  const chosenResponsible = responsibleId || matter(chosenMatter)?.leadId || ws.currentMemberId;

  return (
    <div>
      <PageHeader title={copy.deadlines.title} intro={copy.deadlines.intro} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={copy.deadlines.title} action={<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />{copy.deadlines.showDone}</label>}>
          {rows.length === 0 ? <Empty>{copy.deadlines.empty}</Empty> : (
            <ul className="space-y-2">{rows.map((d) => {
              const urgency = deadlineUrgency(d, today);
              const n = daysLeft(d, today);
              const m = matter(d.matterId);
              return (
                <li key={d.id}>
                  <Row href={`${localePath(locale, NAV_ROUTES.matters)}?id=${d.matterId}&tab=deadlines`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-medium", d.status === "done" && "text-muted-foreground line-through")}>{d.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{m?.number} · {m?.title} · {member(d.responsibleId)?.name}</p>
                        <p className="text-xs text-muted-foreground">{copy.deadlinePresets[d.preset]}{d.preset !== "custom" ? ` · ${DEADLINE_RULES[d.preset].source}` : ""} · {formatDate(d.startDate, locale)} → {formatDate(d.dueDate, locale)}{d.shifted ? ` · ${copy.deadlines.shiftedYes}` : ""}</p>
                      </div>
                      <div className="text-right">
                        <Badge tone={urgency === "overdue" || urgency === "today" ? "danger" : urgency === "soon" ? "accent" : "muted"}>{copy.urgency[urgency]}</Badge>
                        {d.status === "open" && <p className="mt-1 text-xs tabular-nums text-muted-foreground">{n < 0 ? `${-n} ${copy.dashboard.daysOver}` : `${n} ${copy.dashboard.daysLeft}`}</p>}
                      </div>
                    </div>
                  </Row>
                  <div className="-mt-1 flex justify-end"><Button size="sm" variant="ghost" onClick={() => update((w) => ({ ...w, deadlines: w.deadlines.map((x) => x.id === d.id ? { ...x, status: x.status === "open" ? "done" : "open" } : x) }))}>{d.status === "open" ? copy.matters.markDone : copy.matters.reopen}</Button></div>
                </li>
              );
            })}</ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title={copy.deadlines.calculator} id="calculator">
            <p className="mb-3 text-xs text-muted-foreground">{copy.deadlines.calculatorHint}</p>
            <div className="grid grid-cols-1 gap-3">
              <Field label={copy.deadlines.preset}><Select value={preset} onChange={(e) => setPreset(e.target.value as DeadlinePreset)}>{[...PRESETS, "custom" as const].map((p) => <option key={p} value={p}>{copy.deadlinePresets[p]}</option>)}</Select></Field>
              <Field label={copy.common.startDate} hint={copy.deadlines.startDateHint}><TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
              {preset === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={copy.deadlines.amount}><TextInput type="number" min={1} max={3650} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
                  <Field label={copy.deadlines.unit}><Select value={unit} onChange={(e) => setUnit(e.target.value as DeadlineUnit)}>{UNITS.map((u) => <option key={u} value={u}>{copy.deadlineUnits[u]}</option>)}</Select></Field>
                </div>
              )}
              <div aria-live="polite" className="rounded-lg border border-primary/60 bg-primary/10 p-3 text-sm">
                {computed ? (
                  <>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.deadlines.result}</p>
                    <p className="font-heading text-2xl font-semibold tabular-nums" data-deadline-result>{formatDate(computed.dueDate, locale, "weekday")}</p>
                    <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div><dt className="inline">{copy.deadlines.rawEnd}: </dt><dd className="inline tabular-nums">{formatDate(computed.rawEnd, locale, "weekday")} — {computed.shifted ? copy.deadlines.shiftedYes : copy.deadlines.shiftedNo}</dd></div>
                      <div><dt className="inline">{copy.deadlines.legal}: </dt><dd className="inline">{rule.amount} {copy.deadlineUnits[rule.unit]}{preset !== "custom" ? ` · ${DEADLINE_RULES[preset].source}` : ""}</dd></div>
                    </dl>
                  </>
                ) : <p>{copy.common.required}: {copy.common.startDate}</p>}
              </div>
              <form className="grid grid-cols-1 gap-3 border-t border-border pt-3" onSubmit={(e) => {
                e.preventDefault();
                if (!computed || !chosenMatter) return;
                update((w) => ({ ...w, deadlines: [{ id: newId("l"), matterId: chosenMatter, title: title.trim() || copy.deadlinePresets[preset], preset, startDate, amount: rule.amount, unit: rule.unit, dueDate: computed.dueDate, shifted: computed.shifted, responsibleId: chosenResponsible, status: "open" as const }, ...w.deadlines] }));
                setTitle(""); setSaved(true); setTimeout(() => setSaved(false), 2500);
              }}>
                <Field label={copy.common.matter}><Select value={chosenMatter} onChange={(e) => { setMatterId(e.target.value); setResponsibleId(""); }}>{openMatters.map((m) => <option key={m.id} value={m.id}>{m.number} · {m.title}</option>)}</Select></Field>
                <Field label={copy.deadlines.responsible}><Select value={chosenResponsible} onChange={(e) => setResponsibleId(e.target.value)}>{ws.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
                <Field label={copy.common.title}><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={copy.deadlinePresets[preset]} maxLength={140} /></Field>
                <Button type="submit" className="h-11" disabled={!computed || !chosenMatter}>{copy.deadlines.saveToMatter}</Button>
                {saved && <Notice tone="accent">{copy.common.saved}</Notice>}
              </form>
            </div>
          </Panel>
          <Notice>{copy.deadlines.disclaimer}</Notice>
        </div>
      </div>
    </div>
  );
}
