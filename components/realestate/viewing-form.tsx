"use client";

import { useState } from "react";
import { useCopy, useCurrentAgent, useWorkspace } from "@/hooks/use-workspace";
import { scheduleViewing } from "@/lib/realestate/actions";
import { fullName, isoDate } from "@/lib/realestate/model";
import { useActionLabels } from "./shared";
import { Field, FormRow, PrimaryButton, SecondaryButton, Select, TextInput } from "./ui";

/** Schedule a viewing: from a listing, from a demand, or from the agenda. */
export function ViewingForm({ propertyId, contactId, demandId, onDone }: { propertyId: string | null; contactId: string | null; demandId: string | null; onDone: () => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const labels = useActionLabels();
  const agent = useCurrentAgent(ws);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [property, setProperty] = useState(propertyId ?? "");
  const [contact, setContact] = useState(contactId ?? "");
  const [agentId, setAgentId] = useState(agent?.id ?? "");
  const [date, setDate] = useState(isoDate(tomorrow));
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(45);
  if (!ws) return null;
  const properties = ws.properties.filter((p) => p.status === "active" || p.status === "reserved" || p.status === "preparation" || p.id === property);
  const chosenProperty = property || properties[0]?.id || "";
  const chosenContact = contact || ws.contacts[0]?.id || "";
  const f = c.viewings.form;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!chosenProperty || !chosenContact) return;
        const demand = demandId ?? ws.demands.find((d) => d.contactId === chosenContact && d.status !== "won" && d.status !== "lost")?.id ?? null;
        scheduleViewing({ propertyId: chosenProperty, contactId: chosenContact, demandId: demand, agentId: agentId || agent?.id || "", start: new Date(`${date}T${time}:00`).toISOString(), durationMin: duration }, labels);
        onDone();
      }}
    >
      <Field label={f.property}>{(id) => <Select id={id} value={chosenProperty} onChange={(e) => setProperty(e.target.value)}>{properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>}</Field>
      <Field label={f.contact}>{(id) => <Select id={id} value={chosenContact} onChange={(e) => setContact(e.target.value)}>{ws.contacts.map((x) => <option key={x.id} value={x.id}>{fullName(x)}</option>)}</Select>}</Field>
      <FormRow className="sm:grid-cols-3">
        <Field label={f.date}>{(id) => <TextInput id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />}</Field>
        <Field label={f.time}>{(id) => <TextInput id={id} type="time" value={time} onChange={(e) => setTime(e.target.value)} required />}</Field>
        <Field label={f.duration}>{(id) => <TextInput id={id} type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 30)} />}</Field>
      </FormRow>
      <Field label={f.agent}>{(id) => <Select id={id} value={agentId} onChange={(e) => setAgentId(e.target.value)}>{ws.agents.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}</Select>}</Field>
      <div className="flex justify-end gap-2">
        <SecondaryButton onClick={onDone}>{c.common.cancel}</SecondaryButton>
        <PrimaryButton type="submit">{c.viewings.schedule}</PrimaryButton>
      </div>
    </form>
  );
}
