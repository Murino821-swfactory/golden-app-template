"use client";

import { useRef, useState } from "react";
import { Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { useCopy, useRecruitingLocale, useWorkspace } from "@/hooks/use-workspace";
import { importWorkspace, resetToDemo, updateSettings, wipeWorkspace } from "@/lib/recruiting/actions";
import { downloadText, workspaceJson } from "@/lib/recruiting/export";
import { STAGES } from "@/lib/recruiting/model";
import { ConfirmDialog, Dot, Field, FormRow, PageHeader, Panel, PrimaryButton, STAGE_TONE, SecondaryButton, Status, TextInput } from "./ui";

export function SettingsView() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useRecruitingLocale();
  const [status, setStatus] = useState("");
  const [confirm, setConfirm] = useState<"reset" | "wipe" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() => ({
    agencyName: ws?.settings.agencyName ?? "",
    currency: ws?.settings.currency ?? "EUR",
    defaultFeePercent: String(ws?.settings.defaultFeePercent ?? 20),
    defaultGuaranteeDays: String(ws?.settings.defaultGuaranteeDays ?? 90),
    consentMonths: String(ws?.settings.consentMonths ?? 12),
    staleAfterDays: String(ws?.settings.staleAfterDays ?? 7),
  }));
  if (!ws) return null;
  const set = (key: keyof typeof draft, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="space-y-6">
      <PageHeader title={c.settings.title} intro={c.settings.intro} />

      <Panel title={c.settings.agency.title}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            updateSettings({
              agencyName: draft.agencyName.trim(),
              currency: (draft.currency.trim().toUpperCase() || "EUR").slice(0, 3),
              defaultFeePercent: Number(draft.defaultFeePercent) || 0,
              defaultGuaranteeDays: Number(draft.defaultGuaranteeDays) || 0,
              consentMonths: Math.max(1, Number(draft.consentMonths) || 12),
              staleAfterDays: Math.max(1, Number(draft.staleAfterDays) || 7),
            });
            setStatus(c.settings.agency.saved);
          }}
        >
          <FormRow>
            <Field label={c.settings.agency.name}>{(id) => <TextInput id={id} value={draft.agencyName} onChange={(e) => set("agencyName", e.target.value)} />}</Field>
            <Field label={c.settings.agency.currency}>{(id) => <TextInput id={id} maxLength={3} value={draft.currency} onChange={(e) => set("currency", e.target.value)} />}</Field>
            <Field label={c.settings.agency.fee}>{(id) => <TextInput id={id} type="number" min={0} max={100} step={0.5} value={draft.defaultFeePercent} onChange={(e) => set("defaultFeePercent", e.target.value)} />}</Field>
            <Field label={c.settings.agency.guarantee}>{(id) => <TextInput id={id} type="number" min={0} value={draft.defaultGuaranteeDays} onChange={(e) => set("defaultGuaranteeDays", e.target.value)} />}</Field>
            <Field label={c.settings.agency.consent}>{(id) => <TextInput id={id} type="number" min={1} max={60} value={draft.consentMonths} onChange={(e) => set("consentMonths", e.target.value)} />}</Field>
            <Field label={c.settings.agency.stale}>{(id) => <TextInput id={id} type="number" min={1} value={draft.staleAfterDays} onChange={(e) => set("staleAfterDays", e.target.value)} />}</Field>
          </FormRow>
          <div className="flex items-center justify-between gap-3">
            <Status>{status}</Status>
            <PrimaryButton type="submit">{c.common.save}</PrimaryButton>
          </div>
        </form>
      </Panel>

      <Panel title={c.settings.stages.title} hint={c.settings.stages.hint}>
        <ol className="grid gap-2 sm:grid-cols-3">
          {STAGES.map((stage, i) => (
            <li key={stage} className="flex items-center gap-3 rounded-xl bg-background/60 px-3 py-2 ring-1 ring-foreground/10">
              <span className="text-xs tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <Dot tone={STAGE_TONE[stage] === "neutral" ? "accent" : STAGE_TONE[stage]} />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{c.stages[stage]}</span>
                <span className="block text-xs text-muted-foreground">{c.stageHints[stage]}</span>
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title={c.settings.gdpr.title}>
        <p className="text-sm leading-relaxed text-muted-foreground">{c.settings.gdpr.text}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {c.settings.gdpr.items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <Dot tone="good" />
              <span className="-mt-0.5">{item}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={c.settings.data.title} hint={c.settings.data.storage}>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              importWorkspace(await file.text());
              setStatus(c.settings.data.done);
            } catch {
              setStatus(c.settings.data.importError);
            }
          }}
        />
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => downloadText("cv-matcher-workspace.json", workspaceJson(ws), "application/json")}>
            <Download aria-hidden /> {c.settings.data.export}
          </SecondaryButton>
          <SecondaryButton onClick={() => fileRef.current?.click()} title={c.settings.data.importHint}>
            <Upload aria-hidden /> {c.settings.data.import}
          </SecondaryButton>
          <SecondaryButton onClick={() => setConfirm("reset")}>
            <RotateCcw aria-hidden /> {c.settings.data.reset}
          </SecondaryButton>
          <SecondaryButton onClick={() => setConfirm("wipe")} className="text-rose-300">
            <Trash2 aria-hidden /> {c.settings.data.wipe}
          </SecondaryButton>
        </div>
      </Panel>

      <ConfirmDialog open={confirm === "reset"} onOpenChange={(o) => !o && setConfirm(null)} title={c.settings.data.reset} text={c.settings.data.resetConfirm} confirmLabel={c.settings.data.reset} cancelLabel={c.common.cancel} onConfirm={() => { resetToDemo(locale); setStatus(c.settings.data.done); }} />
      <ConfirmDialog open={confirm === "wipe"} onOpenChange={(o) => !o && setConfirm(null)} title={c.settings.data.wipe} text={c.settings.data.wipeConfirm} confirmLabel={c.settings.data.wipe} cancelLabel={c.common.cancel} destructive onConfirm={() => { wipeWorkspace(locale); setStatus(c.settings.data.done); }} />
    </div>
  );
}
