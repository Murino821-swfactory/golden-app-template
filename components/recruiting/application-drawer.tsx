"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { CalendarPlus, Handshake, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { analyzeCv } from "@/lib/cv-analyzer";
import { COPY as MATCHER_COPY } from "@/lib/cv-matcher-copy";
import { useActionLabels, useCopy, useLookups, useWorkspace } from "@/hooks/use-workspace";
import { moveApplication, rejectApplication, reopenApplication, setApplicationScore } from "@/lib/recruiting/actions";
import { REJECTION_REASONS, STAGES, fullName, type RejectionReason, type Stage } from "@/lib/recruiting/model";
import { daysInCurrentStage, formatDateTime } from "@/lib/recruiting/metrics";
import { ScheduleInterviewDrawer, ScorecardDrawer } from "./interview-dialog";
import { PlacementDrawer } from "./placement-dialog";
import { Avatar, Drawer, Field, Pill, PrimaryButton, SecondaryButton, Select, TextButton, TextInput } from "./ui";
import { Chips, RecordLink, ScorePill, StagePill, Timeline, useNow } from "./shared";

/**
 * One application — a candidate in a job's process — with everything a recruiter does to
 * it: move it, score it, book the interview, reject with a reason, turn an offer into a
 * placement. Opened from the pipeline, a candidate's profile or a job's pipeline alike.
 */
export function ApplicationDrawer({ applicationId, open, onOpenChange }: { applicationId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useLocale();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const now = useNow();
  const m = MATCHER_COPY[locale === "sk" ? "sk" : "en"];
  const app = applicationId ? lookups.application(applicationId) : undefined;
  const candidate = app ? lookups.candidate(app.candidateId) : undefined;
  const job = app ? lookups.job(app.jobId) : undefined;
  const client = job ? lookups.client(job.clientId) : undefined;

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<RejectionReason>("skills");
  const [note, setNote] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [scorecardId, setScorecardId] = useState<string | null>(null);

  const analysis = useMemo(() => (candidate && job ? analyzeCv(candidate.cvText, job.description) : null), [candidate, job]);
  const interviews = useMemo(() => (ws && app ? ws.interviews.filter((i) => i.applicationId === app.id).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)) : []), [ws, app]);
  const activities = useMemo(() => (ws && app ? ws.activities.filter((a) => a.candidateId === app.candidateId && a.jobId === app.jobId) : []), [ws, app]);

  if (!ws || !app || !candidate || !job) return null;
  const terminal = app.stage === "placed" || app.stage === "rejected";
  const canScore = Boolean(candidate.cvText.trim()) && Boolean(job.description.trim());

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} title={`${fullName(candidate)} · ${job.title}`} description={client?.name} closeLabel={c.common.close} wide>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={fullName(candidate)} />
            <div className="min-w-0 flex-1 text-sm">
              <RecordLink route="/workspace/candidates" id={candidate.id} className="font-medium">{c.pipeline.openCandidate}</RecordLink>
              <span className="text-muted-foreground"> · </span>
              <RecordLink route="/workspace/jobs" id={job.id} className="font-medium">{c.pipeline.openJob}</RecordLink>
            </div>
            <StagePill stage={app.stage} />
            <span className="text-xs text-muted-foreground">{c.pipeline.daysInStage(daysInCurrentStage(app, now))}</span>
          </div>

          {!terminal && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{c.pipeline.moveTo}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={c.pipeline.moveTo}>
                {STAGES.map((stage: Stage) => (
                  <button
                    key={stage}
                    type="button"
                    aria-pressed={app.stage === stage}
                    onClick={() => (stage === "placed" ? setPlaceOpen(true) : moveApplication(app.id, stage, labels))}
                    className={
                      app.stage === stage
                        ? "min-h-10 rounded-full border border-foreground bg-foreground px-4 text-sm text-background"
                        : "min-h-10 rounded-full border border-border px-4 text-sm text-muted-foreground hover:text-foreground"
                    }
                  >
                    {c.stages[stage]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!terminal && (
              <SecondaryButton onClick={() => setScheduleOpen(true)}>
                <CalendarPlus aria-hidden /> {c.pipeline.scheduleInterview}
              </SecondaryButton>
            )}
            {!terminal && (
              <SecondaryButton onClick={() => setPlaceOpen(true)}>
                <Handshake aria-hidden /> {c.pipeline.place}
              </SecondaryButton>
            )}
            {!terminal && (
              <SecondaryButton onClick={() => setRejecting((v) => !v)} aria-expanded={rejecting}>
                <XCircle aria-hidden /> {c.pipeline.reject}
              </SecondaryButton>
            )}
            {app.stage === "rejected" && (
              <SecondaryButton onClick={() => reopenApplication(app.id, labels)}>
                <RotateCcw aria-hidden /> {c.pipeline.reopen}
              </SecondaryButton>
            )}
          </div>

          {rejecting && !terminal && (
            <form
              className="space-y-3 rounded-xl border border-rose-400/30 bg-rose-400/5 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                rejectApplication(app.id, reason, note.trim(), labels);
                setRejecting(false);
                setNote("");
              }}
            >
              <p className="text-sm font-medium">{c.pipeline.rejectTitle}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={c.pipeline.rejectReason}>
                  {(id) => (
                    <Select id={id} value={reason} onChange={(e) => setReason(e.target.value as RejectionReason)}>
                      {REJECTION_REASONS.map((r) => (
                        <option key={r} value={r}>{c.rejectionReason[r]}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label={c.pipeline.rejectNote}>{(id) => <TextInput id={id} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
              </div>
              <div className="flex justify-end gap-2">
                <SecondaryButton onClick={() => setRejecting(false)}>{c.common.cancel}</SecondaryButton>
                <PrimaryButton type="submit">{c.pipeline.reject}</PrimaryButton>
              </div>
            </form>
          )}

          {app.rejection && (
            <p className="text-sm text-muted-foreground">
              {c.rejectionReason[app.rejection.reason]}
              {app.rejection.note ? ` — ${app.rejection.note}` : ""}
            </p>
          )}

          <section className="space-y-3 rounded-xl bg-background/60 p-4 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{c.matcher.title}</h3>
              <div className="flex items-center gap-2">
                <ScorePill score={app.score} />
                {canScore && analysis && (
                  <TextButton onClick={() => setApplicationScore(app.id, analysis.score, labels)}>
                    <Sparkles aria-hidden /> {c.pipeline.scoreNow}
                  </TextButton>
                )}
              </div>
            </div>
            {!canScore && <p className="text-sm text-muted-foreground">{candidate.cvText.trim() ? c.pipeline.scoreMissingJd : c.pipeline.scoreMissingCv}</p>}
            {analysis && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">{analysis.matched.length} · {m.matched}</p>
                  <Chips items={analysis.matched.map((h) => h.skill.name)} tone="good" max={8} />
                </div>
                <div>
                  <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">{analysis.missing.length} · {m.missing}</p>
                  <Chips items={analysis.missing.map((h) => h.skill.name)} tone="bad" max={8} />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{c.nav.interviews}</h3>
            {interviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.interviews.empty}</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
                {interviews.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{formatDateTime(i.scheduledAt, locale)}</span>
                      <span className="text-muted-foreground"> · {c.interviewType[i.type]}{i.interviewer ? ` · ${i.interviewer}` : ""}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Pill tone={i.status === "done" ? "good" : i.status === "scheduled" ? "info" : "neutral"}>{c.interviewStatus[i.status]}</Pill>
                      <TextButton onClick={() => setScorecardId(i.id)}>{i.scorecard ? c.interviews.scored : c.interviews.openScorecard}</TextButton>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{c.candidates.detail.timeline}</h3>
            <Timeline activities={activities} refs={{ candidateId: candidate.id, jobId: job.id }} empty={c.candidates.detail.noActivity} />
          </section>
        </div>
      </Drawer>
      {scheduleOpen && <ScheduleInterviewDrawer open={scheduleOpen} onOpenChange={setScheduleOpen} applicationId={app.id} />}
      {placeOpen && <PlacementDrawer open={placeOpen} onOpenChange={setPlaceOpen} applicationId={app.id} />}
      {scorecardId && <ScorecardDrawer open={Boolean(scorecardId)} onOpenChange={(o) => !o && setScorecardId(null)} interviewId={scorecardId} />}
    </>
  );
}
