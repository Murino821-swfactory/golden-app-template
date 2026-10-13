"use client";

import { useState } from "react";
import { useCopy, useCurrentAgent, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { createDeal } from "@/lib/realestate/actions";
import { formatMoney } from "@/lib/realestate/format";
import { commissionAmount } from "@/lib/realestate/metrics";
import { addDays, fullName, isoDate, type CommissionBasis, type CommissionPayer } from "@/lib/realestate/model";
import { useActionLabels } from "./shared";
import { Field, FormRow, PrimaryButton, SecondaryButton, Select, TextArea, TextInput } from "./ui";

/** Open a deal for a listing: the buyer (or tenant), the price and the commission terms. */
export function DealForm({ propertyId, demandId, onDone }: { propertyId: string | null; demandId: string | null; onDone: (id: string | null) => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const labels = useActionLabels();
  const agent = useCurrentAgent(ws);
  const demand = demandId ? ws?.demands.find((d) => d.id === demandId) : undefined;
  const initialProperty = propertyId ?? demand?.propertyId ?? "";
  const [property, setProperty] = useState(initialProperty);
  const [buyer, setBuyer] = useState(demand?.contactId ?? "");
  const [price, setPrice] = useState<number>(ws?.properties.find((p) => p.id === initialProperty)?.price ?? 0);
  const [basis, setBasis] = useState<CommissionBasis | null>(null);
  const [value, setValue] = useState<number | null>(null);
  const [payer, setPayer] = useState<CommissionPayer | null>(null);
  const [expectedClose, setExpectedClose] = useState(isoDate(addDays(new Date(), 60)));
  const [agentId, setAgentId] = useState(agent?.id ?? "");
  const [notes, setNotes] = useState("");
  if (!ws) return null;
  const candidates = ws.properties.filter((p) => p.status !== "sold" && p.status !== "rented" && p.status !== "withdrawn");
  const chosenProperty = ws.properties.find((p) => p.id === property) ?? candidates[0];
  const chosenBuyer = buyer || ws.contacts.find((x) => x.roles.includes(chosenProperty?.transaction === "rent" ? "tenant" : "buyer"))?.id || ws.contacts[0]?.id || "";
  const commission = { basis: basis ?? chosenProperty?.commission.basis ?? "percent", value: value ?? chosenProperty?.commission.value ?? ws.settings.saleCommissionPct };
  const chosenPayer: CommissionPayer = payer ?? (chosenProperty?.transaction === "rent" ? "landlord" : "seller");
  const f = c.deals.form;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!chosenProperty || !chosenBuyer) return;
        const id = createDeal({ propertyId: chosenProperty.id, buyerId: chosenBuyer, sellerId: chosenProperty.ownerId, demandId: demandId ?? ws.demands.find((d) => d.contactId === chosenBuyer && d.status !== "won" && d.status !== "lost")?.id ?? null, transaction: chosenProperty.transaction, agreedPrice: price || chosenProperty.price, commission: { ...commission, payer: chosenPayer }, expectedClose, agentId: agentId || agent?.id || "", notes }, labels);
        onDone(id);
      }}
    >
      <Field label={f.property}>{(id) => <Select id={id} value={chosenProperty?.id ?? ""} onChange={(e) => { setProperty(e.target.value); setPrice(ws.properties.find((p) => p.id === e.target.value)?.price ?? 0); }}>{candidates.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>}</Field>
      <Field label={f.buyer}>{(id) => <Select id={id} value={chosenBuyer} onChange={(e) => setBuyer(e.target.value)}>{ws.contacts.map((x) => <option key={x.id} value={x.id}>{fullName(x)}</option>)}</Select>}</Field>
      <FormRow>
        <Field label={f.price}>{(id) => <TextInput id={id} type="number" min={0} value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} required />}</Field>
        <Field label={f.expectedClose}>{(id) => <TextInput id={id} type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} />}</Field>
        <Field label={f.commissionBasis}>{(id) => <Select id={id} value={commission.basis} onChange={(e) => setBasis(e.target.value as CommissionBasis)}><option value="percent">{c.commissionBasis.percent}</option><option value="fixed">{c.commissionBasis.fixed}</option><option value="months">{c.commissionBasis.months}</option></Select>}</Field>
        <Field label={f.commissionValue} hint={formatMoney(commissionAmount(commission, price || chosenProperty?.price || 0), locale)}>{(id) => <TextInput id={id} type="number" min={0} step="0.1" value={commission.value} onChange={(e) => setValue(Number(e.target.value))} />}</Field>
        <Field label={f.payer}>{(id) => <Select id={id} value={chosenPayer} onChange={(e) => setPayer(e.target.value as CommissionPayer)}>{(["seller", "buyer", "both", "landlord", "tenant"] as CommissionPayer[]).map((p) => <option key={p} value={p}>{c.payer[p]}</option>)}</Select>}</Field>
        <Field label={f.agent}>{(id) => <Select id={id} value={agentId} onChange={(e) => setAgentId(e.target.value)}>{ws.agents.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}</Select>}</Field>
      </FormRow>
      <Field label={f.notes}>{(id) => <TextArea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" />}</Field>
      <div className="flex justify-end gap-2">
        <SecondaryButton onClick={() => onDone(null)}>{c.common.cancel}</SecondaryButton>
        <PrimaryButton type="submit">{c.deals.create}</PrimaryButton>
      </div>
    </form>
  );
}
