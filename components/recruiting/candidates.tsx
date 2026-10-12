"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Download, FileUp, MoreHorizontal, Plus, Search, ShieldCheck } from "lucide-react";
import { analyzeCv } from "@/lib/cv-analyzer";
import { CV_FILE_ACCEPT, parseCvFile } from "@/lib/cv-file-parser";
import { useActionLabels, useCopy, useLookups, useWorkspace } from "@/hooks/use-workspace";
import { useSelected } from "@/hooks/use-selected";
import {
  addApplication, addCandidate, anonymizeCandidate, candidateExport, deleteCandidate, grantConsent, updateCandidate, withdrawConsent, type CandidateInput,
} from "@/lib/recruiting/actions";
import { downloadText } from "@/lib/recruiting/export";
import { extractCandidateFields, mergeLists, parseList } from "@/lib/recruiting/extract";
import { SOURCES, fullName, type Candidate, type ConsentStatus, type Source } from "@/lib/recruiting/model";
import { TERMINAL, formatDate, formatDateTime, formatMoney, isOpenJob } from "@/lib/recruiting/metrics";
import { ApplicationDrawer } from "./application-drawer";
import {
  ActionMenu, Avatar, Checkbox, ConfirmDialog, DataList, Drawer, EmptyState, Field, FormRow, PageHeader, Pill, PrimaryButton, SecondaryButton, Select, Status, TextArea, TextButton, TextInput, type Column,
} from "./ui";
import { Chips, ConsentPill, Definition, ScorePill, StagePill, Timeline, consentView, useNow } from "./shared";

// ── Form ──────────────────────────────────────────────────────────────────────────────

type Draft = Omit<CandidateInput, "skills" | "tags" | "consent" | "yearsExperience" | "salaryExpectation"> & {
  skills: string;
  tags: string;
  yearsExperience: string;
  salaryExpectation: string;
  consentGranted: boolean;
};

function toDraft(c?: Candidate): Draft {
  return {
    firstName: c?.firstName ?? "", lastName: c?.lastName ?? "", email: c?.email ?? "", phone: c?.phone ?? "", title: c?.title ?? "",
    location: c?.location ?? "", currentCompany: c?.currentCompany ?? "", yearsExperience: c?.yearsExperience?.toString() ?? "",
    salaryExpectation: c?.salaryExpectation?.toString() ?? "", availability: c?.availability ?? "", skills: c?.skills.join(", ") ?? "",
    tags: c?.tags.join(", ") ?? "", source: c?.source ?? "linkedin", linkedin: c?.linkedin ?? "", cvText: c?.cvText ?? "", summary: c?.summary ?? "",
    consentGranted: c?.consent.status === "granted",
  };
}

export function CandidateFormDrawer({ open, onOpenChange, candidate, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; candidate?: Candidate; onSaved?: (id: string) => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const labels = useActionLabels();
  const [draft, setDraft] = useState<Draft>(() => toDraft(candidate));
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const importFile = useCallback(
    async (file: File) => {
      setImporting(true);
      setStatus(c.candidates.form.importing);
      try {
        const text = await parseCvFile(file);
        const found = extractCandidateFields(text);
        setDraft((d) => ({
          ...d,
          cvText: text,
          firstName: d.firstName || found.firstName,
          lastName: d.lastName || found.lastName,
          title: d.title || found.title,
          email: d.email || found.email,
          phone: d.phone || found.phone,
          skills: mergeLists(parseList(d.skills), found.skills).join(", "),
        }));
        setStatus(c.candidates.form.imported(file.name));
      } catch {
        setStatus(c.candidates.form.importError);
      } finally {
        setImporting(false);
      }
    },
    [c]
  );

  if (!ws) return null;

  function submit() {
    const consent = draft.consentGranted
      ? candidate?.consent.status === "granted"
        ? candidate.consent
        : { status: "granted" as ConsentStatus, grantedAt: new Date().toISOString().slice(0, 10), expiresAt: null }
      : candidate?.consent.status === "withdrawn"
        ? candidate.consent
        : { status: "pending" as ConsentStatus, grantedAt: null, expiresAt: null };
    const input: CandidateInput = {
      firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), email: draft.email.trim(), phone: draft.phone.trim(), title: draft.title.trim(),
      location: draft.location.trim(), currentCompany: draft.currentCompany.trim(), yearsExperience: draft.yearsExperience ? Number(draft.yearsExperience) : null,
      salaryExpectation: draft.salaryExpectation ? Number(draft.salaryExpectation) : null, availability: draft.availability.trim(),
      skills: mergeLists(parseList(draft.skills), []), tags: parseList(draft.tags), source: draft.source, linkedin: draft.linkedin.trim(),
      cvText: draft.cvText, summary: draft.summary.trim(), consent,
    };
    if (!input.firstName) return;
    let id = candidate?.id;
    if (candidate) updateCandidate(candidate.id, input);
    else id = addCandidate(input);
    if (!candidate && draft.consentGranted && id) grantConsent(id, labels);
    if (candidate && draft.consentGranted && candidate.consent.status !== "granted") grantConsent(candidate.id, labels);
    onOpenChange(false);
    if (id) onSaved?.(id);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={candidate ? c.candidates.editTitle : c.candidates.addTitle}
      closeLabel={c.common.close}
      wide
      footer={
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={() => onOpenChange(false)}>{c.common.cancel}</SecondaryButton>
          <PrimaryButton form="candidate-form" type="submit" disabled={!draft.firstName.trim()}>{c.common.save}</PrimaryButton>
        </div>
      }
    >
      <form
        id="candidate-form"
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-background/60 p-3 ring-1 ring-foreground/10">
          <input ref={fileRef} type="file" accept={CV_FILE_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden data-testid="candidate-cv-input" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importFile(f); }} />
          <SecondaryButton onClick={() => fileRef.current?.click()} disabled={importing}>
            <FileUp aria-hidden /> {c.candidates.form.importCv}
          </SecondaryButton>
          <Status>{status}</Status>
        </div>
        <FormRow>
          <Field label={c.candidates.form.firstName} required>{(id) => <TextInput id={id} required value={draft.firstName} onChange={(e) => set("firstName", e.target.value)} />}</Field>
          <Field label={c.candidates.form.lastName}>{(id) => <TextInput id={id} value={draft.lastName} onChange={(e) => set("lastName", e.target.value)} />}</Field>
          <Field label={c.candidates.form.title}>{(id) => <TextInput id={id} value={draft.title} onChange={(e) => set("title", e.target.value)} />}</Field>
          <Field label={c.candidates.form.company}>{(id) => <TextInput id={id} value={draft.currentCompany} onChange={(e) => set("currentCompany", e.target.value)} />}</Field>
          <Field label={c.candidates.form.email}>{(id) => <TextInput id={id} type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />}</Field>
          <Field label={c.candidates.form.phone}>{(id) => <TextInput id={id} value={draft.phone} onChange={(e) => set("phone", e.target.value)} />}</Field>
          <Field label={c.candidates.form.location}>{(id) => <TextInput id={id} value={draft.location} onChange={(e) => set("location", e.target.value)} />}</Field>
          <Field label={c.candidates.form.source}>
            {(id) => (
              <Select id={id} value={draft.source} onChange={(e) => set("source", e.target.value as Source)}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{c.source[s]}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={c.candidates.form.years}>{(id) => <TextInput id={id} type="number" min={0} value={draft.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value)} />}</Field>
          <Field label={c.candidates.form.salary}>{(id) => <TextInput id={id} type="number" min={0} step={100} value={draft.salaryExpectation} onChange={(e) => set("salaryExpectation", e.target.value)} />}</Field>
          <Field label={c.candidates.form.availability}>{(id) => <TextInput id={id} value={draft.availability} onChange={(e) => set("availability", e.target.value)} />}</Field>
          <Field label={c.candidates.form.linkedin}>{(id) => <TextInput id={id} type="url" value={draft.linkedin} onChange={(e) => set("linkedin", e.target.value)} />}</Field>
        </FormRow>
        <Field label={c.candidates.form.skills} hint={c.candidates.form.skillsHint}>{(id) => <TextInput id={id} value={draft.skills} onChange={(e) => set("skills", e.target.value)} />}</Field>
        <Field label={c.candidates.form.tags}>{(id) => <TextInput id={id} value={draft.tags} onChange={(e) => set("tags", e.target.value)} />}</Field>
        <Field label={c.candidates.form.summary}>{(id) => <TextArea id={id} value={draft.summary} onChange={(e) => set("summary", e.target.value)} className="min-h-20" />}</Field>
        <Field label={c.candidates.form.cv} hint={c.candidates.form.cvHint}>{(id) => <TextArea id={id} value={draft.cvText} onChange={(e) => set("cvText", e.target.value)} className="min-h-40 font-mono text-xs" spellCheck={false} />}</Field>
        <Checkbox label={c.candidates.form.consentGranted} hint={c.candidates.form.consentHint(ws.settings.consentMonths)} checked={draft.consentGranted} onChange={(v) => set("consentGranted", v)} />
      </form>
    </Drawer>
  );
}

// ── Detail ────────────────────────────────────────────────────────────────────────────

function CandidateDetail({ candidate, onEdit, onClose }: { candidate: Candidate; onEdit: () => void; onClose: () => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useLocale();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const now = useNow();
  const [appId, setAppId] = useState<string | null>(null);
  const [jobToAdd, setJobToAdd] = useState("");
  const [matchJob, setMatchJob] = useState("");
  const [confirm, setConfirm] = useState<"anonymize" | "delete" | null>(null);

  const apps = useMemo(() => (ws ? ws.applications.filter((a) => a.candidateId === candidate.id) : []), [ws, candidate.id]);
  const openJobs = useMemo(() => (ws ? ws.jobs.filter((j) => isOpenJob(j) && !apps.some((a) => a.jobId === j.id)) : []), [ws, apps]);
  const activities = useMemo(() => (ws ? ws.activities.filter((a) => a.candidateId === candidate.id) : []), [ws, candidate.id]);
  const chosenMatch = matchJob || ws?.jobs.find(isOpenJob)?.id || "";
  const matchResult = useMemo(() => {
    const job = chosenMatch ? lookups.job(chosenMatch) : undefined;
    return job && candidate.cvText.trim() ? analyzeCv(candidate.cvText, job.description) : null;
  }, [chosenMatch, lookups, candidate.cvText]);

  if (!ws) return null;
  const name = fullName(candidate);
  const { expiresIn } = consentView(candidate.consent, now);
  const jobToAddId = jobToAdd || openJobs[0]?.id || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar name={name} className="size-12 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{[candidate.title, candidate.currentCompany, candidate.location].filter(Boolean).join(" · ")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone="neutral">{c.source[candidate.source]}</Pill>
            {candidate.tags.map((t) => (
              <Pill key={t} tone="info">{t}</Pill>
            ))}
          </div>
        </div>
        <ActionMenu
          label={c.common.actions}
          trigger={
            <button type="button" className="inline-flex size-11 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground">
              <MoreHorizontal aria-hidden className="size-5" />
            </button>
          }
          items={[
            { label: c.common.edit, onSelect: onEdit },
            { label: c.candidates.detail.exportJson, onSelect: () => { const data = candidateExport(ws, candidate.id); if (data) downloadText(`candidate-${candidate.id}.json`, JSON.stringify(data, null, 2), "application/json"); } },
            { label: c.candidates.detail.anonymize, onSelect: () => setConfirm("anonymize"), disabled: candidate.anonymized },
            { label: c.common.delete, onSelect: () => setConfirm("delete"), tone: "danger" },
          ]}
        />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Definition label={c.candidates.form.email}>{candidate.email ? <a href={`mailto:${candidate.email}`} className="break-all underline-offset-4 hover:underline">{candidate.email}</a> : c.common.none}</Definition>
        <Definition label={c.candidates.form.phone}>{candidate.phone ? <a href={`tel:${candidate.phone.replace(/\s/g, "")}`} className="underline-offset-4 hover:underline">{candidate.phone}</a> : c.common.none}</Definition>
        <Definition label={c.candidates.form.years}>{candidate.yearsExperience === null ? c.common.none : c.candidates.detail.experience(candidate.yearsExperience)}</Definition>
        <Definition label={c.candidates.detail.salary}>{candidate.salaryExpectation === null ? c.common.none : formatMoney(candidate.salaryExpectation, ws.settings.currency, locale)}</Definition>
        <Definition label={c.candidates.detail.availability}>{candidate.availability || c.common.none}</Definition>
        <Definition label={c.candidates.detail.lastContact}>{candidate.lastContactAt ? formatDateTime(candidate.lastContactAt, locale) : c.candidates.detail.never}</Definition>
      </dl>

      {candidate.summary && <p className="rounded-xl bg-background/60 p-3 text-sm leading-relaxed ring-1 ring-foreground/10">{candidate.summary}</p>}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{c.candidates.form.skills}</h3>
        {candidate.skills.length ? <Chips items={candidate.skills} /> : <p className="text-sm text-muted-foreground">{c.candidates.detail.noSkills}</p>}
      </section>

      <section className="space-y-3 rounded-xl bg-background/60 p-4 ring-1 ring-foreground/10" data-testid="consent-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck aria-hidden className="size-4" /> {c.candidates.detail.consent}
          </h3>
          <ConsentPill consent={candidate.consent} now={now} />
        </div>
        <p className="text-xs text-muted-foreground">
          {candidate.consent.status === "granted" && candidate.consent.expiresAt
            ? `${c.candidates.detail.expires(formatDate(candidate.consent.expiresAt, locale))}${expiresIn !== null && expiresIn < 0 ? ` · ${c.candidates.detail.expired}` : ""}`
            : c.candidates.detail.noConsent}
        </p>
        <div className="flex flex-wrap gap-2">
          {candidate.consent.status !== "granted" || (expiresIn !== null && expiresIn <= 30) ? (
            <SecondaryButton onClick={() => grantConsent(candidate.id, labels)} disabled={candidate.anonymized}>
              {candidate.consent.status === "granted" ? c.candidates.detail.renew : c.candidates.detail.grant}
            </SecondaryButton>
          ) : null}
          {candidate.consent.status === "granted" && <TextButton onClick={() => withdrawConsent(candidate.id, labels)}>{c.candidates.detail.withdraw}</TextButton>}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">{c.candidates.detail.processes}</h3>
        {apps.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.candidates.detail.noProcesses}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
            {apps.map((a) => {
              const job = lookups.job(a.jobId);
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => setAppId(a.id)} className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/40">
                    <span className="min-w-0 font-medium">{job?.title ?? "?"}<span className="font-normal text-muted-foreground"> · {lookups.client(job?.clientId ?? "")?.name ?? ""}</span></span>
                    <span className="flex items-center gap-2">
                      <ScorePill score={a.score} />
                      <StagePill stage={a.stage} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {openJobs.length > 0 && !candidate.anonymized && candidate.consent.status !== "withdrawn" && (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (jobToAddId) addApplication(candidate.id, jobToAddId, labels);
            }}
          >
            <Select aria-label={c.candidates.detail.chooseJob} value={jobToAddId} onChange={(e) => setJobToAdd(e.target.value)} className="flex-1">
              {openJobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </Select>
            <PrimaryButton type="submit"><Plus aria-hidden /> {c.candidates.detail.addToPipeline}</PrimaryButton>
          </form>
        )}
      </section>

      {ws.jobs.some(isOpenJob) && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{c.candidates.detail.matchTo}</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select aria-label={c.candidates.detail.matchTo} value={chosenMatch} onChange={(e) => setMatchJob(e.target.value)} className="flex-1">
              {ws.jobs.filter(isOpenJob).map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </Select>
            <span className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{c.candidates.detail.scoreWith}</span>
              <ScorePill score={matchResult ? matchResult.score : null} />
            </span>
          </div>
        </section>
      )}

      <details className="group rounded-xl ring-1 ring-foreground/10">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          {c.candidates.detail.cv}
          <span className="text-xs font-normal text-muted-foreground">{candidate.cvText.trim() ? `${candidate.cvText.trim().split(/\s+/).length} w` : c.candidates.detail.noCv}</span>
        </summary>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-border px-3 py-3 font-mono text-xs leading-relaxed">{candidate.cvText || c.candidates.detail.noCv}</pre>
      </details>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{c.candidates.detail.timeline}</h3>
        <Timeline activities={activities} refs={{ candidateId: candidate.id }} empty={c.candidates.detail.noActivity} />
      </section>

      {appId && <ApplicationDrawer applicationId={appId} open onOpenChange={(o) => !o && setAppId(null)} />}
      <ConfirmDialog
        open={confirm === "anonymize"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={c.candidates.detail.anonymize}
        text={c.candidates.detail.anonymizeConfirm}
        confirmLabel={c.candidates.detail.anonymize}
        cancelLabel={c.common.cancel}
        destructive
        onConfirm={() => anonymizeCandidate(candidate.id, labels, c.candidates.detail.anonymized)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={c.common.delete}
        text={c.candidates.detail.deleteConfirm}
        confirmLabel={c.common.delete}
        cancelLabel={c.common.cancel}
        destructive
        onConfirm={() => {
          deleteCandidate(candidate.id);
          onClose();
        }}
      />
    </div>
  );
}

// ── List ──────────────────────────────────────────────────────────────────────────────

export function CandidatesView() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useLocale();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | Source>("all");
  const [consent, setConsent] = useState<"all" | ConsentStatus | "expiring">("all");
  const [selected, setSelected] = useSelected("id");
  const [form, setForm] = useState<{ candidate?: Candidate } | null>(null);

  const processes = useMemo(() => {
    const by = new Map<string, number>();
    for (const a of ws?.applications ?? []) if (!TERMINAL.has(a.stage)) by.set(a.candidateId, (by.get(a.candidateId) ?? 0) + 1);
    return by;
  }, [ws]);
  const rows = useMemo(() => {
    if (!ws) return [];
    const q = query.trim().toLocaleLowerCase();
    return ws.candidates
      .filter((x) => source === "all" || x.source === source)
      .filter((x) => {
        if (consent === "all") return true;
        if (consent === "expiring") {
          const v = consentView(x.consent, now);
          return v.expiresIn !== null && v.expiresIn <= 30;
        }
        return x.consent.status === consent;
      })
      .filter((x) => !q || `${fullName(x)} ${x.title} ${x.currentCompany} ${x.location} ${x.skills.join(" ")} ${x.tags.join(" ")}`.toLocaleLowerCase().includes(q))
      .sort((a, b) => (b.lastContactAt ?? b.createdAt).localeCompare(a.lastContactAt ?? a.createdAt));
  }, [ws, query, source, consent, now]);

  if (!ws) return null;
  const selectedCandidate = selected ? ws.candidates.find((x) => x.id === selected) : undefined;

  const columns: Column<Candidate>[] = [
    { key: "name", label: c.candidates.columns.name, render: (x) => (
      <span className="flex items-center gap-2.5">
        <Avatar name={fullName(x)} className="size-8 text-[11px]" />
        <span className="min-w-0"><span className="block font-medium">{fullName(x)}</span><span className="block text-xs text-muted-foreground">{x.title}</span></span>
      </span>
    ) },
    { key: "location", label: c.candidates.columns.location, render: (x) => <span className="text-muted-foreground">{x.location || c.common.none}</span> },
    { key: "skills", label: c.candidates.columns.skills, render: (x) => <Chips items={x.skills} max={3} />, className: "hidden lg:table-cell" },
    { key: "source", label: c.candidates.columns.source, render: (x) => <Pill tone="neutral">{c.source[x.source]}</Pill>, className: "hidden xl:table-cell" },
    { key: "consent", label: c.candidates.columns.consent, render: (x) => <ConsentPill consent={x.consent} now={now} /> },
    { key: "lastContact", label: c.candidates.columns.lastContact, render: (x) => <span className="text-muted-foreground">{x.lastContactAt ? formatDate(x.lastContactAt, locale) : c.candidates.detail.never}</span>, className: "hidden lg:table-cell" },
    { key: "processes", label: c.candidates.columns.processes, render: (x) => <span className="tabular-nums">{processes.get(x.id) ?? 0}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={c.candidates.title}
        intro={c.candidates.intro}
        actions={
          <PrimaryButton onClick={() => setForm({})}>
            <Plus aria-hidden /> {c.candidates.add}
          </PrimaryButton>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-64">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <TextInput type="search" aria-label={c.candidates.searchPlaceholder} placeholder={c.candidates.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select aria-label={c.candidates.filters.source} value={source} onChange={(e) => setSource(e.target.value as "all" | Source)} className="sm:w-48">
          <option value="all">{c.candidates.filters.source}: {c.common.all}</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{c.source[s]}</option>
          ))}
        </Select>
        <Select aria-label={c.candidates.filters.consent} value={consent} onChange={(e) => setConsent(e.target.value as typeof consent)} className="sm:w-56">
          <option value="all">{c.candidates.filters.consent}: {c.common.all}</option>
          <option value="granted">{c.consentStatus.granted}</option>
          <option value="expiring">{c.candidates.detail.expiresIn(30)}</option>
          <option value="pending">{c.consentStatus.pending}</option>
          <option value="withdrawn">{c.consentStatus.withdrawn}</option>
        </Select>
        <span className="text-sm text-muted-foreground">{c.candidates.count(rows.length)}</span>
      </div>

      {ws.candidates.length === 0 ? (
        <EmptyState title={c.candidates.empty} action={<PrimaryButton onClick={() => setForm({})}>{c.candidates.add}</PrimaryButton>} />
      ) : rows.length === 0 ? (
        <EmptyState title={c.candidates.noMatches} />
      ) : (
        <DataList
          rows={rows}
          columns={columns}
          onOpen={(x) => setSelected(x.id)}
          openLabel={c.common.open}
          ariaLabel={c.candidates.title}
          renderCard={(x) => (
            <span className="flex items-start gap-3">
              <Avatar name={fullName(x)} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{fullName(x)}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{processes.get(x.id) ?? 0} · {c.candidates.columns.processes.toLowerCase()}</span>
                </span>
                <span className="block truncate text-sm text-muted-foreground">{x.title}{x.location ? ` · ${x.location}` : ""}</span>
                <span className="mt-2 block"><ConsentPill consent={x.consent} now={now} /></span>
              </span>
            </span>
          )}
        />
      )}

      {selectedCandidate && (
        <Drawer open onOpenChange={(o) => !o && setSelected(null)} title={fullName(selectedCandidate)} closeLabel={c.common.close} wide>
          <CandidateDetail candidate={selectedCandidate} onEdit={() => setForm({ candidate: selectedCandidate })} onClose={() => setSelected(null)} />
        </Drawer>
      )}
      {form && <CandidateFormDrawer key={form.candidate?.id ?? "new"} open onOpenChange={(o) => !o && setForm(null)} candidate={form.candidate} onSaved={(id) => setSelected(id)} />}
      <span className="sr-only"><Download aria-hidden /></span>
    </div>
  );
}
