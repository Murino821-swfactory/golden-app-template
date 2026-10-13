"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { appCopy, asLocale } from "@/lib/legal/copy";
import { todayIso } from "@/lib/legal/dates";
import { workInProgress } from "@/lib/legal/billing";
import { formatDate } from "@/lib/legal/format";
import { newId, useWorkspace } from "@/lib/legal/store";
import { formatEur } from "@/lib/legal/tariff";
import type { AmlRisk, Client } from "@/lib/legal/types";
import { localePath } from "@/lib/locale-routing";
import { NAV_ROUTES } from "../shell";
import { useQueryParam } from "../use-query-param";
import { Badge, Empty, Field, KeyValue, PageHeader, Panel, Progress, Row, Select, TextInput } from "../ui";

const KYC_STEPS = ["identity", "verification", "beneficialOwner", "pep", "purpose"] as const;

function NewClientDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const copy = appCopy(useLocale());
  const { update } = useWorkspace();
  const [type, setType] = useState<Client["type"]>("person");
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [amlRisk, setAmlRisk] = useState<AmlRisk>("low");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const client: Client = { id: newId("c"), type, name: name.trim(), registrationNumber: registrationNumber.trim() || undefined, email: email.trim() || undefined, phone: phone.trim() || undefined, address: address.trim() || undefined, kyc: "pending", amlRisk, createdAt: todayIso() };
    update((w) => ({ ...w, clients: [client, ...w.clients] }));
    onCreated(client.id);
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent closeLabel={copy.common.close}>
        <DialogTitle>{copy.clients.newClient}</DialogTitle>
        <DialogDescription>{copy.clients.amlHint}</DialogDescription>
        <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={copy.common.type}><Select value={type} onChange={(e) => setType(e.target.value as Client["type"])}><option value="person">{copy.clients.person}</option><option value="company">{copy.clients.company}</option></Select></Field>
          <Field label={copy.common.name}><TextInput value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} /></Field>
          {type === "company" && <Field label={copy.clients.registrationNumber}><TextInput value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} maxLength={20} /></Field>}
          <Field label="E-mail"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} /></Field>
          <Field label={locale(copy)}><TextInput value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} /></Field>
          <Field label={copy.settings.address} className="sm:col-span-2"><TextInput value={address} onChange={(e) => setAddress(e.target.value)} maxLength={160} /></Field>
          <Field label="AML"><Select value={amlRisk} onChange={(e) => setAmlRisk(e.target.value as AmlRisk)}>{(["low", "medium", "high"] as AmlRisk[]).map((r) => <option key={r} value={r}>{copy.amlRisk[r]}</option>)}</Select></Field>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" className="h-11" onClick={onClose}>{copy.common.cancel}</Button><Button type="submit" className="h-11" disabled={!name.trim()}>{copy.common.save}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function locale(copy: ReturnType<typeof appCopy>): string {
  return copy.nav.dashboard === "Prehľad" ? "Telefón" : "Phone";
}

export function ClientsPage() {
  const loc = asLocale(useLocale());
  const copy = appCopy(loc);
  const { ws, update } = useWorkspace();
  const [id, setId] = useQueryParam("id");
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  if (!ws) return <p role="status" className="text-sm text-muted-foreground">{copy.common.loading}</p>;
  const current = id ? ws.clients.find((c) => c.id === id) : undefined;
  const needle = q.trim().toLowerCase();
  const rows = ws.clients.filter((c) => !needle || `${c.name} ${c.registrationNumber ?? ""} ${c.address ?? ""}`.toLowerCase().includes(needle));
  const mattersOf = (cid: string) => ws.matters.filter((m) => m.clientId === cid);
  const kycTone = (k: Client["kyc"]) => (k === "verified" ? "neutral" : k === "expired" ? "danger" : "accent");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div>
        <PageHeader title={copy.clients.title} intro={copy.clients.intro} actions={<Button className="h-11" onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden />{copy.clients.newClient}</Button>} />
        <TextInput type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy.clients.searchPlaceholder} aria-label={copy.common.search} className="mb-3" />
        {rows.length === 0 ? <Empty>{copy.clients.empty}</Empty> : (
          <ul className="space-y-2">{rows.map((c) => (
            <li key={c.id}><Row onClick={() => setId(c.id)} selected={c.id === current?.id}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.type === "company" ? copy.clients.company : copy.clients.person} · {mattersOf(c.id).length} {copy.nav.matters.toLowerCase()}</p></div>
                <Badge tone={kycTone(c.kyc)}>{copy.kyc[c.kyc]}</Badge>
              </div>
            </Row></li>
          ))}</ul>
        )}
      </div>
      <div className="space-y-6">
        {!current ? <Empty>{loc === "sk" ? "Vyberte klienta zo zoznamu." : "Pick a client from the list."}</Empty> : (
          <>
            <Panel title={current.name} action={<Badge tone={current.amlRisk === "high" ? "danger" : current.amlRisk === "medium" ? "accent" : "muted"}>{copy.amlRisk[current.amlRisk]}</Badge>}>
              <KeyValue items={[
                { label: copy.common.type, value: current.type === "company" ? copy.clients.company : copy.clients.person },
                { label: copy.clients.registrationNumber, value: current.registrationNumber },
                { label: "E-mail", value: current.email }, { label: locale(copy), value: current.phone },
                { label: copy.settings.address, value: current.address }, { label: copy.common.date, value: formatDate(current.createdAt, loc) },
              ]} />
              {current.note && <p className="mt-3 rounded-md border border-border p-3 text-sm">{current.note}</p>}
            </Panel>
            <Panel title={copy.clients.kycTitle}>
              <p className="mb-3 text-xs text-muted-foreground">{copy.clients.kycHint}</p>
              <Progress value={(current.kycChecks?.length ?? (current.kyc === "verified" ? 5 : 0)) / KYC_STEPS.length} label={copy.clients.kycTitle} />
              <ul className="mt-3 space-y-1">
                {KYC_STEPS.map((step) => {
                  const done = current.kycChecks ? current.kycChecks.includes(step) : current.kyc === "verified";
                  const label = { identity: copy.clients.kycIdentity, verification: copy.clients.kycVerification, beneficialOwner: copy.clients.kycBeneficialOwner, pep: copy.clients.kycPep, purpose: copy.clients.kycPurpose }[step];
                  return (
                    <li key={step}>
                      <label className="flex min-h-11 items-center gap-3 text-sm">
                        <input type="checkbox" checked={done} onChange={(e) => update((w) => ({ ...w, clients: w.clients.map((c) => {
                          if (c.id !== current.id) return c;
                          const base = c.kycChecks ?? (c.kyc === "verified" ? [...KYC_STEPS] : []);
                          const checks = e.target.checked ? [...new Set([...base, step])] : base.filter((s) => s !== step);
                          return { ...c, kycChecks: checks, kyc: checks.length === KYC_STEPS.length ? "verified" : c.kyc === "expired" ? "expired" : "pending" };
                        }) }))} />
                        {label}
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm"><a href={`${localePath(loc, NAV_ROUTES.documents)}?kind=template`}>{copy.clients.kycRecordTemplate}</a></Button>
              </div>
            </Panel>
            <Panel title={copy.clients.mattersOf}>
              {mattersOf(current.id).length === 0 ? <Empty>{copy.clients.noMatters}</Empty> : (
                <ul className="space-y-2">{mattersOf(current.id).map((m) => {
                  const wip = workInProgress(ws.timeEntries.filter((e) => e.matterId === m.id));
                  return <li key={m.id}><Row href={`${localePath(loc, NAV_ROUTES.matters)}?id=${m.id}`}><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate font-medium">{m.title}</p><p className="text-xs text-muted-foreground">{m.number} · {copy.areas[m.area]}{wip.amount > 0 ? ` · ${copy.matters.unbilled} ${formatEur(wip.amount, loc)}` : ""}</p></div><Badge tone={m.stage === "closed" ? "muted" : "neutral"}>{copy.stages[m.stage]}</Badge></div></Row></li>;
                })}</ul>
              )}
            </Panel>
          </>
        )}
      </div>
      <NewClientDialog open={creating} onClose={() => setCreating(false)} onCreated={(cid) => { setCreating(false); setId(cid); }} />
    </div>
  );
}
