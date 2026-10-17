"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { CalendarClock, Check, Download, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRecords } from "@/hooks/use-records";
import { useEntityFields } from "@/hooks/use-content";
import {
  AGENDA_IDS,
  agendaMailto,
  defaultState,
  einvoicePhase,
  invoicesCsv,
  isoDate,
  parseState,
  readiness,
  routeIncoming,
  type CheckId,
  type ComplianceState,
  type PostmanKind,
  type VatStatus,
} from "@/lib/billing/compliance";
import { complianceCopy } from "@/lib/billing/copy";
import { cn } from "@/lib/utils";

/**
 * The accountant's side of OSS Billing: e-invoicing 2027 readiness, company setup, a supplier
 * invoice check, the onboarding-meeting agenda and a CSV handoff. The setup lives in this
 * browser (localStorage) — the visitor's Firestore sandbox only holds the configured entity.
 */

const STORAGE_KEY = "oss-billing.compliance.v1";
const CHECKABLE: ReadonlySet<string> = new Set<CheckId>(["poa", "companyBilling", "accountantFormat", "meeting"]);
const field = "h-11 w-full rounded-md border border-border bg-background px-3 text-base sm:text-sm";

function Section({ title, children, testId }: { title: string; children: ReactNode; testId: string }) {
  return (
    <section data-testid={testId} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function CompliancePanel() {
  const copy = complianceCopy(useLocale());
  // Lazy initial state is safe: AuthGuard mounts this only in the browser, after sign-in,
  // so the static export never prerenders a date or an empty storage into the markup.
  const [state, setState] = useState<ComplianceState>(() => {
    try {
      return parseState(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return defaultState(); // storage blocked: the setup lasts this visit
    }
  });
  const [now] = useState(() => new Date());
  const [incoming, setIncoming] = useState(() => ({
    supplierVatPayer: true,
    issueDate: isoDate(now),
    billedTo: "company" as "company" | "person",
  }));
  const { records } = useRecords();
  const fields = useEntityFields();

  const update = (patch: Partial<ComplianceState>) =>
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage blocked */
      }
      return next;
    });

  const ready = readiness(state);
  const phase = einvoicePhase(now);
  const route = routeIncoming(incoming, state);
  const agendaLines = AGENDA_IDS.map((id) => copy.agenda[id]);
  const csv = useMemo(() => invoicesCsv(fields, records), [fields, records]);

  const download = () => {
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${isoDate(now)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="compliance-panel" className="space-y-4">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold">{copy.title}</h2>
        <p className="text-muted-foreground">{copy.intro}</p>
        <div
          data-testid="einvoice-phase"
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3",
            phase.phase === "hybrid" ? "border-primary/40 bg-primary/5" : "border-border"
          )}
        >
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium">{phase.phase === "hybrid" ? copy.phase.hybrid(phase.daysLeft) : copy.phase.mandatory}</p>
            <p className="text-sm text-muted-foreground">
              {phase.phase === "hybrid" ? copy.phase.hybridNote : copy.phase.mandatoryNote}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={copy.readinessTitle} testId="readiness">
          <p className="text-sm text-muted-foreground" data-testid="readiness-count">
            {copy.readinessCount(ready.done, ready.total)}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full bg-primary transition-all" style={{ width: `${(ready.done / ready.total) * 100}%` }} />
          </div>
          <ul className="space-y-2">
            {ready.items.map((item) => {
              const text = copy.readiness[item.id];
              const checkable = CHECKABLE.has(item.id);
              const body = (
                <>
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                      item.done ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    )}
                    aria-hidden
                  >
                    {item.done && <Check className="size-3.5" />}
                  </span>
                  <span>
                    <span className="block font-medium">{text.label}</span>
                    <span className="block text-sm text-muted-foreground">{text.hint}</span>
                  </span>
                </>
              );
              return (
                <li key={item.id}>
                  {checkable ? (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={item.done}
                      className="flex min-h-11 w-full items-start gap-3 rounded-md p-2 text-left hover:bg-muted/50"
                      onClick={() => update({ checks: { ...state.checks, [item.id]: !item.done } })}
                    >
                      {body}
                    </button>
                  ) : (
                    <div className="flex items-start gap-3 p-2" data-done={item.done}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title={copy.companyTitle} testId="company">
          <fieldset>
            <legend className="text-sm text-muted-foreground">{copy.vatLabel}</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["nonPayer", "payer"] as VatStatus[]).map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={state.vatStatus === v ? "default" : "outline"}
                  aria-pressed={state.vatStatus === v}
                  className="h-11"
                  onClick={() => update({ vatStatus: v })}
                >
                  {copy.vat[v].label}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{copy.vat[state.vatStatus].note}</p>
          </fieldset>
          <label className="block space-y-1.5">
            <span className="text-sm text-muted-foreground">{copy.postmanName}</span>
            <Input
              className="h-11 text-base sm:text-sm"
              value={state.postmanName}
              placeholder={copy.postmanNamePlaceholder}
              maxLength={200}
              onChange={(e) => update({ postmanName: e.target.value })}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-muted-foreground">{copy.postmanKind}</span>
            <select
              className={field}
              value={state.postmanKind}
              onChange={(e) => update({ postmanKind: e.target.value as PostmanKind })}
            >
              {(["none", "mailbox", "xml", "api"] as PostmanKind[]).map((k) => (
                <option key={k} value={k}>{copy.postmanKinds[k]}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">{copy.accountantName}</span>
              <Input className="h-11 text-base sm:text-sm" value={state.accountantName} maxLength={200}
                onChange={(e) => update({ accountantName: e.target.value })} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">{copy.accountantSoftware}</span>
              <Input className="h-11 text-base sm:text-sm" value={state.accountantSoftware} maxLength={200}
                onChange={(e) => update({ accountantSoftware: e.target.value })} />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm text-muted-foreground">{copy.accountantEmail}</span>
            <Input type="email" className="h-11 text-base sm:text-sm" value={state.accountantEmail} maxLength={200}
              onChange={(e) => update({ accountantEmail: e.target.value })} />
          </label>
        </Section>

        <Section title={copy.incomingTitle} testId="incoming">
          <p className="text-sm text-muted-foreground">{copy.incomingIntro}</p>
          <fieldset>
            <legend className="text-sm text-muted-foreground">{copy.supplierVatPayer}</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {[true, false].map((v) => (
                <Button key={String(v)} type="button" className="h-11" aria-pressed={incoming.supplierVatPayer === v}
                  variant={incoming.supplierVatPayer === v ? "default" : "outline"}
                  onClick={() => setIncoming({ ...incoming, supplierVatPayer: v })}>
                  {v ? copy.yes : copy.no}
                </Button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">{copy.issueDate}</span>
              <Input type="date" className="h-11 text-base sm:text-sm" value={incoming.issueDate}
                onChange={(e) => setIncoming({ ...incoming, issueDate: e.target.value })} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">{copy.billedTo}</span>
              <select className={field} value={incoming.billedTo}
                onChange={(e) => setIncoming({ ...incoming, billedTo: e.target.value as "company" | "person" })}>
                <option value="company">{copy.billedToCompany}</option>
                <option value="person">{copy.billedToPerson}</option>
              </select>
            </label>
          </div>
          <div data-testid="incoming-result" aria-live="polite" className="rounded-lg border border-border p-3">
            <p className="font-medium">{copy.channel[route.channel]}</p>
            {route.issues.length === 0 ? (
              <p className="mt-1 flex items-center gap-2 text-sm text-primary">
                <ShieldCheck className="size-4" aria-hidden /> {copy.allGood}
              </p>
            ) : (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-destructive">
                {route.issues.map((issue) => <li key={issue}>{copy.issues[issue]}</li>)}
              </ul>
            )}
          </div>
        </Section>

        <Section title={copy.agendaTitle} testId="agenda">
          <p className="text-sm text-muted-foreground">{copy.agendaIntro}</p>
          <ul className="space-y-1">
            {AGENDA_IDS.map((id) => (
              <li key={id}>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" className="size-5 shrink-0 rounded border-border accent-primary"
                    checked={state.agenda[id]}
                    onChange={(e) => update({ agenda: { ...state.agenda, [id]: e.target.checked } })} />
                  {copy.agenda[id]}
                </label>
              </li>
            ))}
          </ul>
          {state.accountantEmail.trim() ? (
            <Button asChild className="h-11 w-full sm:w-auto">
              <a href={agendaMailto(state.accountantEmail, copy.agendaSubject, agendaLines)}>
                <Mail className="size-4" aria-hidden /> {copy.sendAgenda}
              </a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.noEmail}</p>
          )}
        </Section>
      </div>

      <Section title={copy.exportTitle} testId="export">
        <p className="text-sm text-muted-foreground">{copy.exportIntro(state.accountantSoftware.trim())}</p>
        <Button type="button" variant="outline" className="h-11 w-full sm:w-auto" disabled={records.length === 0} onClick={download}>
          <Download className="size-4" aria-hidden /> {records.length === 0 ? copy.exportEmpty : copy.exportCsv}
        </Button>
      </Section>

      <p className="text-xs text-muted-foreground">{copy.disclaimer}</p>
    </div>
  );
}
