"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useActionLabels, useCopy, useLookups, useWorkspace } from "@/hooks/use-workspace";
import { saveScorecard, scheduleInterview } from "@/lib/recruiting/actions";
import { INTERVIEW_TYPES, RECOMMENDATIONS, fullName, type InterviewType, type Recommendation, type Scorecard } from "@/lib/recruiting/model";
import { openApplications } from "@/lib/recruiting/metrics";
import { cn } from "@/lib/utils";
import { Drawer, Field, FormRow, PrimaryButton, SecondaryButton, Select, TextArea, TextInput } from "./ui";

function defaultDateTime(): { date: string; time: string } {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:00` };
}

/** Book an interview for an open application. `applicationId` preselects one (from a card). */
export function ScheduleInterviewDrawer({ open, onOpenChange, applicationId }: { open: boolean; onOpenChange: (o: boolean) => void; applicationId?: string | null }) {
  const ws = useWorkspace();
  const c = useCopy();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const apps = useMemo(() => (ws ? openApplications(ws) : []), [ws]);
  const initial = defaultDateTime();
  const [appId, setAppId] = useState(applicationId ?? "");
  const [type, setType] = useState<InterviewType>("client");
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [duration, setDuration] = useState("60");
  const [interviewer, setInterviewer] = useState("");
  const [place, setPlace] = useState("");
  const chosen = appId || applicationId || "";

  function submit() {
    const target = chosen || apps[0]?.id;
    if (!target || !date || !time) return;
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
    scheduleInterview({ applicationId: target, type, scheduledAt, durationMinutes: Number(duration) || 60, interviewer: interviewer.trim(), place: place.trim() }, labels);
    onOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={c.interviews.scheduleTitle} closeLabel={c.common.close}>
      {apps.length === 0 ? (
        <p className="text-sm text-muted-foreground">{c.interviews.noApplications}</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label={c.interviews.form.application} required>
            {(id) => (
              <Select id={id} value={chosen || apps[0]!.id} onChange={(e) => setAppId(e.target.value)}>
                {apps.map((a) => {
                  const cand = lookups.candidate(a.candidateId);
                  const job = lookups.job(a.jobId);
                  return (
                    <option key={a.id} value={a.id}>
                      {cand ? fullName(cand) : "?"} · {job?.title ?? "?"}
                    </option>
                  );
                })}
              </Select>
            )}
          </Field>
          <FormRow>
            <Field label={c.interviews.form.type}>
              {(id) => (
                <Select id={id} value={type} onChange={(e) => setType(e.target.value as InterviewType)}>
                  {INTERVIEW_TYPES.map((t) => (
                    <option key={t} value={t}>{c.interviewType[t]}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={c.interviews.form.duration}>{(id) => <TextInput id={id} type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(e.target.value)} />}</Field>
            <Field label={c.interviews.form.date} required>{(id) => <TextInput id={id} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
            <Field label={c.interviews.form.time} required>{(id) => <TextInput id={id} type="time" required value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
          </FormRow>
          <Field label={c.interviews.form.interviewer}>{(id) => <TextInput id={id} value={interviewer} onChange={(e) => setInterviewer(e.target.value)} />}</Field>
          <Field label={c.interviews.form.place} hint={c.interviews.form.placeHint}>{(id) => <TextInput id={id} value={place} onChange={(e) => setPlace(e.target.value)} />}</Field>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <SecondaryButton onClick={() => onOpenChange(false)}>{c.common.cancel}</SecondaryButton>
            <PrimaryButton type="submit">{c.interviews.schedule}</PrimaryButton>
          </div>
        </form>
      )}
    </Drawer>
  );
}

/** The structured scorecard: same criteria for every candidate on the job. */
export function ScorecardDrawer({ interviewId, open, onOpenChange }: { interviewId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useLocale();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const interview = ws?.interviews.find((i) => i.id === interviewId) ?? null;
  const app = interview ? lookups.application(interview.applicationId) : undefined;
  const candidate = app ? lookups.candidate(app.candidateId) : undefined;
  const job = app ? lookups.job(app.jobId) : undefined;

  const [card, setCard] = useState<Scorecard>(
    () => interview?.scorecard ?? { criteria: c.interviews.defaultCriteria.map((name) => ({ name, score: null, note: "" })), recommendation: null, summary: "" }
  );
  const average = useMemo(() => {
    const scores = card.criteria.map((x) => x.score).filter((s): s is number => s !== null);
    return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "—";
  }, [card]);

  if (!interview) return null;

  return (
    <Drawer
      key={interview.id}
      open={open}
      onOpenChange={onOpenChange}
      title={c.interviews.scorecardTitle}
      description={`${candidate ? fullName(candidate) : "?"} · ${job?.title ?? "?"} · ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(interview.scheduledAt))}`}
      closeLabel={c.common.close}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {c.interviews.average}: <span className="font-medium tabular-nums text-foreground">{average}</span> / 5
          </span>
          <PrimaryButton
            onClick={() => {
              saveScorecard(interview.id, card, labels);
              onOpenChange(false);
            }}
          >
            {c.interviews.saveScorecard}
          </PrimaryButton>
        </div>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">{c.interviews.scorecardIntro}</p>
      <ol className="space-y-3">
        {card.criteria.map((criterion, i) => (
          <li key={criterion.name} className="rounded-xl bg-background/60 p-3 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{criterion.name}</span>
              <div className="inline-flex rounded-lg border border-border p-0.5" role="group" aria-label={`${c.interviews.rating}: ${criterion.name}`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={criterion.score === n}
                    onClick={() => setCard((prev) => ({ ...prev, criteria: prev.criteria.map((x, k) => (k === i ? { ...x, score: n } : x)) }))}
                    className={cn("min-h-9 min-w-9 rounded-md text-sm tabular-nums", criterion.score === n ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <TextInput
              aria-label={`${c.common.notes}: ${criterion.name}`}
              value={criterion.note}
              placeholder={c.common.notes}
              onChange={(e) => setCard((prev) => ({ ...prev, criteria: prev.criteria.map((x, k) => (k === i ? { ...x, note: e.target.value } : x)) }))}
              className="mt-2 min-h-9 text-sm"
            />
          </li>
        ))}
      </ol>
      <div className="mt-5 space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">{c.interviews.recommendation}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={c.interviews.recommendation}>
            {RECOMMENDATIONS.map((r: Recommendation) => (
              <button
                key={r}
                type="button"
                aria-pressed={card.recommendation === r}
                onClick={() => setCard((prev) => ({ ...prev, recommendation: r }))}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-sm",
                  card.recommendation === r ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {c.recommendation[r]}
              </button>
            ))}
          </div>
        </div>
        <Field label={c.interviews.summary}>{(id) => <TextArea id={id} value={card.summary} onChange={(e) => setCard((prev) => ({ ...prev, summary: e.target.value }))} />}</Field>
      </div>
    </Drawer>
  );
}
