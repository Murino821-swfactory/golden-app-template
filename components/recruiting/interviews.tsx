"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { CalendarPlus, ClipboardList, MoreHorizontal } from "lucide-react";
import { useCopy, useLookups, useWorkspace } from "@/hooks/use-workspace";
import { setInterviewStatus } from "@/lib/recruiting/actions";
import { interviewIcs, downloadText } from "@/lib/recruiting/export";
import { fullName, isoDate, type Interview } from "@/lib/recruiting/model";
import { formatDate, formatTime } from "@/lib/recruiting/metrics";
import { ScheduleInterviewDrawer, ScorecardDrawer } from "./interview-dialog";
import { ActionMenu, Avatar, EmptyState, PageHeader, Pill, PrimaryButton, TextButton, type Tone } from "./ui";
import { RecordLink, useNow } from "./shared";

const STATUS_TONE: Record<Interview["status"], Tone> = { scheduled: "info", done: "good", cancelled: "neutral", "no-show": "bad" };

export function InterviewsView() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useLocale();
  const lookups = useLookups(ws);
  const now = useNow();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scorecardId, setScorecardId] = useState<string | null>(null);

  const { upcoming, past } = useMemo(() => {
    const all = ws ? [...ws.interviews] : [];
    const cutoff = now.getTime() - 3600_000;
    const upcoming = all.filter((i) => i.status === "scheduled" && new Date(i.scheduledAt).getTime() >= cutoff).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    const past = all.filter((i) => !upcoming.includes(i)).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
    return { upcoming, past };
  }, [ws, now]);

  if (!ws) return null;
  const today = isoDate(now);
  const tomorrow = isoDate(new Date(now.getTime() + 86_400_000));
  const dayLabel = (iso: string) => {
    const d = iso.slice(0, 10);
    if (d === today) return c.common.today;
    if (d === tomorrow) return c.common.tomorrow;
    return formatDate(d, locale);
  };

  const groups = upcoming.reduce<{ day: string; items: Interview[] }[]>((acc, i) => {
    const day = dayLabel(i.scheduledAt);
    const last = acc[acc.length - 1];
    if (last && last.day === day) last.items.push(i);
    else acc.push({ day, items: [i] });
    return acc;
  }, []);

  function Row({ i }: { i: Interview }) {
    const app = lookups.application(i.applicationId);
    const cand = app && lookups.candidate(app.candidateId);
    const job = app && lookups.job(app.jobId);
    const name = cand ? fullName(cand) : "?";
    const summary = `${name} · ${job?.title ?? ""}`;
    return (
      <li className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
        <span className="w-14 shrink-0 text-sm font-semibold tabular-nums">{formatTime(i.scheduledAt, locale)}</span>
        <Avatar name={name} className="size-8 text-[11px]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {cand ? <RecordLink route="/workspace/candidates" id={cand.id}>{name}</RecordLink> : name}
            <span className="font-normal text-muted-foreground"> · {job?.title}</span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {c.interviewType[i.type]} · {c.common.minutes(i.durationMinutes)}{i.interviewer ? ` · ${c.interviews.with} ${i.interviewer}` : ""}{i.place ? ` · ${i.place}` : ""}
          </span>
        </span>
        <Pill tone={STATUS_TONE[i.status]}>{c.interviewStatus[i.status]}</Pill>
        <span className="flex items-center gap-1">
          <TextButton onClick={() => setScorecardId(i.id)}>
            <ClipboardList aria-hidden /> {i.scorecard ? c.interviews.scored : c.interviews.openScorecard}
          </TextButton>
          <ActionMenu
            label={c.common.actions}
            trigger={<button type="button" className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={c.common.actions}><MoreHorizontal aria-hidden className="size-4" /></button>}
            items={[
              { label: c.interviews.downloadIcs, onSelect: () => downloadText(`interview-${i.id}.ics`, interviewIcs(i, summary, `${c.interviewType[i.type]}${i.interviewer ? ` — ${i.interviewer}` : ""}`), "text/calendar") },
              { label: c.interviews.markDone, onSelect: () => setInterviewStatus(i.id, "done"), disabled: i.status === "done" },
              { label: c.interviews.noShow, onSelect: () => setInterviewStatus(i.id, "no-show"), disabled: i.status === "no-show" },
              { label: c.interviews.cancel, onSelect: () => setInterviewStatus(i.id, "cancelled"), disabled: i.status === "cancelled", tone: "danger" },
            ]}
          />
        </span>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={c.interviews.title} intro={c.interviews.intro} actions={<PrimaryButton onClick={() => setScheduleOpen(true)}><CalendarPlus aria-hidden /> {c.interviews.schedule}</PrimaryButton>} />

      <section className="space-y-4" aria-label={c.interviews.upcoming}>
        <h2 className="text-base font-semibold">{c.interviews.upcoming}</h2>
        {groups.length === 0 ? (
          <EmptyState title={c.interviews.empty} action={<PrimaryButton onClick={() => setScheduleOpen(true)}>{c.interviews.schedule}</PrimaryButton>} />
        ) : (
          groups.map((g) => (
            <div key={g.day} className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.day}</h3>
              <ul className="space-y-2">{g.items.map((i) => <Row key={i.id} i={i} />)}</ul>
            </div>
          ))
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3" aria-label={c.interviews.past}>
          <h2 className="text-base font-semibold">{c.interviews.past}</h2>
          <ul className="space-y-2">
            {past.map((i) => (
              <li key={i.id} className="contents">
                <ul className="contents">
                  <Row i={i} />
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {scheduleOpen && <ScheduleInterviewDrawer open onOpenChange={(o) => !o && setScheduleOpen(false)} />}
      {scorecardId && <ScorecardDrawer open onOpenChange={(o) => !o && setScorecardId(null)} interviewId={scorecardId} />}
    </div>
  );
}
