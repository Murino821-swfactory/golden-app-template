"use client";

import { useCallback, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { CvMatcher } from "@/components/features/cv-matcher";
import type { AnalysisResult } from "@/lib/cv-analyzer";
import { useActionLabels, useCopy, useWorkspace } from "@/hooks/use-workspace";
import { setApplicationScore } from "@/lib/recruiting/actions";
import { fullName } from "@/lib/recruiting/model";
import { isOpenJob } from "@/lib/recruiting/metrics";
import { Field, FormRow, PageHeader, PrimaryButton, Select, Status } from "./ui";

/**
 * The original CV Matcher, inside the workspace: pick a candidate and a job and the
 * texts come from the desk; the score can be written back to the application.
 */
export function MatcherView() {
  const ws = useWorkspace();
  const c = useCopy();
  const labels = useActionLabels();
  const [candidateId, setCandidateId] = useState("");
  const [jobId, setJobId] = useState("");
  const [texts, setTexts] = useState({ cv: "", job: "" });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState("");
  const onResult = useCallback((r: AnalysisResult | null) => setResult(r), []);

  const candidates = useMemo(() => (ws ? ws.candidates.filter((x) => !x.anonymized && x.cvText.trim()) : []), [ws]);
  const jobs = useMemo(() => (ws ? ws.jobs.filter((j) => isOpenJob(j) && j.description.trim()) : []), [ws]);
  const application = useMemo(() => ws?.applications.find((a) => a.candidateId === candidateId && a.jobId === jobId) ?? null, [ws, candidateId, jobId]);

  if (!ws) return null;

  return (
    <div className="space-y-6">
      <PageHeader title={c.matcher.title} intro={c.matcher.intro} />
      <FormRow>
        <Field label={c.matcher.pickCandidate}>
          {(id) => (
            <Select
              id={id}
              value={candidateId}
              onChange={(e) => {
                const next = e.target.value;
                setCandidateId(next);
                const cand = candidates.find((x) => x.id === next);
                setTexts((t) => ({ ...t, cv: cand ? cand.cvText : t.cv }));
                setStatus("");
              }}
            >
              <option value="">{c.matcher.pasteOwn}</option>
              {candidates.map((x) => (
                <option key={x.id} value={x.id}>{fullName(x)} · {x.title}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={c.matcher.pickJob}>
          {(id) => (
            <Select
              id={id}
              value={jobId}
              onChange={(e) => {
                const next = e.target.value;
                setJobId(next);
                const job = jobs.find((j) => j.id === next);
                setTexts((t) => ({ ...t, job: job ? job.description : t.job }));
                setStatus("");
              }}
            >
              <option value="">{c.matcher.pasteOwn}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </Select>
          )}
        </Field>
      </FormRow>
      {candidateId && jobId && (
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton
            disabled={!application || !result}
            onClick={() => {
              if (application && result) {
                setApplicationScore(application.id, result.score, labels);
                setStatus(c.matcher.saved);
              }
            }}
          >
            <Save aria-hidden /> {c.matcher.saveScore}
          </PrimaryButton>
          {!application && <span className="text-sm text-amber-200">{c.matcher.notInProcess}</span>}
          <Status>{status}</Status>
        </div>
      )}
      <CvMatcher value={texts} onChange={setTexts} onResult={onResult} showSamples={!candidateId && !jobId} showLibrary={!jobId} />
    </div>
  );
}
