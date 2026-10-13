"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { appCopy } from "@/lib/legal/copy";
import { todayIso } from "@/lib/legal/dates";
import { isValidIsoDate } from "@/lib/legal/deadlines";
import { newId, useWorkspace } from "@/lib/legal/store";
import type { ActivityKind } from "@/lib/legal/types";
import { Field, Select, TextInput } from "./ui";

export const ACTIVITY_KINDS: ActivityKind[] = ["consultation", "drafting", "filing", "hearing", "research", "call", "email", "travel", "internal"];

/** Records time on a matter. With `matterId` fixed it sits in the matter; without, in billing. */
export function TimeEntryForm({ matterId: fixedMatterId, onAdded }: { matterId?: string; onAdded: () => void }) {
  const copy = appCopy(useLocale());
  const { ws, update } = useWorkspace();
  const [matterId, setMatterId] = useState(fixedMatterId ?? "");
  const [memberId, setMemberId] = useState(ws?.currentMemberId ?? "");
  const [date, setDate] = useState(todayIso());
  const [minutes, setMinutes] = useState(30);
  const [activity, setActivity] = useState<ActivityKind>("drafting");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  if (!ws) return null;
  const openMatters = ws.matters.filter((m) => m.stage !== "closed");
  const chosen = matterId || openMatters[0]?.id || "";
  const matter = ws.matters.find((m) => m.id === chosen);
  const member = ws.members.find((m) => m.id === (memberId || ws.currentMemberId));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!matter || !member || !isValidIsoDate(date) || minutes < 1 || !description.trim()) return;
        const rate = matter.billing.mode === "hourly" ? (matter.billing.hourlyRate ?? member.hourlyRate ?? ws.settings.defaultHourlyRate) : (member.hourlyRate || ws.settings.defaultHourlyRate);
        update((w) => ({ ...w, timeEntries: [{ id: newId("e"), matterId: matter.id, memberId: member.id, date, minutes, activity, description: description.trim(), billable, rate }, ...w.timeEntries] }));
        setDescription("");
        onAdded();
      }}
      className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-3"
    >
      {!fixedMatterId && (
        <Field label={copy.common.matter} className="sm:col-span-3"><Select value={chosen} onChange={(e) => setMatterId(e.target.value)}>{openMatters.map((m) => <option key={m.id} value={m.id}>{m.number} · {m.title}</option>)}</Select></Field>
      )}
      <Field label={copy.common.assignee}><Select value={member?.id ?? ""} onChange={(e) => setMemberId(e.target.value)}>{ws.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
      <Field label={copy.common.date}><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
      <Field label={copy.billing.minutes}><TextInput type="number" min={5} step={5} max={1440} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></Field>
      <Field label={copy.billing.activity}><Select value={activity} onChange={(e) => setActivity(e.target.value as ActivityKind)}>{ACTIVITY_KINDS.map((a) => <option key={a} value={a}>{copy.activities[a]}</option>)}</Select></Field>
      <Field label={copy.billing.description} className="sm:col-span-2"><TextInput value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={200} /></Field>
      <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} />{copy.billing.billable}</label>
      <div className="flex justify-end"><Button type="submit" className="h-11">{copy.matters.addEntry}</Button></div>
    </form>
  );
}
