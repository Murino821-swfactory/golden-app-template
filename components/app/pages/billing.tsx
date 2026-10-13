"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appCopy, asLocale } from "@/lib/legal/copy";
import { addDays, todayIso } from "@/lib/legal/dates";
import { entryAmount, hours, invoiceSubtotal, invoiceTotal, linesFromEntries, receivables, workInProgress } from "@/lib/legal/billing";
import { formatDate, formatMinutes } from "@/lib/legal/format";
import { newId, nextInvoiceNumber, useWorkspace } from "@/lib/legal/store";
import { courtFee, formatEur, tariffFee } from "@/lib/legal/tariff";
import type { Invoice } from "@/lib/legal/types";
import { localePath } from "@/lib/locale-routing";
import { TimeEntryForm } from "../forms";
import { NAV_ROUTES } from "../shell";
import { useQueryParam } from "../use-query-param";
import { Avatar, Badge, Empty, Field, KeyValue, Notice, PageHeader, Panel, Row, Select, Tabs, TextInput } from "../ui";

type Tab = "entries" | "invoices" | "tariff" | "overview";

export function BillingPage() {
  const locale = asLocale(useLocale());
  const copy = appCopy(locale);
  const { ws, update } = useWorkspace();
  const [tabParam, setTabParam] = useQueryParam("tab");
  const [adding, setAdding] = useState(false);
  const [matterFilter, setMatterFilter] = useState("");
  const [invoiceMatter, setInvoiceMatter] = useState("");
  const [value, setValue] = useState("8900");
  const [noValue, setNoValue] = useState(false);
  const [acts, setActs] = useState(3);
  const [halfActs, setHalfActs] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [commercial, setCommercial] = useState(false);
  const [electronic, setElectronic] = useState(true);
  if (!ws) return <p role="status" className="text-sm text-muted-foreground">{copy.common.loading}</p>;
  const tab: Tab = (["entries", "invoices", "tariff", "overview"] as Tab[]).includes(tabParam as Tab) ? (tabParam as Tab) : "entries";
  const today = todayIso();
  const matter = (id: string) => ws.matters.find((m) => m.id === id);
  const member = (id: string) => ws.members.find((m) => m.id === id);
  const client = (id: string) => ws.clients.find((c) => c.id === id);
  const entries = ws.timeEntries.filter((e) => !matterFilter || e.matterId === matterFilter).sort((a, b) => b.date.localeCompare(a.date));
  const unbilledByMatter = ws.matters.map((m) => ({ matter: m, wip: workInProgress(ws.timeEntries.filter((e) => e.matterId === m.id)) })).filter((x) => x.wip.amount > 0).sort((a, b) => b.wip.amount - a.wip.amount);
  const chosen = invoiceMatter || unbilledByMatter[0]?.matter.id || "";
  const draftLines = chosen ? linesFromEntries(ws.timeEntries.filter((e) => e.matterId === chosen), (a) => `${copy.billing.lineHours} — ${copy.activities[a]}`) : [];
  const draft: Pick<Invoice, "lines" | "vatRate"> = { lines: draftLines, vatRate: ws.settings.vatRate };
  const aged = receivables(ws.invoices, today);
  const parsedValue = Number(value.replace(/\s/g, "").replace(",", "."));
  const tariff = tariffFee({ value: noValue || !Number.isFinite(parsedValue) ? undefined : parsedValue, acts, halfRateActs: halfActs, base: ws.settings.tariffBase, multiplier });
  const fee = Number.isFinite(parsedValue) && !noValue ? courtFee(parsedValue, { commercial, electronic }) : null;
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthBillable = ws.timeEntries.filter((e) => e.billable && e.date >= monthStart && e.date <= today).reduce((n, e) => n + e.minutes, 0);
  const invoiceTone = (s: Invoice["status"]) => (s === "paid" ? "muted" : s === "overdue" ? "danger" : s === "sent" ? "accent" : "neutral");
  const tabs: { id: Tab; label: string }[] = [{ id: "entries", label: copy.billing.tabEntries }, { id: "invoices", label: copy.billing.tabInvoices }, { id: "tariff", label: copy.billing.tabTariff }, { id: "overview", label: copy.billing.tabOverview }];

  return (
    <div className="space-y-4">
      <PageHeader title={copy.billing.title} intro={copy.billing.intro} />
      <Tabs tabs={tabs} value={tab} onChange={(t) => setTabParam(t === "entries" ? null : t)} label={copy.billing.title} />

      {tab === "entries" && (
        <Panel title={copy.billing.tabEntries} action={<div className="flex flex-wrap gap-2"><Select value={matterFilter} onChange={(e) => setMatterFilter(e.target.value)} aria-label={copy.common.matter} className="h-9 w-auto max-w-44 text-xs sm:max-w-56"><option value="">{copy.documents.allMatters}</option>{ws.matters.map((m) => <option key={m.id} value={m.id}>{m.number} · {m.title}</option>)}</Select><Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}><Plus className="size-4" aria-hidden />{copy.billing.newEntry}</Button></div>}>
          <div className="space-y-3">
            {adding && <TimeEntryForm onAdded={() => setAdding(false)} />}
            {entries.length === 0 ? <Empty>{copy.billing.entriesEmpty}</Empty> : (
              <ul className="divide-y divide-border text-sm">{entries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{formatDate(e.date, locale)}</span>
                  <Avatar initials={member(e.memberId)?.initials ?? "?"} title={member(e.memberId)?.name} />
                  <span className="min-w-0 flex-1"><a href={`${localePath(locale, NAV_ROUTES.matters)}?id=${e.matterId}&tab=time`} className="block truncate hover:underline">{e.description}</a><span className="text-xs text-muted-foreground">{matter(e.matterId)?.number} · {copy.activities[e.activity]}</span></span>
                  <span className="tabular-nums">{formatMinutes(e.minutes)}</span>
                  <span className="w-24 text-right tabular-nums">{e.billable ? formatEur(entryAmount(e), locale) : <Badge tone="muted">{copy.billing.nonBillable}</Badge>}</span>
                  {e.invoiceId && <Badge tone="muted">{ws.invoices.find((i) => i.id === e.invoiceId)?.number}</Badge>}
                </li>
              ))}</ul>
            )}
          </div>
        </Panel>
      )}

      {tab === "invoices" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Panel title={copy.billing.tabInvoices}>
            {ws.invoices.length === 0 ? <Empty>{copy.billing.invoicesEmpty}</Empty> : (
              <ul className="space-y-2">{[...ws.invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).map((inv) => (
                <li key={inv.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1"><p className="font-medium tabular-nums">{inv.number} · {client(inv.clientId)?.name}</p><p className="truncate text-xs text-muted-foreground">{matter(inv.matterId)?.number} · {matter(inv.matterId)?.title} · {copy.billing.issuedAt} {formatDate(inv.issuedAt, locale)} · {copy.billing.dueAt} {formatDate(inv.dueAt, locale)}</p></div>
                    <span className="font-heading text-lg font-semibold tabular-nums">{formatEur(invoiceTotal(inv), locale)}</span>
                    <Badge tone={invoiceTone(inv.status)}>{copy.invoiceStatus[inv.status]}</Badge>
                  </div>
                  <ul className="mt-2 text-xs text-muted-foreground">{inv.lines.map((l, i) => <li key={i} className="flex justify-between gap-3"><span>{l.description}</span><span className="shrink-0 tabular-nums">{l.quantity} {copy.billing[`unit_${l.unit}`]} × {formatEur(l.unitPrice, locale)}</span></li>)}</ul>
                  <div className="mt-2 flex justify-end gap-2">
                    {inv.status === "draft" && <Button size="sm" variant="outline" onClick={() => update((w) => ({ ...w, invoices: w.invoices.map((x) => x.id === inv.id ? { ...x, status: "sent" } : x) }))}>{copy.billing.markSent}</Button>}
                    {(inv.status === "sent" || inv.status === "overdue") && <Button size="sm" variant="outline" onClick={() => update((w) => ({ ...w, invoices: w.invoices.map((x) => x.id === inv.id ? { ...x, status: "paid", paidAt: today } : x) }))}>{copy.billing.markPaid}</Button>}
                  </div>
                </li>
              ))}</ul>
            )}
          </Panel>
          <Panel title={copy.billing.invoiceFromEntries}>
            {unbilledByMatter.length === 0 ? <Empty>{copy.billing.entriesEmpty}</Empty> : (
              <div className="space-y-3">
                <Field label={copy.billing.chooseMatter}><Select value={chosen} onChange={(e) => setInvoiceMatter(e.target.value)}>{unbilledByMatter.map(({ matter: m, wip }) => <option key={m.id} value={m.id}>{m.number} · {m.title} — {formatEur(wip.amount, locale)}</option>)}</Select></Field>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{copy.billing.preview}</p>
                  <ul className="space-y-1">{draftLines.map((l, i) => <li key={i} className="flex justify-between gap-3"><span className="min-w-0 truncate">{l.description}</span><span className="shrink-0 tabular-nums">{l.quantity} h × {formatEur(l.unitPrice, locale)}</span></li>)}</ul>
                  <dl className="mt-3 space-y-1 border-t border-border pt-2 tabular-nums">
                    <div className="flex justify-between"><dt>{copy.billing.subtotal}</dt><dd>{formatEur(invoiceSubtotal(draft), locale)}</dd></div>
                    <div className="flex justify-between text-muted-foreground"><dt>{copy.billing.vat} {ws.settings.vatRate} %</dt><dd>{formatEur(invoiceTotal(draft) - invoiceSubtotal(draft), locale)}</dd></div>
                    <div className="flex justify-between font-semibold"><dt>{copy.common.total}</dt><dd>{formatEur(invoiceTotal(draft), locale)}</dd></div>
                  </dl>
                </div>
                <Button className="h-11 w-full" disabled={draftLines.length === 0} onClick={() => {
                  const m = matter(chosen)!;
                  const id = newId("f");
                  update((w) => ({
                    ...w,
                    invoices: [{ id, number: nextInvoiceNumber(w, Number(today.slice(0, 4))), clientId: m.clientId, matterId: m.id, issuedAt: today, dueAt: addDays(today, 14), lines: draftLines, vatRate: w.settings.vatRate, status: "draft" }, ...w.invoices],
                    timeEntries: w.timeEntries.map((e) => e.matterId === m.id && e.billable && !e.invoiceId ? { ...e, invoiceId: id } : e),
                  }));
                  setInvoiceMatter("");
                }}>{copy.billing.issue}</Button>
                <p className="text-xs text-muted-foreground">{copy.billing.disclaimer}</p>
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === "tariff" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title={copy.billing.tariffTitle}>
            <p className="mb-3 text-xs text-muted-foreground">{copy.billing.tariffHint}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={copy.billing.tariffValue}><TextInput inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} disabled={noValue} /></Field>
              <label className="flex min-h-11 items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={noValue} onChange={(e) => setNoValue(e.target.checked)} />{copy.billing.tariffNoValue}</label>
              <Field label={copy.billing.acts}><TextInput type="number" min={0} max={200} value={acts} onChange={(e) => setActs(Number(e.target.value))} /></Field>
              <Field label={copy.billing.halfActs}><TextInput type="number" min={0} max={200} value={halfActs} onChange={(e) => setHalfActs(Number(e.target.value))} /></Field>
              <Field label={copy.billing.multiplier}><TextInput type="number" min={0.5} max={3} step={0.5} value={multiplier} onChange={(e) => setMultiplier(Math.min(3, Math.max(0.5, Number(e.target.value) || 1)))} /></Field>
              <Field label={copy.billing.base}><p className="flex h-11 items-center text-sm tabular-nums">{formatEur(ws.settings.tariffBase, locale)} ({ws.settings.tariffYear})</p></Field>
            </div>
            <KeyValue items={[
              { label: copy.billing.ratePerAct, value: formatEur(tariff.ratePerAct, locale) },
              { label: copy.billing.overhead, value: `${formatEur(tariff.overhead, locale)} (${acts + halfActs} × ${formatEur(ws.settings.tariffBase / 100, locale)})` },
              { label: `${copy.billing.acts} × ${copy.billing.ratePerAct}`, value: formatEur(tariff.fullActsTotal + tariff.halfActsTotal, locale) },
              { label: copy.billing.tariffTotal, value: <strong className="font-heading text-xl tabular-nums" data-tariff-total>{formatEur(tariff.total, locale)}</strong> },
            ]} />
          </Panel>
          <div className="space-y-6">
            <Panel title={copy.billing.courtFeeTitle}>
              <p className="mb-3 text-xs text-muted-foreground">{copy.billing.courtFeeHint}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={commercial} onChange={(e) => setCommercial(e.target.checked)} />{copy.billing.commercial}</label>
                <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={electronic} onChange={(e) => setElectronic(e.target.checked)} />{copy.billing.electronic}</label>
              </div>
              <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{copy.billing.courtFee}</p>
              <p className="font-heading text-2xl font-semibold tabular-nums" data-court-fee>{fee === null ? "—" : formatEur(fee, locale)}</p>
            </Panel>
            <Notice>{copy.billing.disclaimer}</Notice>
          </div>
        </div>
      )}

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title={copy.billing.wipByMatter}>
            {unbilledByMatter.length === 0 ? <Empty>{copy.billing.entriesEmpty}</Empty> : (
              <ul className="space-y-2">{unbilledByMatter.map(({ matter: m, wip }) => <li key={m.id}><Row href={`${localePath(locale, NAV_ROUTES.matters)}?id=${m.id}&tab=time`}><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate font-medium">{m.title}</p><p className="text-xs text-muted-foreground">{m.number} · {client(m.clientId)?.name} · {hours(wip.minutes)} h</p></div><span className="font-heading text-lg font-semibold tabular-nums">{formatEur(wip.amount, locale)}</span></div></Row></li>)}</ul>
            )}
          </Panel>
          <div className="space-y-6">
            <Panel title={copy.billing.aging}>
              <KeyValue items={[
                { label: copy.billing.agingCurrent, value: formatEur(aged.current, locale) }, { label: copy.billing.aging1, value: formatEur(aged["1-30"], locale) },
                { label: copy.billing.aging2, value: formatEur(aged["31-60"], locale) }, { label: copy.billing.aging3, value: formatEur(aged["61+"], locale) },
                { label: copy.common.total, value: <strong>{formatEur(aged.total, locale)}</strong> },
              ]} />
            </Panel>
            <Panel title={copy.billing.thisMonth}>
              <KeyValue items={[{ label: copy.billing.unbilledHours, value: `${hours(workInProgress(ws.timeEntries).minutes)} h` }, { label: `${copy.billing.billable} · ${copy.billing.thisMonth.toLowerCase()}`, value: `${hours(monthBillable)} h` }]} />
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
