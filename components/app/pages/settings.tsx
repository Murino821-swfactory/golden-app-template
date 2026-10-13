"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { OwnerLinks } from "@/components/owner/owner-links";
import { appCopy, asLocale } from "@/lib/legal/copy";
import { formatDate } from "@/lib/legal/format";
import { useWorkspace } from "@/lib/legal/store";
import { TARIFF_BASE_BY_YEAR } from "@/lib/legal/tariff";
import type { Workspace, WorkspaceKind } from "@/lib/legal/types";
import { Field, Notice, PageHeader, Panel, Select, TextInput } from "../ui";

export function SettingsPage() {
  const copy = appCopy(useLocale());
  const { ws } = useWorkspace();
  if (!ws) return <p role="status" className="text-sm text-muted-foreground">{copy.common.loading}</p>;
  return <SettingsForm key={`${ws.kind}:${ws.seededAt}`} ws={ws} />;
}

function SettingsForm({ ws }: { ws: Workspace }) {
  const locale = asLocale(useLocale());
  const copy = appCopy(locale);
  const { update, reset } = useWorkspace();
  const [name, setName] = useState(ws.firm.name);
  const [address, setAddress] = useState(ws.firm.address);
  const [year, setYear] = useState(ws.settings.tariffYear);
  const [base, setBase] = useState(ws.settings.tariffBase);
  const [rate, setRate] = useState(ws.settings.defaultHourlyRate);
  const [vat, setVat] = useState(ws.settings.vatRate);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: WorkspaceKind }>(null);

  function save() {
    update((w) => ({ ...w, firm: { name: name.trim() || w.firm.name, address: address.trim() }, settings: { ...w.settings, tariffYear: year, tariffBase: base, defaultHourlyRate: rate, vatRate: vat } }));
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(ws, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `law-expert-workspace-${ws.seededAt}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={copy.settings.title} intro={copy.settings.intro} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title={copy.settings.workspace}>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">{copy.settings.workspaceKind}</legend>
            {(["solo", "firm"] as WorkspaceKind[]).map((k) => (
              <label key={k} className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm has-[:checked]:border-primary">
                <input type="radio" name="kind" value={k} checked={ws.kind === k} onChange={() => ws.kind !== k && setConfirm({ kind: k })} />
                <span><span className="block font-medium">{copy.settings[k]}</span><span className="text-xs text-muted-foreground">{k === "solo" ? copy.team.soloIntro : copy.team.intro}</span></span>
              </label>
            ))}
          </fieldset>
          <p className="mt-2 text-xs text-muted-foreground">{copy.settings.switchHint}</p>
          {confirm && (
            <Notice tone="accent">
              <p>{copy.settings.switchConfirm}</p>
              <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => { reset(confirm.kind); setConfirm(null); }}>{copy.common.confirm}</Button><Button size="sm" variant="outline" onClick={() => setConfirm(null)}>{copy.common.cancel}</Button></div>
            </Notice>
          )}
          <div className="mt-4 grid grid-cols-1 gap-3">
            <Field label={copy.settings.firmName}><TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
            <Field label={copy.settings.address}><TextInput value={address} onChange={(e) => setAddress(e.target.value)} maxLength={160} /></Field>
          </div>
        </Panel>
        <Panel title={copy.settings.tariff}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={copy.settings.tariffYear}><Select value={year} onChange={(e) => { const y = Number(e.target.value); setYear(y); if (TARIFF_BASE_BY_YEAR[y]) setBase(TARIFF_BASE_BY_YEAR[y]!); }}>{Object.keys(TARIFF_BASE_BY_YEAR).map((y) => <option key={y} value={y}>{y}</option>)}</Select></Field>
            <Field label={copy.settings.tariffBase} hint={copy.settings.tariffBaseHint}><TextInput type="number" min={100} max={10000} value={base} onChange={(e) => setBase(Number(e.target.value))} /></Field>
            <Field label={copy.settings.defaultRate}><TextInput type="number" min={0} max={1000} value={rate} onChange={(e) => setRate(Number(e.target.value))} /></Field>
            <Field label={copy.settings.vatRate}><TextInput type="number" min={0} max={30} value={vat} onChange={(e) => setVat(Number(e.target.value))} /></Field>
          </div>
          <div className="mt-4 flex items-center gap-3"><Button className="h-11" onClick={save}>{copy.common.save}</Button>{saved && <span role="status" className="text-sm text-muted-foreground">{copy.settings.saved}</span>}</div>
        </Panel>
        <Panel title={copy.settings.data}>
          <p className="text-sm text-muted-foreground">{copy.settings.dataHint}</p>
          <p className="mt-2 text-xs text-muted-foreground">{copy.settings.seededAt}: {formatDate(ws.seededAt, locale)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" className="h-11" onClick={exportJson}>{copy.settings.exportJson}</Button>
            <Button variant="outline" className="h-11" onClick={() => { if (window.confirm(copy.settings.resetConfirm)) reset(ws.kind); }}>{copy.settings.resetDemo}</Button>
          </div>
        </Panel>
        <Panel title={copy.settings.legal}>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>{copy.settings.legalGdpr}</li><li>{copy.settings.legalAi}</li><li>{copy.settings.legalAml}</li><li>{copy.settings.legalDeadlines}</li>
          </ul>
        </Panel>
      </div>
      <OwnerLinks />
    </div>
  );
}
