"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useResearchServices } from "@/components/law-expert/services";
import type { SavedResearch } from "@/lib/law-expert/saved";
import { appCopy, asLocale, type AppCopy } from "@/lib/legal/copy";
import { todayIso } from "@/lib/legal/dates";
import { computeDeadline, daysLeft, deadlineUrgency, DEADLINE_RULES, isValidIsoDate } from "@/lib/legal/deadlines";
import { entryAmount, workInProgress } from "@/lib/legal/billing";
import { conflictLevel, findConflicts } from "@/lib/legal/conflicts";
import { formatDate, formatMinutes, initialsOf } from "@/lib/legal/format";
import { newId, nextMatterNumber, useWorkspace } from "@/lib/legal/store";
import { formatEur } from "@/lib/legal/tariff";
import type { BillingMode, Client, Deadline, DeadlinePreset, DeadlineUnit, Matter, MatterStage, MatterType, PracticeArea, Workspace } from "@/lib/legal/types";
import { localePath } from "@/lib/locale-routing";
import { cn } from "@/lib/utils";
import { NAV_ROUTES } from "../shell";
import { useQueryParam } from "../use-query-param";
import { TimeEntryForm } from "../forms";
import { Avatar, Badge, Empty, Field, KeyValue, Notice, PageHeader, Panel, Row, Select, Tabs, TextArea, TextInput } from "../ui";

const STAGES: MatterStage[] = ["intake", "analysis", "filed", "hearing", "decision", "appeal", "closed"];
const AREAS: PracticeArea[] = ["civil", "commercial", "criminal", "family", "labour", "administrative", "realEstate", "insolvency"];
const TYPES: MatterType[] = ["litigation", "advisory", "transaction", "criminalDefence", "administrative"];
const PRESETS = Object.keys(DEADLINE_RULES) as (keyof typeof DEADLINE_RULES)[];
const UNITS: DeadlineUnit[] = ["days", "workingDays", "weeks", "months", "years"];

type Tab = "overview" | "deadlines" | "hearings" | "time" | "documents" | "research" | "activity";

function lawyers(ws: Workspace) {
  return ws.members.filter((m) => m.role === "partner" || m.role === "attorney" || m.role === "associate");
}

function stageTone(stage: MatterStage): "neutral" | "accent" | "muted" {
  if (stage === "closed") return "muted";
  if (stage === "hearing" || stage === "appeal") return "accent";
  return "neutral";
}

/** The intake form: client, parties and fees, with the conflict check running as you type. */
function NewMatterDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const copy = appCopy(useLocale());
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent closeLabel={copy.common.close} className="sm:max-w-2xl">
        <DialogTitle>{copy.matters.newMatter}</DialogTitle>
        <DialogDescription>{copy.matters.opponentHint}</DialogDescription>
        {open && <NewMatterForm onClose={onClose} onCreated={onCreated} />}
      </DialogContent>
    </Dialog>
  );
}

function NewMatterForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const locale = asLocale(useLocale());
  const copy = appCopy(locale);
  const { ws, update } = useWorkspace();
  const [title, setTitle] = useState("");
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientId, setClientId] = useState(() => ws?.clients[0]?.id ?? "");
  const [clientName, setClientName] = useState("");
  const [clientType, setClientType] = useState<Client["type"]>("person");
  const [opponent, setOpponent] = useState("");
  const [area, setArea] = useState<PracticeArea>("civil");
  const [type, setType] = useState<MatterType>("litigation");
  const [leadId, setLeadId] = useState(() => (ws && lawyers(ws).some((m) => m.id === ws.currentMemberId) ? ws.currentMemberId : ws ? lawyers(ws)[0]?.id ?? "" : ""));
  const [value, setValue] = useState("");
  const [billing, setBilling] = useState<BillingMode>("hourly");
  const [summary, setSummary] = useState("");
  if (!ws) return null;
  const candidateClient = clientMode === "new" ? clientName : (ws.clients.find((c) => c.id === clientId)?.name ?? "");
  const hits = findConflicts(ws, [clientMode === "new" ? clientName : "", opponent]);
  const level = conflictLevel(hits);
  const ready = title.trim() && candidateClient.trim() && leadId;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || !ws) return;
    const today = todayIso();
    const matterId = newId("k");
    let client = clientMode === "existing" ? ws.clients.find((c) => c.id === clientId)! : undefined;
    const newClient: Client | null = clientMode === "new"
      ? { id: newId("c"), type: clientType, name: clientName.trim(), kyc: "pending", amlRisk: "low", createdAt: today }
      : null;
    if (newClient) client = newClient;
    const parsedValue = value.trim() ? Number(value.replace(/\s/g, "").replace(",", ".")) : undefined;
    const matter: Matter = {
      id: matterId, number: nextMatterNumber(ws, Number(today.slice(0, 4))), title: title.trim(), clientId: client!.id, area, type, stage: "intake", leadId, teamIds: [leadId],
      value: parsedValue && Number.isFinite(parsedValue) ? parsedValue : undefined,
      billing: billing === "hourly" ? { mode: "hourly", hourlyRate: ws.members.find((m) => m.id === leadId)?.hourlyRate ?? ws.settings.defaultHourlyRate } : billing === "flat" ? { mode: "flat", flatFee: 0 } : { mode: "tariff" },
      openedAt: today,
      parties: [{ role: "client", name: client!.name }, ...(opponent.trim() ? [{ role: "opponent" as const, name: opponent.trim() }] : [])],
      tags: [], summary: summary.trim(), researchIds: [],
    };
    const me = ws.members.find((m) => m.id === ws.currentMemberId);
    update((w) => ({
      ...w,
      clients: newClient ? [newClient, ...w.clients] : w.clients,
      matters: [matter, ...w.matters],
      activities: [{ id: newId("a"), at: new Date().toISOString().slice(0, 19), memberId: me?.id ?? leadId, matterId, text: locale === "sk" ? `Založený spis ${matter.number} — kontrola konfliktu: ${level === "none" ? "bez nálezu" : level === "review" ? "nález na preverenie" : "konflikt potvrdený advokátom"}.` : `Matter ${matter.number} opened — conflict check: ${level}.` }, ...w.activities],
    }));
    onCreated(matterId);
  }

  return (
        <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={copy.common.title} className="sm:col-span-2"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} /></Field>
          <Field label={copy.common.client}>
            <Select value={clientMode} onChange={(e) => setClientMode(e.target.value as "existing" | "new")}>
              <option value="existing">{copy.matters.clientExisting}</option>
              <option value="new">{copy.matters.clientNew}</option>
            </Select>
          </Field>
          {clientMode === "existing" ? (
            <Field label={copy.matters.clientExisting}>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>{ws.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            </Field>
          ) : (
            <>
              <Field label={copy.common.name}><TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={120} /></Field>
              <Field label={copy.common.type}>
                <Select value={clientType} onChange={(e) => setClientType(e.target.value as Client["type"])}>
                  <option value="person">{copy.clients.person}</option>
                  <option value="company">{copy.clients.company}</option>
                </Select>
              </Field>
            </>
          )}
          <Field label={copy.matters.opponent} className="sm:col-span-2"><TextInput value={opponent} onChange={(e) => setOpponent(e.target.value)} maxLength={120} /></Field>
          <div className="sm:col-span-2" aria-live="polite">
            <Notice tone={level === "block" ? "danger" : level === "review" ? "accent" : "neutral"}>
              <p className="font-medium">{copy.matters.conflictTitle}</p>
              <p className="mt-1">{level === "none" ? copy.matters.conflictNone : level === "review" ? copy.matters.conflictReview : copy.matters.conflictBlock}</p>
              {hits.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {hits.map((h, i) => <li key={i}>{h.name} — {h.relation === "ourClient" ? copy.matters.conflictOurClient : h.relation === "opponent" ? copy.matters.conflictOpponent : `${copy.matters.conflictOther} (${copy.partyRoles[h.role === "client" ? "client" : h.role]})`} {copy.matters.conflictIn} {h.matterNumber} · {h.matterTitle}</li>)}
                </ul>
              )}
            </Notice>
          </div>
          <Field label={copy.common.area}><Select value={area} onChange={(e) => setArea(e.target.value as PracticeArea)}>{AREAS.map((a) => <option key={a} value={a}>{copy.areas[a]}</option>)}</Select></Field>
          <Field label={copy.common.type}><Select value={type} onChange={(e) => setType(e.target.value as MatterType)}>{TYPES.map((t) => <option key={t} value={t}>{copy.matterTypes[t]}</option>)}</Select></Field>
          <Field label={copy.common.lead}><Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>{lawyers(ws).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
          <Field label={copy.common.billing}><Select value={billing} onChange={(e) => setBilling(e.target.value as BillingMode)}>{(["hourly", "flat", "tariff"] as BillingMode[]).map((b) => <option key={b} value={b}>{copy.billingModes[b]}</option>)}</Select></Field>
          <Field label={`${copy.common.value} (€)`} hint={copy.matters.valueHint}><TextInput inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
          <Field label={copy.common.summary} className="sm:col-span-2"><TextArea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={1000} /></Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" className="h-11" onClick={onClose}>{copy.common.cancel}</Button>
            <Button type="submit" className="h-11" disabled={!ready}>{copy.common.save}</Button>
          </div>
        </form>
  );
}

function AddDeadline({ matter, copy, locale, onAdded }: { matter: Matter; copy: AppCopy; locale: "sk" | "en"; onAdded: () => void }) {
  const { ws, update } = useWorkspace();
  const [preset, setPreset] = useState<DeadlinePreset>("statementCourtSet");
  const [startDate, setStartDate] = useState(todayIso());
  const [amount, setAmount] = useState(15);
  const [unit, setUnit] = useState<DeadlineUnit>("days");
  const [title, setTitle] = useState("");
  const [responsibleId, setResponsibleId] = useState(matter.leadId);
  if (!ws) return null;
  const rule = preset === "custom" ? { amount, unit } : DEADLINE_RULES[preset];
  const valid = isValidIsoDate(startDate) && rule.amount >= 1;
  const computed = valid ? computeDeadline(startDate, rule.amount, rule.unit) : null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!computed) return;
        const d: Deadline = { id: newId("l"), matterId: matter.id, title: title.trim() || copy.deadlinePresets[preset], preset, startDate, amount: rule.amount, unit: rule.unit, dueDate: computed.dueDate, shifted: computed.shifted, responsibleId, status: "open" };
        update((w) => ({ ...w, deadlines: [d, ...w.deadlines] }));
        setTitle("");
        onAdded();
      }}
      className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-2"
    >
      <Field label={copy.deadlines.preset} className="sm:col-span-2"><Select value={preset} onChange={(e) => setPreset(e.target.value as DeadlinePreset)}>{[...PRESETS, "custom" as const].map((p) => <option key={p} value={p}>{copy.deadlinePresets[p]}</option>)}</Select></Field>
      <Field label={copy.common.startDate} hint={copy.deadlines.startDateHint}><TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></Field>
      {preset === "custom" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label={copy.deadlines.amount}><TextInput type="number" min={1} max={3650} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
          <Field label={copy.deadlines.unit}><Select value={unit} onChange={(e) => setUnit(e.target.value as DeadlineUnit)}>{UNITS.map((u) => <option key={u} value={u}>{copy.deadlineUnits[u]}</option>)}</Select></Field>
        </div>
      ) : (
        <Field label={copy.deadlines.source}><p className="flex h-11 items-center text-sm text-muted-foreground">{DEADLINE_RULES[preset].source} · {rule.amount} {copy.deadlineUnits[rule.unit]}</p></Field>
      )}
      <Field label={copy.common.title}><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={copy.deadlinePresets[preset]} maxLength={140} /></Field>
      <Field label={copy.deadlines.responsible}><Select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)}>{ws.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
      <div className="flex items-end justify-between gap-3 sm:col-span-2">
        <p className="text-sm" aria-live="polite" data-deadline-preview>
          {computed && <><span className="text-muted-foreground">{copy.deadlines.result}: </span><strong className="tabular-nums">{formatDate(computed.dueDate, locale, "weekday")}</strong>{computed.shifted && <span className="text-muted-foreground"> · {copy.deadlines.shiftedYes}</span>}</>}
        </p>
        <Button type="submit" className="h-11" disabled={!computed}>{copy.matters.addDeadline}</Button>
      </div>
    </form>
  );
}

function LinkedResearch({ matter, copy, locale }: { matter: Matter; copy: AppCopy; locale: "sk" | "en" }) {
  const { store } = useResearchServices();
  const { update } = useWorkspace();
  const [rows, setRows] = useState<SavedResearch[] | null>(null);
  const [pick, setPick] = useState("");
  useEffect(() => {
    let live = true;
    store.list().then((r) => live && setRows(r)).catch(() => live && setRows([]));
    return () => { live = false; };
  }, [store]);
  const linked = (rows ?? []).filter((r) => matter.researchIds.includes(r.id));
  const free = (rows ?? []).filter((r) => !matter.researchIds.includes(r.id));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild className="h-11"><Link href={`${localePath(locale, NAV_ROUTES.research)}?matter=${matter.id}`}>{copy.matters.researchNew}</Link></Button>
      </div>
      {rows === null ? <p className="text-sm text-muted-foreground">{copy.common.loading}</p> : (
        <>
          <h3 className="text-sm font-medium">{copy.matters.researchLinked}</h3>
          {linked.length === 0 ? <Empty>{copy.matters.researchNone}</Empty> : (
            <ul className="space-y-2">{linked.map((r) => (
              <li key={r.id}><Row href={`${localePath(locale, NAV_ROUTES.research)}?tab=archive&open=${encodeURIComponent(r.id)}`}><span className="block font-medium">{r.title}</span><span className="text-xs text-muted-foreground">{formatDate(r.snapshot.searchedAt.slice(0, 10), locale)}</span></Row></li>
            ))}</ul>
          )}
          {free.length > 0 && (
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (!pick) return; update((w) => ({ ...w, matters: w.matters.map((m) => m.id === matter.id ? { ...m, researchIds: [...m.researchIds, pick] } : m) })); setPick(""); }}>
              <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label={copy.matters.researchLink}>
                <option value="">{copy.matters.researchLink}</option>
                {free.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </Select>
              <Button type="submit" variant="outline" className="h-11" disabled={!pick}>{copy.common.add}</Button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function MatterDetail({ matter, tab, setTab, onBack }: { matter: Matter; tab: Tab; setTab: (t: Tab) => void; onBack: () => void }) {
  const locale = asLocale(useLocale());
  const copy = appCopy(locale);
  const { ws, update } = useWorkspace();
  const [addingDeadline, setAddingDeadline] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);
  if (!ws) return null;
  const today = todayIso();
  const client = ws.clients.find((c) => c.id === matter.clientId);
  const member = (id: string) => ws.members.find((m) => m.id === id);
  const deadlines = ws.deadlines.filter((d) => d.matterId === matter.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const hearings = ws.hearings.filter((h) => h.matterId === matter.id).sort((a, b) => b.date.localeCompare(a.date));
  const entries = ws.timeEntries.filter((e) => e.matterId === matter.id).sort((a, b) => b.date.localeCompare(a.date));
  const docs = ws.documents.filter((d) => d.matterId === matter.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const activity = ws.activities.filter((a) => a.matterId === matter.id);
  const wip = workInProgress(entries);
  const stageIndex = STAGES.indexOf(matter.stage);
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: copy.matters.tabOverview }, { id: "deadlines", label: copy.matters.tabDeadlines, count: deadlines.filter((d) => d.status === "open").length },
    { id: "hearings", label: copy.matters.tabHearings, count: hearings.filter((h) => h.status === "scheduled").length }, { id: "time", label: copy.matters.tabTime, count: entries.length },
    { id: "documents", label: copy.matters.tabDocuments, count: docs.length }, { id: "research", label: copy.matters.tabResearch, count: matter.researchIds.length }, { id: "activity", label: copy.matters.tabActivity },
  ];
  const patch = (p: Partial<Matter>) => update((w) => ({ ...w, matters: w.matters.map((m) => m.id === matter.id ? { ...m, ...p } : m) }));
  const billingLabel = matter.billing.mode === "hourly" ? `${copy.billingModes.hourly} · ${matter.billing.hourlyRate ?? ws.settings.defaultHourlyRate} ${copy.common.perHour}` : matter.billing.mode === "flat" ? `${copy.billingModes.flat} · ${formatEur(matter.billing.flatFee ?? 0, locale)}` : copy.billingModes.tariff;

  return (
    <div className="space-y-6">
      <div>
        <button type="button" onClick={onBack} className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden />{copy.matters.title}</button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm tabular-nums text-muted-foreground">{matter.number} · {copy.areas[matter.area]} · {copy.matterTypes[matter.type]}</p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{matter.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{client?.name}</p>
          </div>
          {matter.stage !== "closed" && (
            <Button variant="outline" className="h-11" onClick={() => patch({ stage: STAGES[stageIndex + 1]!, ...(STAGES[stageIndex + 1] === "closed" ? { closedAt: today } : {}) })}>
              {copy.matters.stageAdvance}: {copy.stages[STAGES[stageIndex + 1]!]}
            </Button>
          )}
        </div>
      </div>

      <ol className="flex gap-1 overflow-x-auto pb-1" aria-label={copy.common.stage}>
        {STAGES.map((s, i) => (
          <li key={s} className={cn("flex min-w-24 flex-1 flex-col gap-1 rounded-md border px-2 py-1.5 text-xs", i < stageIndex && "border-border text-muted-foreground", i === stageIndex && "border-primary bg-primary text-primary-foreground font-medium", i > stageIndex && "border-dashed border-border text-muted-foreground")} aria-current={i === stageIndex ? "step" : undefined}>
            <span className="tabular-nums">{i + 1}</span><span className="truncate">{copy.stages[s]}</span>
          </li>
        ))}
      </ol>

      <Tabs tabs={tabs} value={tab} onChange={setTab} label={matter.title} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Panel title={copy.common.summary}>
            <p className="whitespace-pre-line text-sm leading-relaxed">{matter.summary || "—"}</p>
            {matter.nextStep && <p className="mt-4 text-sm"><span className="text-xs uppercase tracking-wide text-muted-foreground">{copy.common.nextStep}</span><br />{matter.nextStep}</p>}
            <div className="mt-4 flex flex-wrap gap-1">{matter.tags.map((t) => <Badge key={t} tone="muted">{t}</Badge>)}</div>
          </Panel>
          <div className="space-y-6">
            <Panel title={copy.common.overview}>
              <KeyValue items={[
                { label: copy.common.lead, value: <span className="flex items-center gap-2"><Avatar initials={member(matter.leadId)?.initials ?? "?"} />{member(matter.leadId)?.name}</span> },
                { label: copy.common.team, value: matter.teamIds.map((id) => member(id)?.name).filter(Boolean).join(", ") },
                { label: copy.common.court, value: matter.court }, { label: copy.matters.courtFile, value: matter.courtFileNumber }, { label: copy.matters.judge, value: matter.judge },
                { label: copy.common.value, value: matter.value !== undefined ? formatEur(matter.value, locale) : undefined }, { label: copy.common.billing, value: billingLabel },
                { label: copy.matters.opened, value: formatDate(matter.openedAt, locale) }, { label: copy.common.risk, value: matter.risk ? copy.risk[matter.risk] : undefined },
                { label: copy.matters.unbilled, value: `${formatEur(wip.amount, locale)} · ${formatMinutes(wip.minutes)}` },
              ]} />
            </Panel>
            <Panel title={copy.common.parties}>
              <ul className="space-y-2 text-sm">{matter.parties.map((p, i) => <li key={i} className="flex items-start justify-between gap-3"><span><span className="font-medium">{p.name}</span>{p.note && <span className="block text-xs text-muted-foreground">{p.note}</span>}</span><Badge tone={p.role === "opponent" ? "danger" : p.role === "client" ? "accent" : "muted"}>{copy.partyRoles[p.role]}</Badge></li>)}</ul>
            </Panel>
          </div>
        </div>
      )}

      {tab === "deadlines" && (
        <Panel title={copy.matters.tabDeadlines} action={<Button size="sm" variant="outline" onClick={() => setAddingDeadline((v) => !v)}><Plus className="size-4" aria-hidden />{copy.matters.addDeadline}</Button>}>
          <div className="space-y-3">
            {addingDeadline && <AddDeadline matter={matter} copy={copy} locale={locale} onAdded={() => setAddingDeadline(false)} />}
            {deadlines.length === 0 ? <Empty>{copy.deadlines.empty}</Empty> : (
              <ul className="space-y-2">{deadlines.map((d) => {
                const urgency = deadlineUrgency(d, today);
                const n = daysLeft(d, today);
                return (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-medium", d.status === "done" && "text-muted-foreground line-through")}>{d.title}</p>
                      <p className="text-xs text-muted-foreground">{copy.deadlinePresets[d.preset]}{d.preset !== "custom" && ` · ${DEADLINE_RULES[d.preset].source}`} · {copy.common.startDate.toLowerCase()} {formatDate(d.startDate, locale)} · {member(d.responsibleId)?.name}{d.note ? ` · ${d.note}` : ""}</p>
                    </div>
                    <div className="text-right"><p className="font-medium tabular-nums">{formatDate(d.dueDate, locale, "weekday")}</p><Badge tone={urgency === "overdue" || urgency === "today" ? "danger" : urgency === "soon" ? "accent" : "muted"}>{copy.urgency[urgency]}{d.status === "open" && urgency !== "today" ? ` · ${n < 0 ? -n : n} ${copy.common.days}` : ""}</Badge></div>
                    <Button size="sm" variant="ghost" onClick={() => update((w) => ({ ...w, deadlines: w.deadlines.map((x) => x.id === d.id ? { ...x, status: x.status === "open" ? "done" : "open" } : x) }))}>{d.status === "open" ? copy.matters.markDone : copy.matters.reopen}</Button>
                  </li>
                );
              })}</ul>
            )}
          </div>
        </Panel>
      )}

      {tab === "hearings" && (
        <Panel title={copy.matters.tabHearings}>
          {hearings.length === 0 ? <Empty>{copy.hearings.empty}</Empty> : (
            <ul className="space-y-2">{hearings.map((h) => (
              <li key={h.id}><Row href={`${localePath(locale, NAV_ROUTES.hearings)}?id=${h.id}`}>
                <div className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><p className="font-medium">{copy.hearingKinds[h.kind]} · {formatDate(h.date, locale, "weekday")} {h.time}</p><p className="text-xs text-muted-foreground">{h.location}{h.room ? `, ${h.room}` : ""}{h.judge ? ` · ${h.judge}` : ""}{h.note ? ` · ${h.note}` : ""}</p></div><Badge tone={h.status === "scheduled" ? "accent" : "muted"}>{copy.hearingStatus[h.status]}</Badge></div>
              </Row></li>
            ))}</ul>
          )}
        </Panel>
      )}

      {tab === "time" && (
        <Panel title={`${copy.matters.tabTime} · ${copy.matters.unbilled} ${formatEur(wip.amount, locale)}`} action={<Button size="sm" variant="outline" onClick={() => setAddingEntry((v) => !v)}><Plus className="size-4" aria-hidden />{copy.matters.addEntry}</Button>}>
          <div className="space-y-3">
            {addingEntry && <TimeEntryForm matterId={matter.id} onAdded={() => setAddingEntry(false)} />}
            {entries.length === 0 ? <Empty>{copy.billing.entriesEmpty}</Empty> : (
              <ul className="divide-y divide-border text-sm">{entries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{formatDate(e.date, locale)}</span>
                  <Avatar initials={member(e.memberId)?.initials ?? "?"} title={member(e.memberId)?.name} />
                  <span className="min-w-0 flex-1"><span className="block">{e.description}</span><span className="text-xs text-muted-foreground">{copy.activities[e.activity]}</span></span>
                  <span className="tabular-nums">{formatMinutes(e.minutes)}</span>
                  <span className="w-24 text-right tabular-nums">{e.billable ? formatEur(entryAmount(e), locale) : <Badge tone="muted">{copy.billing.nonBillable}</Badge>}</span>
                  {e.invoiceId && <Badge tone="muted">{ws.invoices.find((i) => i.id === e.invoiceId)?.number}</Badge>}
                </li>
              ))}</ul>
            )}
          </div>
        </Panel>
      )}

      {tab === "documents" && (
        <Panel title={copy.matters.tabDocuments} action={<Button asChild size="sm" variant="outline"><Link href={`${localePath(locale, NAV_ROUTES.documents)}?matter=${matter.id}`}>{copy.common.viewAll}</Link></Button>}>
          {docs.length === 0 ? <Empty>{copy.documents.empty}</Empty> : (
            <ul className="divide-y divide-border text-sm">{docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-2"><span className="min-w-0 flex-1"><span className="block font-medium">{d.title}</span><span className="text-xs text-muted-foreground">{copy.docKinds[d.kind]} · v{d.version} · {member(d.authorId)?.name} · {formatDate(d.updatedAt, locale)}</span></span><Badge tone={d.status === "filed" ? "accent" : d.status === "draft" ? "muted" : "neutral"}>{copy.docStatus[d.status]}</Badge></li>
            ))}</ul>
          )}
        </Panel>
      )}

      {tab === "research" && <Panel title={copy.matters.tabResearch}><LinkedResearch matter={matter} copy={copy} locale={locale} /></Panel>}

      {tab === "activity" && (
        <Panel title={copy.matters.tabActivity}>
          {activity.length === 0 ? <Empty>{copy.common.none}</Empty> : (
            <ol className="space-y-3 text-sm">{activity.map((a) => <li key={a.id} className="flex gap-3"><Avatar initials={member(a.memberId)?.initials ?? "?"} /><div><p>{a.text}</p><p className="text-xs text-muted-foreground">{member(a.memberId)?.name} · {formatDate(a.at.slice(0, 10), locale)} {a.at.slice(11, 16)}</p></div></li>)}</ol>
          )}
        </Panel>
      )}
    </div>
  );
}

export function MattersPage() {
  const locale = asLocale(useLocale());
  const copy = appCopy(locale);
  const { ws } = useWorkspace();
  const [id, setId] = useQueryParam("id");
  const [tabParam, setTabParam] = useQueryParam("tab");
  const [newParam, setNewParam] = useQueryParam("new");
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [area, setArea] = useState("");
  const [lead, setLead] = useState("");
  const [view, setView] = useState<"list" | "board">("list");
  const today = todayIso();
  const rows = useMemo(() => {
    if (!ws) return [];
    const needle = q.trim().toLowerCase();
    return ws.matters
      .filter((m) => (!stage || m.stage === stage) && (!area || m.area === area) && (!lead || m.leadId === lead))
      .filter((m) => !needle || [m.title, m.number, ws.clients.find((c) => c.id === m.clientId)?.name ?? "", m.courtFileNumber ?? "", ...m.tags].join(" ").toLowerCase().includes(needle))
      .sort((a, b) => (a.stage === "closed" ? 1 : 0) - (b.stage === "closed" ? 1 : 0) || b.openedAt.localeCompare(a.openedAt));
  }, [ws, q, stage, area, lead]);
  if (!ws) return <p role="status" className="text-sm text-muted-foreground">{copy.common.loading}</p>;
  const current = id ? ws.matters.find((m) => m.id === id) : undefined;
  if (current) {
    const tab = (["overview", "deadlines", "hearings", "time", "documents", "research", "activity"] as Tab[]).includes(tabParam as Tab) ? (tabParam as Tab) : "overview";
    return <MatterDetail matter={current} tab={tab} setTab={(t) => setTabParam(t === "overview" ? null : t)} onBack={() => { setId(null); setTabParam(null); }} />;
  }
  const member = (mid: string) => ws.members.find((m) => m.id === mid);
  const nextDeadline = (m: Matter) => ws.deadlines.filter((d) => d.matterId === m.id && d.status === "open").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const nextHearing = (m: Matter) => ws.hearings.filter((h) => h.matterId === m.id && h.status === "scheduled" && h.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const card = (m: Matter) => {
    const d = nextDeadline(m);
    const h = nextHearing(m);
    const wip = workInProgress(ws.timeEntries.filter((e) => e.matterId === m.id));
    const urgency = d ? deadlineUrgency(d, today) : null;
    return (
      <Row key={m.id} onClick={() => setId(m.id)}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs tabular-nums text-muted-foreground">{m.number} · {copy.areas[m.area]}</p>
            <p className="truncate font-medium">{m.title}</p>
            <p className="truncate text-xs text-muted-foreground">{ws.clients.find((c) => c.id === m.clientId)?.name}{m.court ? ` · ${m.court}` : ""}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {d && <span className={cn(urgency === "overdue" || urgency === "today" ? "text-destructive" : undefined)}>{copy.matters.nextDeadline}: <span className="tabular-nums">{formatDate(d.dueDate, locale)}</span></span>}
              {h && <span>{copy.matters.nextHearing}: <span className="tabular-nums">{formatDate(h.date, locale)} {h.time}</span></span>}
              {wip.amount > 0 && <span>{copy.matters.unbilled}: <span className="tabular-nums">{formatEur(wip.amount, locale)}</span></span>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge tone={stageTone(m.stage)}>{copy.stages[m.stage]}</Badge>
            <Avatar initials={member(m.leadId)?.initials ?? initialsOf(member(m.leadId)?.name ?? "?")} title={member(m.leadId)?.name} />
          </div>
        </div>
      </Row>
    );
  };

  return (
    <div>
      <PageHeader title={copy.matters.title} intro={copy.matters.intro} actions={<Button className="h-11" onClick={() => setNewParam("1")}><Plus className="size-4" aria-hidden />{copy.matters.newMatter}</Button>} />
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
        <TextInput type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy.matters.searchPlaceholder} aria-label={copy.common.search} />
        <Select value={stage} onChange={(e) => setStage(e.target.value)} aria-label={copy.common.stage}><option value="">{copy.matters.allStages}</option>{STAGES.map((s) => <option key={s} value={s}>{copy.stages[s]}</option>)}</Select>
        <Select value={area} onChange={(e) => setArea(e.target.value)} aria-label={copy.common.area}><option value="">{copy.matters.allAreas}</option>{AREAS.map((a) => <option key={a} value={a}>{copy.areas[a]}</option>)}</Select>
        <Select value={lead} onChange={(e) => setLead(e.target.value)} aria-label={copy.common.lead}><option value="">{copy.matters.allLeads}</option>{lawyers(ws).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
        <div role="group" aria-label={copy.common.overview} className="grid grid-cols-2 rounded-lg border border-border p-0.5 text-sm">
          {(["list", "board"] as const).map((v) => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className="min-h-10 rounded-md px-3 aria-pressed:bg-primary aria-pressed:text-primary-foreground">{v === "list" ? copy.matters.list : copy.matters.board}</button>)}
        </div>
      </div>
      {rows.length === 0 ? <Empty>{copy.matters.empty}</Empty> : view === "list" ? (
        <ul className="space-y-2">{rows.map((m) => <li key={m.id}>{card(m)}</li>)}</ul>
      ) : (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
          {STAGES.map((s) => {
            const col = rows.filter((m) => m.stage === s);
            return (
              <section key={s} className="w-72 shrink-0 rounded-xl border border-border bg-muted/30 p-2" aria-label={copy.stages[s]}>
                <h2 className="flex items-center justify-between px-1 pb-2 text-sm font-medium">{copy.stages[s]}<span className="text-xs tabular-nums text-muted-foreground">{col.length}</span></h2>
                <div className="space-y-2">{col.map(card)}</div>
              </section>
            );
          })}
        </div>
      )}
      <NewMatterDialog open={newParam === "1"} onClose={() => setNewParam(null)} onCreated={(mid) => { setNewParam(null); setId(mid); }} />
    </div>
  );
}
