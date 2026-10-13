"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useCopy, useCurrentAgent, useLookups, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { useSelected } from "@/hooks/use-selected";
import { addDocument, addLease, addProtocol, markPaymentPaid } from "@/lib/realestate/actions";
import { formatDate, formatMonth } from "@/lib/realestate/format";
import { daysToLeaseEnd, overduePayments } from "@/lib/realestate/metrics";
import { addMonths, fullName, isoDate, type Lease, type ProtocolKind } from "@/lib/realestate/model";
import { cn } from "@/lib/utils";
import { Money, PropertyFacts, RecordLink, Timeline, useActionLabels, useAgentName, useNow } from "./shared";
import { Checkbox, DOC_TONE, DataList, Definition, Drawer, EmptyState, Field, FormRow, LEASE_TONE, PageHeader, Panel, Pill, PrimaryButton, SecondaryButton, Select, TextArea, TextInput, type Column } from "./ui";

function LeaseForm({ onDone }: { onDone: (id: string | null) => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const labels = useActionLabels();
  const agent = useCurrentAgent(ws);
  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [rent, setRent] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [start, setStart] = useState(isoDate(addMonths(new Date(), 1)).slice(0, 8) + "01");
  const [end, setEnd] = useState(isoDate(addMonths(new Date(), 13)).slice(0, 8) + "01");
  const [notice, setNotice] = useState(3);
  const [utilities, setUtilities] = useState(false);
  const [notes, setNotes] = useState("");
  if (!ws) return null;
  const candidates = ws.properties.filter((p) => p.transaction === "rent" && p.status !== "rented");
  const property = ws.properties.find((p) => p.id === propertyId) ?? candidates[0];
  const tenant = tenantId || ws.contacts.find((x) => x.roles.includes("tenant"))?.id || ws.contacts[0]?.id || "";
  const f = c.rentals.form;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!property || !tenant) return;
        const id = addLease({ propertyId: property.id, tenantId: tenant, landlordId: property.ownerId, agentId: agent?.id ?? "", rent: rent || property.price, deposit: deposit || rent || property.price, start, end, noticeMonths: notice, utilitiesIncluded: utilities, notes }, labels);
        onDone(id);
      }}
    >
      <Field label={f.property}>{(id) => <Select id={id} value={property?.id ?? ""} onChange={(e) => { setPropertyId(e.target.value); const p = ws.properties.find((x) => x.id === e.target.value); if (p) { setRent(p.price); setDeposit(p.price); } }}>{candidates.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>}</Field>
      <Field label={f.tenant}>{(id) => <Select id={id} value={tenant} onChange={(e) => setTenantId(e.target.value)}>{ws.contacts.map((x) => <option key={x.id} value={x.id}>{fullName(x)}</option>)}</Select>}</Field>
      <FormRow>
        <Field label={f.rent}>{(id) => <TextInput id={id} type="number" min={0} value={rent || property?.price || ""} onChange={(e) => setRent(Number(e.target.value))} />}</Field>
        <Field label={f.deposit}>{(id) => <TextInput id={id} type="number" min={0} value={deposit || property?.price || ""} onChange={(e) => setDeposit(Number(e.target.value))} />}</Field>
        <Field label={f.start}>{(id) => <TextInput id={id} type="date" value={start} onChange={(e) => setStart(e.target.value)} required />}</Field>
        <Field label={f.end}>{(id) => <TextInput id={id} type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />}</Field>
        <Field label={f.notice}>{(id) => <TextInput id={id} type="number" min={1} value={notice} onChange={(e) => setNotice(Number(e.target.value) || 1)} />}</Field>
        <div className="pt-7"><Checkbox label={f.utilities} checked={utilities} onChange={setUtilities} /></div>
      </FormRow>
      <Field label={f.notes}>{(id) => <TextArea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" />}</Field>
      <div className="flex justify-end gap-2"><SecondaryButton onClick={() => onDone(null)}>{c.common.cancel}</SecondaryButton><PrimaryButton type="submit">{c.rentals.add}</PrimaryButton></div>
    </form>
  );
}

function ProtocolForm({ lease, onDone }: { lease: Lease; onDone: () => void }) {
  const c = useCopy();
  const labels = useActionLabels();
  const last = lease.protocols[lease.protocols.length - 1];
  const [kind, setKind] = useState<ProtocolKind>(last?.kind === "moveIn" ? "moveOut" : "moveIn");
  const [date, setDate] = useState(isoDate(new Date()));
  const [electricity, setElectricity] = useState(last?.meters.electricity ?? 0);
  const [gas, setGas] = useState(last?.meters.gas ?? 0);
  const [water, setWater] = useState(last?.meters.water ?? 0);
  const [keys, setKeys] = useState(last?.keys ?? 2);
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const f = c.rentals.protocolForm;
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); addProtocol(lease.id, { kind, date, meters: { electricity, gas, water }, keys, condition: condition.trim(), notes: notes.trim() }, labels); onDone(); }}>
      <FormRow>
        <Field label={f.kind}>{(id) => <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as ProtocolKind)}><option value="moveIn">{c.protocolKind.moveIn}</option><option value="moveOut">{c.protocolKind.moveOut}</option></Select>}</Field>
        <Field label={f.date}>{(id) => <TextInput id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />}</Field>
      </FormRow>
      <FormRow className="sm:grid-cols-4">
        <Field label={f.electricity}>{(id) => <TextInput id={id} type="number" min={0} value={electricity} onChange={(e) => setElectricity(Number(e.target.value))} />}</Field>
        <Field label={f.gas}>{(id) => <TextInput id={id} type="number" min={0} value={gas} onChange={(e) => setGas(Number(e.target.value))} />}</Field>
        <Field label={f.water}>{(id) => <TextInput id={id} type="number" min={0} value={water} onChange={(e) => setWater(Number(e.target.value))} />}</Field>
        <Field label={f.keys}>{(id) => <TextInput id={id} type="number" min={0} value={keys} onChange={(e) => setKeys(Number(e.target.value))} />}</Field>
      </FormRow>
      <Field label={f.condition}>{(id) => <TextArea id={id} value={condition} onChange={(e) => setCondition(e.target.value)} className="min-h-20" />}</Field>
      <Field label={f.notes}>{(id) => <TextInput id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
      <div className="flex justify-end gap-2"><SecondaryButton onClick={onDone}>{c.common.cancel}</SecondaryButton><PrimaryButton type="submit">{f.save}</PrimaryButton></div>
    </form>
  );
}

function LeaseDetail({ lease }: { lease: Lease }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const agentName = useAgentName();
  const now = useNow();
  const [protocolOpen, setProtocolOpen] = useState(false);
  if (!ws) return null;
  const t = c.rentals.detail;
  const property = lookups.property(lease.propertyId);
  const tenant = lookups.contact(lease.tenantId);
  const landlord = lookups.contact(lease.landlordId);
  const overdue = new Set(overduePayments(lease, now).map((p) => p.id));
  const paid = lease.payments.filter((p) => p.paidAt).length;
  const docs = ws.documents.filter((d) => d.link.kind === "lease" && d.link.id === lease.id);
  const activities = ws.activities.filter((a) => a.link?.kind === "lease" && a.link.id === lease.id);
  const left = daysToLeaseEnd(lease, now);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tabular-nums tracking-tight"><Money amount={lease.rent} period="rent" /></p>
          {property && <p className="mt-1 text-sm"><RecordLink link={{ kind: "property", id: property.id }}>{property.title}</RecordLink> · <PropertyFacts property={property} /></p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone={LEASE_TONE[lease.status]}>{c.leaseStatus[lease.status]}</Pill>
            <Pill tone={lease.status === "ended" ? "neutral" : left <= 60 ? "warn" : "neutral"}>{t.endsIn(left)}</Pill>
            <Pill tone={overdue.size > 0 ? "bad" : "good"}>{t.paidCount(paid, lease.payments.length)}</Pill>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => addDocument("lease", { kind: "lease", id: lease.id }, labels)}>{c.deals.generate}</SecondaryButton>
          <PrimaryButton onClick={() => setProtocolOpen(true)}>{t.addProtocol}</PrimaryButton>
        </div>
      </div>

      <Panel title={t.terms}>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Definition label={t.tenant}>{tenant ? <RecordLink link={{ kind: "contact", id: tenant.id }}>{fullName(tenant)}</RecordLink> : "—"}</Definition>
          <Definition label={t.landlord}>{landlord ? <RecordLink link={{ kind: "contact", id: landlord.id }}>{fullName(landlord)}</RecordLink> : "—"}</Definition>
          <Definition label={t.period}>{formatDate(lease.start, locale)} → {formatDate(lease.end, locale)} · {t.notice(lease.noticeMonths)}</Definition>
          <Definition label={t.deposit}><Money amount={lease.deposit} /></Definition>
          <Definition label={t.utilities}>{lease.utilitiesIncluded ? t.included : t.notIncluded}</Definition>
          <Definition label={c.common.agent}>{agentName(lease.agentId)}</Definition>
        </dl>
        {lease.notes && <p className="mt-3 text-sm text-muted-foreground">{lease.notes}</p>}
      </Panel>

      <Panel title={t.payments} hint={t.paymentsHint} testId="lease-payments">
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {lease.payments.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => markPaymentPaid(lease.id, p.id, labels)} aria-pressed={Boolean(p.paidAt)} className={cn("flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ring-1 ring-inset", p.paidAt ? "bg-emerald-400/10 ring-emerald-400/30" : overdue.has(p.id) ? "bg-rose-400/10 ring-rose-400/40" : "bg-background/60 ring-foreground/10")}>
                <span className="font-medium">{formatMonth(p.month, locale)}</span>
                <span className="text-xs text-muted-foreground">{p.paidAt ? `${t.paid} ${formatDate(p.paidAt, locale)}` : overdue.has(p.id) ? t.overdue : `${t.due} ${formatDate(p.due, locale)}`}</span>
                <Money amount={p.amount} />
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={t.protocols} hint={t.protocolsHint} testId="lease-protocols">
        {lease.protocols.length === 0 ? <p className="text-sm text-muted-foreground">{c.common.noData}</p> : (
          <ul className="space-y-3">
            {lease.protocols.map((p) => (
              <li key={p.id} className="rounded-xl bg-background/60 p-3 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{c.protocolKind[p.kind]}</span><span className="text-xs text-muted-foreground">{formatDate(p.date, locale)}</span></div>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <Definition label={t.electricity}>{p.meters.electricity}</Definition>
                  <Definition label={t.gas}>{p.meters.gas}</Definition>
                  <Definition label={t.water}>{p.meters.water}</Definition>
                  <Definition label={t.keys}>{p.keys}</Definition>
                </dl>
                {p.condition && <p className="mt-2 text-sm text-muted-foreground">{p.condition}</p>}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {docs.length > 0 && (
        <Panel title={t.documents}>
          <ul className="space-y-2 text-sm">{docs.map((d) => <li key={d.id} className="flex items-center justify-between gap-2"><span>{c.template[d.templateId]}</span><Pill tone={DOC_TONE[d.status]}>{c.docStatus[d.status]}</Pill></li>)}</ul>
        </Panel>
      )}

      <Panel title={c.common.timeline}>
        <Timeline activities={activities} link={{ kind: "lease", id: lease.id }} />
      </Panel>

      <Drawer open={protocolOpen} onOpenChange={setProtocolOpen} title={t.addProtocol} closeLabel={c.common.close}>
        <ProtocolForm lease={lease} onDone={() => setProtocolOpen(false)} />
      </Drawer>
    </div>
  );
}

export function Rentals() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const lookups = useLookups(ws);
  const now = useNow();
  const [selected, setSelected] = useSelected();
  const [createOpen, setCreateOpen] = useState(false);
  const rows = useMemo(() => (ws ? [...ws.leases].sort((a, b) => (a.status === "ended" ? 1 : 0) - (b.status === "ended" ? 1 : 0) || a.end.localeCompare(b.end)) : []), [ws]);
  if (!ws) return null;
  const current = selected ? ws.leases.find((l) => l.id === selected) ?? null : null;
  const columns: Column<Lease>[] = [
    { key: "property", label: c.rentals.columns.property, render: (l) => <span className="font-medium">{lookups.property(l.propertyId)?.title}</span> },
    { key: "tenant", label: c.rentals.columns.tenant, render: (l) => { const x = lookups.contact(l.tenantId); return <span className="text-muted-foreground">{x ? fullName(x) : "—"}</span>; } },
    { key: "rent", label: c.rentals.columns.rent, className: "text-right", render: (l) => <Money amount={l.rent} period="rent" /> },
    { key: "period", label: c.rentals.columns.period, render: (l) => <span className="text-muted-foreground">{formatDate(l.start, locale)} → {formatDate(l.end, locale)}</span> },
    { key: "status", label: c.rentals.columns.status, render: (l) => <Pill tone={LEASE_TONE[l.status]}>{c.leaseStatus[l.status]}</Pill> },
    { key: "payments", label: c.rentals.columns.payments, render: (l) => { const o = overduePayments(l, now).length; return <Pill tone={o > 0 ? "bad" : "good"}>{o > 0 ? `${c.rentals.detail.overdue}: ${o}` : c.rentals.detail.paid}</Pill>; } },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={c.rentals.title} intro={c.rentals.intro} actions={<PrimaryButton onClick={() => setCreateOpen(true)}><Plus aria-hidden />{c.rentals.add}</PrimaryButton>} />
      {rows.length === 0 ? <EmptyState title={c.rentals.empty} /> : (
        <DataList rows={rows} columns={columns} onOpen={(l) => setSelected(l.id)} openLabel={c.common.open} ariaLabel={c.rentals.title} testId="leases-list"
          renderCard={(l) => { const x = lookups.contact(l.tenantId); const o = overduePayments(l, now).length; return (
            <span className="block space-y-1.5">
              <span className="flex items-start justify-between gap-2"><span className="font-medium">{lookups.property(l.propertyId)?.title}</span><Money amount={l.rent} period="rent" /></span>
              <span className="block text-xs text-muted-foreground">{x ? fullName(x) : ""} · {formatDate(l.start, locale)} → {formatDate(l.end, locale)}</span>
              <span className="flex flex-wrap gap-1.5"><Pill tone={LEASE_TONE[l.status]}>{c.leaseStatus[l.status]}</Pill>{o > 0 && <Pill tone="bad">{c.rentals.detail.overdue}: {o}</Pill>}</span>
            </span>
          ); }}
        />
      )}
      <Drawer open={current !== null} onOpenChange={(o) => !o && setSelected(null)} title={current ? lookups.property(current.propertyId)?.title ?? "" : ""} description={current ? c.linkKind.lease : undefined} closeLabel={c.common.close} wide testId="lease-drawer">
        {current && <LeaseDetail lease={current} />}
      </Drawer>
      <Drawer open={createOpen} onOpenChange={setCreateOpen} title={c.rentals.add} closeLabel={c.common.close}>
        <LeaseForm onDone={(id) => { setCreateOpen(false); if (id) setSelected(id); }} />
      </Drawer>
    </div>
  );
}
