"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { MoreHorizontal, Plus } from "lucide-react";
import { useCopy, useLookups, useWorkspace } from "@/hooks/use-workspace";
import { useSelected } from "@/hooks/use-selected";
import { addClient, deleteClient, setInvoiceStatus, updateClient, type ClientInput } from "@/lib/recruiting/actions";
import { INVOICE_STATUSES, fullName, isoDate, type Client, type InvoiceStatus } from "@/lib/recruiting/model";
import { formatDate, formatMoney, isOpenJob } from "@/lib/recruiting/metrics";
import { JobFormDrawer } from "./jobs";
import { ActionMenu, ConfirmDialog, DataList, Drawer, EmptyState, Field, FormRow, PageHeader, Pill, PrimaryButton, SecondaryButton, Select, TextArea, TextInput, type Column } from "./ui";
import { Definition, RecordLink, Timeline, useNow } from "./shared";

type Draft = Omit<ClientInput, "feePercent" | "guaranteeDays" | "paymentTermsDays"> & { feePercent: string; guaranteeDays: string; paymentTermsDays: string };

function toDraft(x?: Client): Draft {
  return {
    name: x?.name ?? "", industry: x?.industry ?? "", location: x?.location ?? "", website: x?.website ?? "", contactName: x?.contactName ?? "",
    contactEmail: x?.contactEmail ?? "", contactPhone: x?.contactPhone ?? "", feePercent: x?.feePercent?.toString() ?? "", guaranteeDays: x?.guaranteeDays?.toString() ?? "",
    paymentTermsDays: x?.paymentTermsDays?.toString() ?? "30", notes: x?.notes ?? "",
  };
}

export function ClientFormDrawer({ open, onOpenChange, client, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; client?: Client; onSaved?: (id: string) => void }) {
  const c = useCopy();
  const [draft, setDraft] = useState<Draft>(() => toDraft(client));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function submit() {
    if (!draft.name.trim()) return;
    const input: ClientInput = {
      name: draft.name.trim(), industry: draft.industry.trim(), location: draft.location.trim(), website: draft.website.trim(), contactName: draft.contactName.trim(),
      contactEmail: draft.contactEmail.trim(), contactPhone: draft.contactPhone.trim(), feePercent: draft.feePercent ? Number(draft.feePercent) : null,
      guaranteeDays: draft.guaranteeDays ? Number(draft.guaranteeDays) : null, paymentTermsDays: Number(draft.paymentTermsDays) || 30, notes: draft.notes.trim(),
    };
    const id = client ? (updateClient(client.id, input), client.id) : addClient(input);
    onOpenChange(false);
    onSaved?.(id);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={client ? c.clients.editTitle : c.clients.addTitle}
      closeLabel={c.common.close}
      footer={
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={() => onOpenChange(false)}>{c.common.cancel}</SecondaryButton>
          <PrimaryButton form="client-form" type="submit" disabled={!draft.name.trim()}>{c.common.save}</PrimaryButton>
        </div>
      }
    >
      <form id="client-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label={c.clients.form.name} required>{(id) => <TextInput id={id} required value={draft.name} onChange={(e) => set("name", e.target.value)} />}</Field>
        <FormRow>
          <Field label={c.clients.form.industry}>{(id) => <TextInput id={id} value={draft.industry} onChange={(e) => set("industry", e.target.value)} />}</Field>
          <Field label={c.clients.form.location}>{(id) => <TextInput id={id} value={draft.location} onChange={(e) => set("location", e.target.value)} />}</Field>
          <Field label={c.clients.form.website}>{(id) => <TextInput id={id} value={draft.website} onChange={(e) => set("website", e.target.value)} />}</Field>
          <Field label={c.clients.form.contactName}>{(id) => <TextInput id={id} value={draft.contactName} onChange={(e) => set("contactName", e.target.value)} />}</Field>
          <Field label={c.clients.form.contactEmail}>{(id) => <TextInput id={id} type="email" value={draft.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />}</Field>
          <Field label={c.clients.form.contactPhone}>{(id) => <TextInput id={id} value={draft.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />}</Field>
          <Field label={c.clients.form.feePercent} hint={c.clients.form.feeHint}>{(id) => <TextInput id={id} type="number" min={0} max={100} step={0.5} value={draft.feePercent} onChange={(e) => set("feePercent", e.target.value)} />}</Field>
          <Field label={c.clients.form.guaranteeDays}>{(id) => <TextInput id={id} type="number" min={0} value={draft.guaranteeDays} onChange={(e) => set("guaranteeDays", e.target.value)} />}</Field>
          <Field label={c.clients.form.paymentTerms}>{(id) => <TextInput id={id} type="number" min={0} value={draft.paymentTermsDays} onChange={(e) => set("paymentTermsDays", e.target.value)} />}</Field>
        </FormRow>
        <Field label={c.common.notes}>{(id) => <TextArea id={id} value={draft.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-24" />}</Field>
      </form>
    </Drawer>
  );
}

function ClientDetail({ client, onEdit, onClose }: { client: Client; onEdit: () => void; onClose: () => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useLocale();
  const lookups = useLookups(ws);
  const now = useNow();
  const [jobForm, setJobForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const jobs = useMemo(() => (ws ? ws.jobs.filter((j) => j.clientId === client.id) : []), [ws, client.id]);
  const placements = useMemo(() => (ws ? ws.placements.filter((p) => p.clientId === client.id).sort((a, b) => b.startDate.localeCompare(a.startDate)) : []), [ws, client.id]);
  const activities = useMemo(() => {
    if (!ws) return [];
    const jobIds = new Set(jobs.map((j) => j.id));
    return ws.activities.filter((a) => a.clientId === client.id || (a.jobId && jobIds.has(a.jobId) && !a.candidateId));
  }, [ws, jobs, client.id]);
  if (!ws) return null;
  const money = (n: number) => formatMoney(n, ws.settings.currency, locale);
  const total = placements.reduce((s, p) => s + p.feeAmount, 0);
  const today = isoDate(now);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{[client.industry, client.location].filter(Boolean).join(" · ")}</p>
        <ActionMenu
          label={c.common.actions}
          trigger={<button type="button" className="inline-flex size-11 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"><MoreHorizontal aria-hidden className="size-5" /></button>}
          items={[
            { label: c.common.edit, onSelect: onEdit },
            { label: c.clients.detail.addJob, onSelect: () => setJobForm(true) },
            { label: c.common.delete, onSelect: () => setConfirmDelete(true), tone: "danger" },
          ]}
        />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Definition label={c.clients.detail.contact}>{client.contactName || c.common.none}</Definition>
        <Definition label={c.clients.form.contactEmail}>{client.contactEmail ? <a href={`mailto:${client.contactEmail}`} className="break-all underline-offset-4 hover:underline">{client.contactEmail}</a> : c.common.none}</Definition>
        <Definition label={c.clients.form.contactPhone}>{client.contactPhone || c.common.none}</Definition>
        <Definition label={c.clients.detail.fee}>{client.feePercent === null ? `${ws.settings.defaultFeePercent} % (${c.common.none})` : `${client.feePercent} %`}</Definition>
        <Definition label={c.clients.detail.guarantee}>{c.common.days(client.guaranteeDays ?? ws.settings.defaultGuaranteeDays)}</Definition>
        <Definition label={c.clients.detail.payment}>{c.common.days(client.paymentTermsDays)}</Definition>
        <Definition label={c.clients.detail.website}>{client.website ? <a href={`https://${client.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer" className="break-all underline-offset-4 hover:underline">{client.website}</a> : c.common.none}</Definition>
        <Definition label={c.clients.detail.revenue}>{money(total)}</Definition>
      </dl>
      {client.notes && <p className="rounded-xl bg-background/60 p-3 text-sm leading-relaxed ring-1 ring-foreground/10">{client.notes}</p>}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{c.nav.jobs}</h3>
          <SecondaryButton onClick={() => setJobForm(true)}><Plus aria-hidden /> {c.clients.detail.addJob}</SecondaryButton>
        </div>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.clients.detail.jobsEmpty}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
            {jobs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <RecordLink route="/workspace/jobs" id={j.id} className="font-medium">{j.title}</RecordLink>
                <Pill tone={j.status === "open" ? "good" : j.status === "filled" ? "info" : j.status === "on-hold" ? "warn" : "neutral"}>{c.jobStatus[j.status]}</Pill>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{c.clients.detail.placements}</h3>
        {placements.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.clients.detail.placementsEmpty}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
            {placements.map((p) => {
              const cand = lookups.candidate(p.candidateId);
              const job = lookups.job(p.jobId);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium">{cand ? fullName(cand) : "?"}<span className="font-normal text-muted-foreground"> · {job?.title}</span></span>
                    <span className="block text-xs text-muted-foreground">
                      {c.placement.starts(formatDate(p.startDate, locale))} · {money(p.feeAmount)} · {p.guaranteeUntil >= today ? `${c.placement.inGuarantee} (${formatDate(p.guaranteeUntil, locale)})` : c.placement.guaranteeOver}
                    </span>
                  </span>
                  <Select aria-label={c.placement.invoice} value={p.invoiceStatus} onChange={(e) => setInvoiceStatus(p.id, e.target.value as InvoiceStatus)} className="w-auto min-h-9 text-xs">
                    {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{c.invoiceStatus[s]}</option>)}
                  </Select>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{c.clients.detail.timeline}</h3>
        <Timeline activities={activities} refs={{ clientId: client.id }} empty={c.jobs.detail.noActivity} />
      </section>

      {jobForm && <JobFormDrawer open onOpenChange={(o) => !o && setJobForm(false)} clientId={client.id} />}
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={c.common.delete} text={c.clients.detail.deleteConfirm} confirmLabel={c.common.delete} cancelLabel={c.common.cancel} destructive onConfirm={() => { deleteClient(client.id); onClose(); }} />
    </div>
  );
}

export function ClientsView() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useLocale();
  const [selected, setSelected] = useSelected("id");
  const [form, setForm] = useState<{ client?: Client } | null>(null);
  const stats = useMemo(() => {
    const by = new Map<string, { openJobs: number; placements: number; fees: number }>();
    for (const cl of ws?.clients ?? []) by.set(cl.id, { openJobs: 0, placements: 0, fees: 0 });
    for (const j of ws?.jobs ?? []) if (isOpenJob(j)) { const row = by.get(j.clientId); if (row) row.openJobs += 1; }
    for (const p of ws?.placements ?? []) { const row = by.get(p.clientId); if (row) { row.placements += 1; row.fees += p.feeAmount; } }
    return by;
  }, [ws]);
  if (!ws) return null;
  const rows = [...ws.clients].sort((a, b) => (stats.get(b.id)?.openJobs ?? 0) - (stats.get(a.id)?.openJobs ?? 0) || a.name.localeCompare(b.name));
  const selectedClient = selected ? ws.clients.find((x) => x.id === selected) : undefined;
  const money = (n: number) => formatMoney(n, ws.settings.currency, locale);

  const columns: Column<Client>[] = [
    { key: "name", label: c.clients.columns.name, render: (x) => <span className="min-w-0"><span className="block font-medium">{x.name}</span><span className="block text-xs text-muted-foreground">{x.contactName}</span></span> },
    { key: "industry", label: c.clients.columns.industry, render: (x) => <span className="text-muted-foreground">{x.industry || c.common.none}</span>, className: "hidden lg:table-cell" },
    { key: "openJobs", label: c.clients.columns.openJobs, render: (x) => <span className="tabular-nums">{stats.get(x.id)?.openJobs ?? 0}</span> },
    { key: "placements", label: c.clients.columns.placements, render: (x) => <span className="tabular-nums">{stats.get(x.id)?.placements ?? 0}</span> },
    { key: "revenue", label: c.clients.columns.revenue, render: (x) => <span className="tabular-nums">{money(stats.get(x.id)?.fees ?? 0)}</span> },
    { key: "terms", label: c.clients.columns.terms, render: (x) => <span className="text-muted-foreground">{x.feePercent ?? ws.settings.defaultFeePercent} % · {c.common.days(x.guaranteeDays ?? ws.settings.defaultGuaranteeDays)}</span>, className: "hidden xl:table-cell" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={c.clients.title} intro={c.clients.intro} actions={<PrimaryButton onClick={() => setForm({})}><Plus aria-hidden /> {c.clients.add}</PrimaryButton>} />
      <p className="text-sm text-muted-foreground">{c.clients.count(rows.length)}</p>
      {rows.length === 0 ? (
        <EmptyState title={c.clients.empty} action={<PrimaryButton onClick={() => setForm({})}>{c.clients.add}</PrimaryButton>} />
      ) : (
        <DataList
          rows={rows}
          columns={columns}
          onOpen={(x) => setSelected(x.id)}
          openLabel={c.common.open}
          ariaLabel={c.clients.title}
          renderCard={(x) => (
            <span className="block">
              <span className="block font-medium">{x.name}</span>
              <span className="block text-sm text-muted-foreground">{x.industry}{x.location ? ` · ${x.location}` : ""}</span>
              <span className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{stats.get(x.id)?.openJobs ?? 0} · {c.clients.columns.openJobs.toLowerCase()}</span>
                <span>{money(stats.get(x.id)?.fees ?? 0)}</span>
              </span>
            </span>
          )}
        />
      )}
      {selectedClient && (
        <Drawer open onOpenChange={(o) => !o && setSelected(null)} title={selectedClient.name} closeLabel={c.common.close} wide>
          <ClientDetail client={selectedClient} onEdit={() => setForm({ client: selectedClient })} onClose={() => setSelected(null)} />
        </Drawer>
      )}
      {form && <ClientFormDrawer key={form.client?.id ?? "new"} open onOpenChange={(o) => !o && setForm(null)} client={form.client} onSaved={(id) => setSelected(id)} />}
    </div>
  );
}
