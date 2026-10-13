"use client";

import { useRef, useState } from "react";
import { useCopy, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { importWorkspace, resetWorkspace, updateSettings } from "@/lib/realestate/actions";
import { downloadText, workspaceJson } from "@/lib/realestate/export";
import { PORTALS, type Portal, type WorkspaceMode } from "@/lib/realestate/model";
import { Checkbox, ConfirmDialog, Field, FormRow, PageHeader, Panel, PrimaryButton, SecondaryButton, Segmented, Select, TextInput } from "./ui";

export function Settings() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const [resetOpen, setResetOpen] = useState(false);
  const [importError, setImportError] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  if (!ws) return null;
  const s = ws.settings;
  const t = c.settings;
  const number = (key: "saleCommissionPct" | "rentCommissionMonths" | "vatPct" | "leadSlaHours" | "staleDealDays" | "consentMonths", label: string, step = 1) => (
    <Field label={label}>{(id) => <TextInput id={id} type="number" min={0} step={step} value={s[key]} onChange={(e) => updateSettings({ [key]: Number(e.target.value) })} />}</Field>
  );
  return (
    <div className="space-y-6">
      <PageHeader title={t.title} intro={t.intro} />
      <Panel title={t.agency} testId="settings-agency">
        <FormRow className="sm:grid-cols-3">
          <Field label={t.agencyName}>{(id) => <TextInput id={id} value={s.agencyName} onChange={(e) => updateSettings({ agencyName: e.target.value })} />}</Field>
          <Field label={t.ico}>{(id) => <TextInput id={id} value={s.ico} onChange={(e) => updateSettings({ ico: e.target.value })} />}</Field>
          <Field label={t.address}>{(id) => <TextInput id={id} value={s.address} onChange={(e) => updateSettings({ address: e.target.value })} />}</Field>
        </FormRow>
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-medium">{t.mode}</p>
          <Segmented label={t.mode} value={s.mode} onChange={(mode: WorkspaceMode) => updateSettings({ mode })} options={[{ value: "solo", label: c.mode.solo }, { value: "agency", label: c.mode.agency }]} />
          <p className="mt-1.5 text-xs text-muted-foreground">{t.modeHint}</p>
        </div>
        <div className="mt-4 max-w-sm">
          <Field label={t.persona}>{(id) => <Select id={id} value={s.currentAgentId} onChange={(e) => updateSettings({ currentAgentId: e.target.value })}>{ws.agents.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} · {c.agentRole[a.role]}</option>)}</Select>}</Field>
        </div>
      </Panel>
      <Panel title={t.defaults} testId="settings-defaults">
        <FormRow className="sm:grid-cols-3">
          {number("saleCommissionPct", t.saleCommission, 0.1)}
          {number("rentCommissionMonths", t.rentCommission, 0.5)}
          {number("vatPct", t.vat)}
          {number("leadSlaHours", t.sla)}
          {number("staleDealDays", t.staleDays)}
          {number("consentMonths", t.consentMonths)}
        </FormRow>
      </Panel>
      <Panel title={t.portals}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PORTALS.map((p: Portal) => <li key={p}><Checkbox label={c.portal[p]} checked={s.portals.includes(p)} onChange={(on) => updateSettings({ portals: on ? [...s.portals, p] : s.portals.filter((x) => x !== p) })} /></li>)}
        </ul>
      </Panel>
      <Panel title={t.data} hint={t.dataHint} testId="settings-data">
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => downloadText(`realitny-makler-${new Date().toISOString().slice(0, 10)}.json`, workspaceJson(ws), "application/json")}>{t.exportJson}</SecondaryButton>
          <SecondaryButton onClick={() => file.current?.click()}>{t.importJson}</SecondaryButton>
          <input
            ref={file}
            type="file"
            accept="application/json"
            className="sr-only"
            aria-label={t.importJson}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                importWorkspace(await f.text());
                setImportError(false);
              } catch {
                setImportError(true);
              }
              e.target.value = "";
            }}
          />
          <PrimaryButton onClick={() => setResetOpen(true)} className="bg-rose-400/15 text-rose-200 ring-1 ring-inset ring-rose-400/40 hover:bg-rose-400/25">{t.reset}</PrimaryButton>
        </div>
        {importError && <p role="alert" className="mt-3 text-sm text-rose-300">{t.importError}</p>}
        <p className="mt-4 text-xs text-muted-foreground"><span className="font-medium">{t.storage}:</span> {t.storageText}</p>
      </Panel>
      <ConfirmDialog open={resetOpen} onOpenChange={setResetOpen} title={t.resetConfirm} text={t.resetText} confirmLabel={t.reset} cancelLabel={c.common.cancel} destructive onConfirm={() => resetWorkspace(locale)} />
    </div>
  );
}
