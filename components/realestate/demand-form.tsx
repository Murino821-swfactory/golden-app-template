"use client";

import { useState } from "react";
import { useCopy, useCurrentAgent, useWorkspace } from "@/hooks/use-workspace";
import { addDemand, updateDemand } from "@/lib/realestate/actions";
import { FEATURES, PROPERTY_TYPES, SOURCES, TRANSACTIONS, fullName, type Demand, type Feature, type PropertyType, type Source, type Transaction } from "@/lib/realestate/model";
import { Field, FormRow, PrimaryButton, SecondaryButton, Select, TextArea, TextInput, ToggleGroup } from "./ui";

export function DemandForm({ existing, contactId, onDone }: { existing: Demand | null; contactId: string | null; onDone: (id: string | null) => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const agent = useCurrentAgent(ws);
  const [contact, setContact] = useState(existing?.contactId ?? contactId ?? "");
  const [transaction, setTransaction] = useState<Transaction>(existing?.transaction ?? "sale");
  const [types, setTypes] = useState<PropertyType[]>(existing?.types ?? ["apartment"]);
  const [locations, setLocations] = useState(existing?.locations.join(", ") ?? "");
  const [budgetMin, setBudgetMin] = useState(existing?.budgetMin?.toString() ?? "");
  const [budgetMax, setBudgetMax] = useState(existing?.budgetMax?.toString() ?? "");
  const [roomsMin, setRoomsMin] = useState(existing?.roomsMin?.toString() ?? "");
  const [areaMin, setAreaMin] = useState(existing?.areaMin?.toString() ?? "");
  const [mustHaves, setMustHaves] = useState<Feature[]>(existing?.mustHaves ?? []);
  const [source, setSource] = useState<Source>(existing?.source ?? "portal");
  const [agentId, setAgentId] = useState(existing?.agentId ?? agent?.id ?? "");
  const [propertyId, setPropertyId] = useState(existing?.propertyId ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  if (!ws) return null;
  const chosenContact = contact || ws.contacts[0]?.id || "";
  const f = c.demands.form;
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!chosenContact || !budgetMax) return;
        const input = { contactId: chosenContact, transaction, types, locations: locations.split(",").map((l) => l.trim()).filter(Boolean), budgetMin: num(budgetMin), budgetMax: Number(budgetMax), roomsMin: num(roomsMin), areaMin: num(areaMin), mustHaves, source, agentId: agentId || agent?.id || "", propertyId: propertyId || null, notes: notes.trim() };
        if (existing) {
          updateDemand(existing.id, input);
          onDone(existing.id);
        } else onDone(addDemand(input));
      }}
    >
      <Field label={f.contact}>{(id) => <Select id={id} value={chosenContact} onChange={(e) => setContact(e.target.value)} disabled={Boolean(contactId) && !existing}>{ws.contacts.map((x) => <option key={x.id} value={x.id}>{fullName(x)}</option>)}</Select>}</Field>
      <FormRow>
        <Field label={f.transaction}>{(id) => <Select id={id} value={transaction} onChange={(e) => setTransaction(e.target.value as Transaction)}>{TRANSACTIONS.map((t) => <option key={t} value={t}>{c.transaction[t]}</option>)}</Select>}</Field>
        <Field label={f.source}>{(id) => <Select id={id} value={source} onChange={(e) => setSource(e.target.value as Source)}>{SOURCES.map((s) => <option key={s} value={s}>{c.source[s]}</option>)}</Select>}</Field>
      </FormRow>
      <ToggleGroup label={f.types} options={PROPERTY_TYPES.map((t) => ({ value: t, label: c.propertyType[t] }))} value={types} onChange={setTypes} />
      <Field label={f.locations} hint={f.locationsHint}>{(id) => <TextInput id={id} value={locations} onChange={(e) => setLocations(e.target.value)} />}</Field>
      <FormRow className="sm:grid-cols-4">
        <Field label={f.budgetMin}>{(id) => <TextInput id={id} type="number" min={0} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />}</Field>
        <Field label={f.budgetMax} required>{(id) => <TextInput id={id} type="number" min={0} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} required />}</Field>
        <Field label={f.roomsMin}>{(id) => <TextInput id={id} type="number" min={0} value={roomsMin} onChange={(e) => setRoomsMin(e.target.value)} />}</Field>
        <Field label={f.areaMin}>{(id) => <TextInput id={id} type="number" min={0} value={areaMin} onChange={(e) => setAreaMin(e.target.value)} />}</Field>
      </FormRow>
      <ToggleGroup label={f.mustHaves} options={FEATURES.map((x) => ({ value: x, label: c.feature[x] }))} value={mustHaves} onChange={setMustHaves} />
      <FormRow>
        <Field label={f.property}>{(id) => <Select id={id} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}><option value="">{c.common.none}</option>{ws.properties.filter((p) => p.status === "active" || p.status === "reserved" || p.id === propertyId).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>}</Field>
        <Field label={f.agent}>{(id) => <Select id={id} value={agentId} onChange={(e) => setAgentId(e.target.value)}>{ws.agents.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}</Select>}</Field>
      </FormRow>
      <Field label={f.notes}>{(id) => <TextArea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" />}</Field>
      <div className="flex justify-end gap-2">
        <SecondaryButton onClick={() => onDone(existing?.id ?? null)}>{c.common.cancel}</SecondaryButton>
        <PrimaryButton type="submit">{c.common.save}</PrimaryButton>
      </div>
    </form>
  );
}
