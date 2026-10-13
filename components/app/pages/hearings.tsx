"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { ArrowLeft, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appCopy, asLocale, type AppCopy } from "@/lib/legal/copy";
import { todayIso } from "@/lib/legal/dates";
import { formatDate } from "@/lib/legal/format";
import { newId, useWorkspace } from "@/lib/legal/store";
import type { EvidenceItem, Hearing, HearingPrep, Witness } from "@/lib/legal/types";
import { localePath } from "@/lib/locale-routing";
import { cn } from "@/lib/utils";
import { NAV_ROUTES } from "../shell";
import { useQueryParam } from "../use-query-param";
import { Avatar, Badge, Empty, Field, KeyValue, PageHeader, Panel, Progress, Row, Select, Tabs, TextArea, TextInput } from "../ui";

type BinderTab = "checklist" | "chronology" | "evidence" | "witnesses" | "arguments" | "questions";

/** How much of the binder is in place: checklist items done plus evidence filed, equally weighted. */
export function readiness(prep: HearingPrep): number {
  const parts: number[] = [];
  if (prep.checklist.length) parts.push(prep.checklist.filter((c) => c.done).length / prep.checklist.length);
  if (prep.evidence.length) parts.push(prep.evidence.filter((e) => e.status === "filed").length / prep.evidence.length);
  if (!parts.length) return 0;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

function AddForm({ label, onAdd, fields }: { label: string; onAdd: (values: Record<string, string>) => void; fields: { key: string; label: string; type?: "text" | "date" | "textarea"; options?: [string, string][] }[] }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden />{label}</Button>;
  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!fields.filter((f) => !f.options).every((f) => (values[f.key] ?? "").trim() || f.type === "date")) return;
    onAdd(Object.fromEntries(fields.map((f) => [f.key, (values[f.key] ?? f.options?.[0]?.[0] ?? "").trim()])));
    setValues({}); setOpen(false);
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
      {fields.map((f) => (
        <Field key={f.key} label={f.label} className={f.type === "textarea" ? "sm:col-span-2" : undefined}>
          {f.options ? <Select value={values[f.key] ?? f.options[0]![0]} onChange={(e) => set(f.key, e.target.value)}>{f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            : f.type === "textarea" ? <TextArea value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} maxLength={600} required />
            : <TextInput type={f.type ?? "text"} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} maxLength={200} required={f.type !== "date"} />}
        </Field>
      ))}
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>{"✕"}</Button><Button type="submit" className="h-11">{label}</Button></div>
    </form>
  );
}

function Binder({ hearing, copy, locale, onBack }: { hearing: Hearing; copy: AppCopy; locale: "sk" | "en"; onBack: () => void }) {
  const { ws, update } = useWorkspace();
  const [tab, setTab] = useState<BinderTab>("checklist");
  const [outcome, setOutcome] = useState(hearing.note ?? "");
  if (!ws) return null;
  const matter = ws.matters.find((m) => m.id === hearing.matterId);
  const prep = hearing.prep;
  const patchPrep = (p: Partial<HearingPrep>) => update((w) => ({ ...w, hearings: w.hearings.map((h) => h.id === hearing.id ? { ...h, prep: { ...h.prep, ...p } } : h) }));
  const patch = (p: Partial<Hearing>) => update((w) => ({ ...w, hearings: w.hearings.map((h) => h.id === hearing.id ? { ...h, ...p } : h) }));
  const tabs: { id: BinderTab; label: string; count: number }[] = [
    { id: "checklist", label: copy.hearings.checklist, count: prep.checklist.length }, { id: "chronology", label: copy.hearings.chronology, count: prep.chronology.length },
    { id: "evidence", label: copy.hearings.evidence, count: prep.evidence.length }, { id: "witnesses", label: copy.hearings.witnesses, count: prep.witnesses.length },
    { id: "arguments", label: copy.hearings.arguments, count: prep.arguments.length }, { id: "questions", label: copy.hearings.questions, count: prep.questions.length },
  ];
  const evidenceStatusOptions: [EvidenceItem["status"], string][] = (["toFile", "requested", "filed"] as EvidenceItem["status"][]).map((s) => [s, copy.evidenceStatus[s]]);
  const witnessStatusOptions: [Witness["status"], string][] = (["toSummon", "summoned", "confirmed"] as Witness["status"][]).map((s) => [s, copy.witnessStatus[s]]);

  return (
    <div className="space-y-6">
      <div>
        <button type="button" onClick={onBack} className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground print:hidden"><ArrowLeft className="size-4" aria-hidden />{copy.hearings.title}</button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{copy.hearingKinds[hearing.kind]} · {formatDate(hearing.date, locale, "long")} {hearing.time}</p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{matter?.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{matter?.number} · {hearing.location}{hearing.room ? `, ${hearing.room}` : ""}{hearing.judge ? ` · ${hearing.judge}` : ""}</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" className="h-11" onClick={() => window.print()}><Printer className="size-4" aria-hidden />{copy.hearings.printBinder}</Button>
            <Button asChild variant="outline" className="h-11"><a href={`${localePath(locale, NAV_ROUTES.matters)}?id=${hearing.matterId}`}>{copy.common.matter}</a></Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={copy.hearings.readiness}>
          <Progress value={readiness(prep)} label={copy.hearings.readiness} />
          <p className="mt-2 text-xs text-muted-foreground">{prep.checklist.filter((c) => c.done).length}/{prep.checklist.length} {copy.hearings.checklist.toLowerCase()} · {prep.evidence.filter((e) => e.status === "filed").length}/{prep.evidence.length} {copy.hearings.evidence.toLowerCase()} ({copy.evidenceStatus.filed.toLowerCase()})</p>
        </Panel>
        <Panel title={copy.hearings.attendees}>
          <KeyValue items={[
            { label: copy.hearings.attendees, value: <span className="flex flex-wrap gap-1">{hearing.attendeeIds.map((id) => { const m = ws.members.find((x) => x.id === id); return m ? <span key={id} className="inline-flex items-center gap-1"><Avatar initials={m.initials} />{m.name}</span> : null; })}</span> },
            { label: copy.hearings.duration, value: `${hearing.durationMinutes} min` },
            { label: copy.common.status, value: copy.hearingStatus[hearing.status] },
          ]} />
        </Panel>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} label={copy.hearings.binder} />

      {tab === "checklist" && (
        <Panel title={copy.hearings.checklist} action={<AddForm label={copy.hearings.addChecklist} fields={[{ key: "text", label: copy.hearings.addChecklist }]} onAdd={(v) => patchPrep({ checklist: [...prep.checklist, { id: newId("c"), text: v.text!, done: false }] })} />}>
          {prep.checklist.length === 0 ? <Empty>{copy.hearings.noPrep}</Empty> : (
            <ul className="space-y-1">{prep.checklist.map((c) => (
              <li key={c.id}><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={c.done} onChange={(e) => patchPrep({ checklist: prep.checklist.map((x) => x.id === c.id ? { ...x, done: e.target.checked } : x) })} /><span className={cn(c.done && "text-muted-foreground line-through")}>{c.text}</span></label></li>
            ))}</ul>
          )}
        </Panel>
      )}
      {tab === "chronology" && (
        <Panel title={copy.hearings.chronology} action={<AddForm label={copy.hearings.addChronology} fields={[{ key: "date", label: copy.common.date, type: "date" }, { key: "evidenceRef", label: copy.hearings.evidenceRef }, { key: "event", label: copy.hearings.event, type: "textarea" }]} onAdd={(v) => patchPrep({ chronology: [...prep.chronology, { date: v.date || todayIso(), event: v.event!, evidenceRef: v.evidenceRef || undefined }].sort((a, b) => a.date.localeCompare(b.date)) })} />}>
          {prep.chronology.length === 0 ? <Empty>{copy.hearings.noPrep}</Empty> : (
            <ol className="relative ml-2 space-y-4 border-l border-border pl-5">{prep.chronology.map((c, i) => (
              <li key={i} className="relative text-sm"><span className="absolute -left-[1.45rem] top-1.5 size-2.5 rounded-full border border-primary bg-background" aria-hidden /><p className="text-xs tabular-nums text-muted-foreground">{formatDate(c.date, locale)}{c.evidenceRef ? ` · ${copy.hearings.evidenceRef}: ${c.evidenceRef}` : ""}</p><p>{c.event}</p></li>
            ))}</ol>
          )}
        </Panel>
      )}
      {tab === "evidence" && (
        <Panel title={copy.hearings.evidence} action={<AddForm label={copy.hearings.addEvidence} fields={[{ key: "label", label: copy.common.title }, { key: "kind", label: copy.common.kind, options: (["document", "witness", "expert", "inspection", "other"] as const).map((k) => [k, copy.evidenceKinds[k]]) }, { key: "status", label: copy.common.status, options: evidenceStatusOptions }]} onAdd={(v) => patchPrep({ evidence: [...prep.evidence, { id: `D${prep.evidence.length + 1}`, label: v.label!, kind: v.kind as EvidenceItem["kind"], status: v.status as EvidenceItem["status"] }] })} />}>
          {prep.evidence.length === 0 ? <Empty>{copy.hearings.noPrep}</Empty> : (
            <ul className="space-y-2">{prep.evidence.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
                <Badge tone="muted">{e.id}</Badge><span className="min-w-0 flex-1"><span className="block font-medium">{e.label}</span><span className="text-xs text-muted-foreground">{copy.evidenceKinds[e.kind]}{e.note ? ` · ${e.note}` : ""}</span></span>
                <Select aria-label={copy.common.status} value={e.status} onChange={(ev) => patchPrep({ evidence: prep.evidence.map((x) => x.id === e.id ? { ...x, status: ev.target.value as EvidenceItem["status"] } : x) })} className="h-9 w-auto text-xs">{evidenceStatusOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
              </li>
            ))}</ul>
          )}
        </Panel>
      )}
      {tab === "witnesses" && (
        <Panel title={copy.hearings.witnesses} action={<AddForm label={copy.hearings.addWitness} fields={[{ key: "name", label: copy.common.name }, { key: "side", label: copy.hearings.side, options: (["ours", "theirs", "court"] as const).map((s) => [s, copy.witnessSide[s]]) }, { key: "status", label: copy.common.status, options: witnessStatusOptions }, { key: "topic", label: copy.hearings.topic, type: "textarea" }]} onAdd={(v) => patchPrep({ witnesses: [...prep.witnesses, { name: v.name!, side: v.side as Witness["side"], topic: v.topic!, status: v.status as Witness["status"] }] })} />}>
          {prep.witnesses.length === 0 ? <Empty>{copy.hearings.noPrep}</Empty> : (
            <ul className="space-y-2">{prep.witnesses.map((w, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
                <span className="min-w-0 flex-1"><span className="block font-medium">{w.name}</span><span className="text-xs text-muted-foreground">{copy.witnessSide[w.side]} · {w.topic}</span></span>
                <Select aria-label={copy.common.status} value={w.status} onChange={(ev) => patchPrep({ witnesses: prep.witnesses.map((x, j) => j === i ? { ...x, status: ev.target.value as Witness["status"] } : x) })} className="h-9 w-auto text-xs">{witnessStatusOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
              </li>
            ))}</ul>
          )}
        </Panel>
      )}
      {tab === "arguments" && (
        <Panel title={copy.hearings.arguments} action={<AddForm label={copy.hearings.addArgument} fields={[{ key: "claim", label: copy.hearings.claim, type: "textarea" }, { key: "support", label: copy.hearings.support }, { key: "risk", label: copy.hearings.riskLabel }]} onAdd={(v) => patchPrep({ arguments: [...prep.arguments, { claim: v.claim!, support: v.support!, risk: v.risk! }] })} />}>
          {prep.arguments.length === 0 ? <Empty>{copy.hearings.noPrep}</Empty> : (
            <ol className="space-y-3">{prep.arguments.map((a, i) => (
              <li key={i} className="rounded-lg border border-border p-3 text-sm"><p className="font-medium"><span className="mr-2 tabular-nums text-muted-foreground">{i + 1}.</span>{a.claim}</p><p className="mt-1 text-xs"><span className="text-muted-foreground">{copy.hearings.support}: </span>{a.support}</p><p className="mt-1 text-xs"><span className="text-muted-foreground">{copy.hearings.riskLabel}: </span>{a.risk}</p></li>
            ))}</ol>
          )}
        </Panel>
      )}
      {tab === "questions" && (
        <Panel title={copy.hearings.questions} action={<AddForm label={copy.hearings.addQuestion} fields={[{ key: "q", label: copy.hearings.question, type: "textarea" }]} onAdd={(v) => patchPrep({ questions: [...prep.questions, v.q!] })} />}>
          {prep.questions.length === 0 ? <Empty>{copy.hearings.noPrep}</Empty> : <ol className="list-decimal space-y-2 pl-5 text-sm">{prep.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>}
        </Panel>
      )}

      <Panel title={copy.hearings.recordOutcome} className="print:hidden">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); patch({ note: outcome.trim() || undefined }); }}>
          <Field label={copy.common.status}><Select value={hearing.status} onChange={(e) => patch({ status: e.target.value as Hearing["status"] })}>{(["scheduled", "done", "adjourned"] as const).map((s) => <option key={s} value={s}>{copy.hearingStatus[s]}</option>)}</Select></Field>
          <Field label={copy.hearings.outcomeNote}><TextInput value={outcome} onChange={(e) => setOutcome(e.target.value)} maxLength={300} /></Field>
          <Button type="submit" className="h-11">{copy.common.save}</Button>
        </form>
      </Panel>
    </div>
  );
}

export function HearingsPage() {
  const locale = asLocale(useLocale());
  const copy = appCopy(locale);
  const { ws } = useWorkspace();
  const [id, setId] = useQueryParam("id");
  if (!ws) return <p role="status" className="text-sm text-muted-foreground">{copy.common.loading}</p>;
  const current = id ? ws.hearings.find((h) => h.id === id) : undefined;
  if (current) return <Binder hearing={current} copy={copy} locale={locale} onBack={() => setId(null)} />;
  const today = todayIso();
  const matter = (mid: string) => ws.matters.find((m) => m.id === mid);
  const upcoming = ws.hearings.filter((h) => h.status === "scheduled" && h.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const past = ws.hearings.filter((h) => !(h.status === "scheduled" && h.date >= today)).sort((a, b) => b.date.localeCompare(a.date));
  const row = (h: Hearing) => (
    <li key={h.id}><Row onClick={() => setId(h.id)}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground"><span className="block font-medium text-foreground">{formatDate(h.date, locale, "weekday")}</span>{h.time}</div>
        <div className="min-w-0 flex-1"><p className="truncate font-medium">{matter(h.matterId)?.title}</p><p className="truncate text-xs text-muted-foreground">{copy.hearingKinds[h.kind]} · {h.location}{h.room ? `, ${h.room}` : ""}{h.judge ? ` · ${h.judge}` : ""}</p></div>
        <div className="flex items-center gap-2"><div className="hidden w-28 sm:block"><Progress value={readiness(h.prep)} label={copy.hearings.readiness} /></div><Badge tone={h.status === "scheduled" ? (h.kind === "hearing" ? "accent" : "neutral") : "muted"}>{h.status === "scheduled" ? copy.hearingKinds[h.kind] : copy.hearingStatus[h.status]}</Badge></div>
      </div>
    </Row></li>
  );
  return (
    <div className="space-y-6">
      <PageHeader title={copy.hearings.title} intro={copy.hearings.intro} />
      <Panel title={copy.hearings.upcoming}>{upcoming.length === 0 ? <Empty>{copy.hearings.empty}</Empty> : <ul className="space-y-2">{upcoming.map(row)}</ul>}</Panel>
      <Panel title={copy.hearings.past}>{past.length === 0 ? <Empty>{copy.hearings.empty}</Empty> : <ul className="space-y-2">{past.map(row)}</ul>}</Panel>
    </div>
  );
}
