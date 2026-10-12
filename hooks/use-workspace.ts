"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { RECRUITING_COPY, recruitingLocale, type RecruitingCopy, type RecruitingLocale } from "@/lib/recruiting/copy";
import type { ActionLabels } from "@/lib/recruiting/actions";
import type { Application, Candidate, Client, Job, Workspace } from "@/lib/recruiting/model";
import { getServerSnapshot, getSnapshot, initWorkspace, subscribe } from "@/lib/recruiting/store";

/** The workspace, or `null` before the client has loaded it. */
export function useWorkspace(): Workspace | null {
  const locale = useRecruitingLocale();
  useEffect(() => initWorkspace(locale), [locale]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useRecruitingLocale(): RecruitingLocale {
  return recruitingLocale(useLocale());
}

export function useCopy(): RecruitingCopy {
  return RECRUITING_COPY[useRecruitingLocale()];
}

/** Id → record maps, so a card can name its candidate and job without a search per row. */
export interface Lookups {
  client: (id: string) => Client | undefined;
  job: (id: string) => Job | undefined;
  candidate: (id: string) => Candidate | undefined;
  application: (id: string) => Application | undefined;
}

export function useLookups(ws: Workspace | null): Lookups {
  return useMemo(() => {
    const clients = new Map(ws?.clients.map((c) => [c.id, c]));
    const jobs = new Map(ws?.jobs.map((j) => [j.id, j]));
    const candidates = new Map(ws?.candidates.map((c) => [c.id, c]));
    const applications = new Map(ws?.applications.map((a) => [a.id, a]));
    return {
      client: (id) => clients.get(id),
      job: (id) => jobs.get(id),
      candidate: (id) => candidates.get(id),
      application: (id) => applications.get(id),
    };
  }, [ws]);
}

/** The words the actions write into the timeline, in the language on screen. */
export function useActionLabels(): ActionLabels {
  const c = useCopy();
  return useMemo<ActionLabels>(
    () => ({
      stage: (stage) => c.stages[stage],
      stageChanged: (stage) => `${c.activityType.stage}: ${stage}`,
      rejected: (reason) => `${c.stages.rejected}: ${reason}`,
      reopened: c.pipeline.reopen,
      placed: (job) => `${c.stages.placed}: ${job}`,
      interviewScheduled: (type) => `${c.interviews.schedule}: ${type}`,
      scorecardSaved: c.interviews.scorecard,
      consentGranted: c.consentStatus.granted,
      consentWithdrawn: c.consentStatus.withdrawn,
      anonymized: c.candidates.detail.anonymized,
      addedToJob: (job) => `${c.candidates.detail.addToPipeline}: ${job}`,
      scored: (score) => c.pipeline.score(score),
      rejectionReason: (reason) => c.rejectionReason[reason],
      interviewType: (type) => c.interviewType[type],
    }),
    [c]
  );
}
