"use client";

import { useMemo, useState } from "react";
import { useCopy, useCurrentAgent, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { addTask, deleteTask, toggleTask } from "@/lib/realestate/actions";
import { formatDate } from "@/lib/realestate/format";
import { isoDate, type Task, type TaskPriority } from "@/lib/realestate/model";
import { cn } from "@/lib/utils";
import { RecordLink, useAgentName, useLinkName, useNow } from "./shared";
import { Checkbox, EmptyState, Field, FormRow, PageHeader, Panel, Pill, PrimaryButton, Select, TextButton, TextInput } from "./ui";

const PRIORITY_TONE: Record<TaskPriority, "neutral" | "info" | "bad"> = { low: "neutral", normal: "info", high: "bad" };

export function Tasks() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const agent = useCurrentAgent(ws);
  const agentName = useAgentName();
  const linkName = useLinkName();
  const now = useNow();
  const today = isoDate(now);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(today);
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [assignee, setAssignee] = useState("");
  const [showDone, setShowDone] = useState(false);
  const groups = useMemo(() => {
    if (!ws) return [];
    const open = ws.tasks.filter((t) => !t.done).sort((a, b) => a.due.localeCompare(b.due));
    return [
      { id: "overdue", label: c.tasks.overdue, items: open.filter((t) => t.due < today) },
      { id: "today", label: c.tasks.today, items: open.filter((t) => t.due === today) },
      { id: "upcoming", label: c.tasks.upcoming, items: open.filter((t) => t.due > today) },
      { id: "done", label: c.tasks.done, items: showDone ? ws.tasks.filter((t) => t.done) : [] },
    ].filter((g) => g.items.length > 0);
  }, [ws, today, showDone, c]);
  if (!ws) return null;
  const row = (t: Task) => (
    <li key={t.id} data-testid="task-row" className={cn("flex flex-wrap items-center gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10", t.done && "opacity-60")}>
      <Checkbox label="" checked={t.done} onChange={() => toggleTask(t.id)} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-medium", t.done && "line-through")}>{t.title}</span>
        <span className="block text-xs text-muted-foreground">
          {formatDate(t.due, locale)} · {agentName(t.agentId)}
          {t.link && <> · <RecordLink link={t.link}>{linkName(t.link)}</RecordLink></>}
        </span>
      </span>
      <Pill tone={PRIORITY_TONE[t.priority]}>{c.taskPriority[t.priority]}</Pill>
      <TextButton onClick={() => deleteTask(t.id)} aria-label={c.tasks.deleteTask}>{c.common.delete}</TextButton>
    </li>
  );
  return (
    <div className="space-y-6">
      <PageHeader title={c.tasks.title} intro={c.tasks.intro} />
      <Panel title={c.tasks.add}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            addTask({ title: title.trim(), due, priority, agentId: assignee || agent?.id || "", link: null });
            setTitle("");
          }}
        >
          <Field label={c.tasks.add}>{(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={c.tasks.placeholder} />}</Field>
          <FormRow className="sm:grid-cols-4">
            <Field label={c.tasks.due}>{(id) => <TextInput id={id} type="date" value={due} onChange={(e) => setDue(e.target.value)} />}</Field>
            <Field label={c.tasks.priority}>{(id) => <Select id={id} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>{(["low", "normal", "high"] as TaskPriority[]).map((p) => <option key={p} value={p}>{c.taskPriority[p]}</option>)}</Select>}</Field>
            <Field label={c.tasks.assignee}>{(id) => <Select id={id} value={assignee || agent?.id || ""} onChange={(e) => setAssignee(e.target.value)}>{ws.agents.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}</Select>}</Field>
            <div className="flex items-end"><PrimaryButton type="submit" disabled={!title.trim()} className="w-full">{c.common.add}</PrimaryButton></div>
          </FormRow>
        </form>
      </Panel>
      <Checkbox label={c.tasks.showDone} checked={showDone} onChange={setShowDone} />
      {groups.length === 0 ? <EmptyState title={c.tasks.empty} /> : groups.map((g) => (
        <section key={g.id} aria-labelledby={`tasks-${g.id}`} data-testid={`tasks-${g.id}`}>
          <h2 id={`tasks-${g.id}`} className={cn("mb-2 text-xs font-semibold uppercase tracking-wide", g.id === "overdue" ? "text-rose-300" : "text-muted-foreground")}>{g.label} · {g.items.length}</h2>
          <ul className="space-y-2">{g.items.map(row)}</ul>
        </section>
      ))}
    </div>
  );
}
