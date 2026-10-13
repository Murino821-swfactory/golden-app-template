"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import { useCopy, useLookups, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { completeViewing, setViewingStatus } from "@/lib/realestate/actions";
import { downloadText, viewingIcs } from "@/lib/realestate/export";
import { formatDate, formatTime, formatWeekday } from "@/lib/realestate/format";
import { addDays, fullName, isoDate, type Viewing, type ViewingOutcome } from "@/lib/realestate/model";
import { ViewingForm } from "./viewing-form";
import { RecordLink, useActionLabels, useAgentName, useNow } from "./shared";
import { ActionMenu, Drawer, EmptyState, Field, PageHeader, Pill, PrimaryButton, SecondaryButton, Select, TextArea, VIEWING_TONE } from "./ui";

function OutcomeForm({ viewing, onDone }: { viewing: Viewing; onDone: () => void }) {
  const c = useCopy();
  const labels = useActionLabels();
  const [outcome, setOutcome] = useState<ViewingOutcome>("interested");
  const [feedback, setFeedback] = useState("");
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); completeViewing(viewing.id, outcome, feedback.trim(), labels); onDone(); }}>
      <Field label={c.viewings.outcome}>{(id) => <Select id={id} value={outcome} onChange={(e) => setOutcome(e.target.value as ViewingOutcome)}>{(["interested", "offer", "undecided", "notInterested"] as ViewingOutcome[]).map((o) => <option key={o} value={o}>{c.viewingOutcome[o]}</option>)}</Select>}</Field>
      <Field label={c.viewings.feedback}>{(id) => <TextArea id={id} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={c.viewings.feedbackPlaceholder} />}</Field>
      <div className="flex justify-end gap-2"><SecondaryButton onClick={onDone}>{c.common.cancel}</SecondaryButton><PrimaryButton type="submit">{c.viewings.saveOutcome}</PrimaryButton></div>
    </form>
  );
}

export function Viewings() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const agentName = useAgentName();
  const now = useNow();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [outcomeFor, setOutcomeFor] = useState<Viewing | null>(null);
  const today = isoDate(now);
  const groups = useMemo(() => {
    if (!ws) return [];
    const tomorrow = isoDate(addDays(now, 1));
    const weekEnd = isoDate(addDays(now, 7));
    const upcoming = ws.viewings.filter((v) => v.status === "scheduled" && v.start >= now.toISOString().slice(0, 10)).sort((a, b) => a.start.localeCompare(b.start));
    const past = ws.viewings.filter((v) => v.status !== "scheduled" || v.start < now.toISOString().slice(0, 10)).sort((a, b) => b.start.localeCompare(a.start));
    const day = (v: Viewing) => isoDate(new Date(v.start));
    return [
      { id: "today", label: c.viewings.today, items: upcoming.filter((v) => day(v) === today) },
      { id: "tomorrow", label: c.viewings.tomorrow, items: upcoming.filter((v) => day(v) === tomorrow) },
      { id: "week", label: c.viewings.thisWeek, items: upcoming.filter((v) => day(v) > tomorrow && day(v) <= weekEnd) },
      { id: "later", label: c.viewings.later, items: upcoming.filter((v) => day(v) > weekEnd) },
      { id: "past", label: c.viewings.past, items: past.slice(0, 12) },
    ].filter((g) => g.items.length > 0);
  }, [ws, now, today, c]);
  if (!ws) return null;
  const ics = (v: Viewing) => {
    const p = lookups.property(v.propertyId);
    const x = lookups.contact(v.contactId);
    downloadText(`viewing-${isoDate(new Date(v.start))}.ics`, viewingIcs(v, `${c.nav.viewings}: ${p?.title ?? ""}`, `${x ? fullName(x) : ""} · ${x?.phone ?? ""}`, p ? `${p.street}, ${p.city}` : ""), "text/calendar");
  };
  return (
    <div className="space-y-6">
      <PageHeader title={c.viewings.title} intro={c.viewings.intro} actions={<PrimaryButton onClick={() => setScheduleOpen(true)}><Plus aria-hidden />{c.viewings.schedule}</PrimaryButton>} />
      {groups.length === 0 ? (
        <EmptyState title={c.viewings.empty} />
      ) : (
        groups.map((g) => (
          <section key={g.id} aria-labelledby={`viewings-${g.id}`} data-testid={`viewings-${g.id}`}>
            <h2 id={`viewings-${g.id}`} className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}{g.id === "today" ? ` · ${formatWeekday(today, locale)}` : ""}</h2>
            <ul className="space-y-2">
              {g.items.map((v) => {
                const p = lookups.property(v.propertyId);
                const x = lookups.contact(v.contactId);
                return (
                  <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
                    <span className="w-24 shrink-0 tabular-nums">
                      <span className="block text-lg font-semibold">{formatTime(v.start, locale)}</span>
                      <span className="block text-xs text-muted-foreground">{formatDate(v.start, locale)} · {c.viewings.duration(v.durationMin)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      {p && <RecordLink link={{ kind: "property", id: p.id }} className="block truncate font-medium">{p.title}</RecordLink>}
                      <span className="block truncate text-sm text-muted-foreground">{c.viewings.with} {x ? <RecordLink link={{ kind: "contact", id: x.id }}>{fullName(x)}</RecordLink> : "—"} · {agentName(v.agentId)}</span>
                      {v.feedback && <span className="mt-1 block text-sm">{v.feedback}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <Pill tone={VIEWING_TONE[v.status]}>{v.outcome ? c.viewingOutcome[v.outcome] : c.viewingStatus[v.status]}</Pill>
                      {v.status === "scheduled" && (
                        <>
                          <button type="button" onClick={() => ics(v)} aria-label={c.viewings.ics} title={c.viewings.ics} className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><CalendarPlus aria-hidden className="size-4" /></button>
                          <ActionMenu label={c.common.actions} trigger={<button type="button" className="min-h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted">{c.common.actions}</button>} items={[
                            { label: c.viewings.complete, onSelect: () => setOutcomeFor(v) },
                            { label: c.viewings.noShow, onSelect: () => setViewingStatus(v.id, "noShow", labels) },
                            { label: c.viewings.cancel, onSelect: () => setViewingStatus(v.id, "cancelled", labels), tone: "danger" },
                          ]} />
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
      <Drawer open={scheduleOpen} onOpenChange={setScheduleOpen} title={c.viewings.schedule} closeLabel={c.common.close}>
        <ViewingForm propertyId={null} contactId={null} demandId={null} onDone={() => setScheduleOpen(false)} />
      </Drawer>
      <Drawer open={outcomeFor !== null} onOpenChange={(o) => !o && setOutcomeFor(null)} title={c.viewings.completeTitle} description={outcomeFor ? lookups.property(outcomeFor.propertyId)?.title : undefined} closeLabel={c.common.close}>
        {outcomeFor && <OutcomeForm viewing={outcomeFor} onDone={() => setOutcomeFor(null)} />}
      </Drawer>
    </div>
  );
}
