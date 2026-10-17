"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Figure } from "@/components/studio/ui";
import type { GrowthCopy, LeadSource } from "@/lib/growth/copy";
import { LEAD_SOURCES, dueSteps, emailFor, leadsSummary, mailtoUrl, markSent, newLead, nextStep, type Lead } from "@/lib/growth/leads";
import { couponStore, leadsStore } from "@/lib/growth/store";
import { cn } from "@/lib/utils";

interface Props {
  copy: GrowthCopy;
  /** `YYYY-MM-DD` from the browser's clock, or "" before hydration. */
  today: string;
}

/** Add a lead, set the coupon, see what is due, open each e-mail, tick it off. */
export function LeadsPanel({ copy, today }: Props) {
  const c = copy.leads;
  const leads = leadsStore.use();
  const coupon = couponStore.use();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<LeadSource>("contact");
  const [invalid, setInvalid] = useState(false);
  const summary = today ? leadsSummary(leads, today) : { total: leads.length, due: 0, bySource: { contact: 0, newsletter: 0, account: 0 } };

  const add = () => {
    if (!today) return;
    const lead = newLead({ name, email, source }, today);
    if (!lead) {
      setInvalid(true);
      return;
    }
    leadsStore.set([lead, ...leads]);
    setName("");
    setEmail("");
    setInvalid(false);
  };

  const update = (next: Lead) => leadsStore.set(leads.map((l) => (l.id === next.id ? next : l)));
  const remove = (id: string) => leadsStore.set(leads.filter((l) => l.id !== id));

  return (
    <div className="space-y-8" data-testid="leads-panel">
      <div>
        <h2 className="text-lg font-semibold">{c.heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{c.intro}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Figure label={c.list} value={String(summary.total)} />
        <Figure label={c.due} value={String(summary.due)} accent />
        {LEAD_SOURCES.slice(0, 2).map((s) => (
          <Figure key={s} label={c.sources[s]} value={String(summary.bySource[s])} />
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          aria-label={c.add}
          className="rounded-xl border border-border/60 bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{c.add}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block text-sm" htmlFor="lead-name">
              <span className="mb-1 block text-xs text-muted-foreground">{c.name}</span>
              <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-10" autoComplete="off" />
            </label>
            <label className="block text-sm" htmlFor="lead-email">
              <span className="mb-1 block text-xs text-muted-foreground">{c.email}</span>
              <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} className="h-10" autoComplete="off" />
            </label>
            <div className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">{c.source}</span>
              <div role="radiogroup" aria-label={c.source} className="flex flex-wrap gap-1.5">
                {LEAD_SOURCES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={source === s}
                    onClick={() => setSource(s)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      source === s ? "border-primary bg-primary/15 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c.sources[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button type="submit" className="h-10" disabled={!today} data-testid="lead-save">
              {c.save}
            </Button>
            {invalid && (
              <p className="text-sm text-destructive" role="alert">
                {c.invalid}
              </p>
            )}
          </div>
        </form>

        <label className="block rounded-xl border border-border/60 bg-card p-4 text-sm" htmlFor="coupon">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.couponLabel}</span>
          <Input id="coupon" value={coupon} onChange={(e) => couponStore.set(e.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 40))} maxLength={40} className="h-10 font-mono uppercase" autoComplete="off" />
          <span className="mt-2 block text-xs text-muted-foreground">{c.couponHint}</span>
        </label>
      </div>

      <section aria-label={c.list}>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {c.list} · {c.summary(summary.total, summary.due)}
        </h3>
        {leads.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{c.empty}</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {leads.map((lead) => {
              const due = today ? dueSteps(lead, today) : [];
              const next = today ? nextStep(lead, today) : null;
              return (
                <li key={lead.id} className="rounded-xl border border-border/60 bg-card p-4" data-testid="lead" data-due={due.length}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{lead.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.email} · {c.sources[lead.source]} · {lead.since}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(lead.id)}>
                      {c.remove}
                    </Button>
                  </div>
                  {due.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {c.nothingDue}
                      {next ? ` ${c.upcoming}: ${c.stepKinds[next.step.kind]} ${c.dueIn(next.daysLeft)}.` : ""}
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {due.map(({ step, daysLeft }) => {
                        const mail = emailFor(step, lead, copy, { coupon });
                        return (
                          <li key={step.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm" data-testid="due-step" data-step={step.id}>
                            <span className="font-medium">{c.stepKinds[step.kind]}</span>
                            <span className="text-xs text-muted-foreground">{c.dueIn(daysLeft)}</span>
                            <span className="w-full truncate text-xs text-muted-foreground sm:w-auto sm:flex-1">{mail.subject}</span>
                            <Button asChild variant="outline" size="sm">
                              <a href={mailtoUrl(lead.email, mail.subject, mail.body)} onClick={() => update(markSent(lead, step.id))}>
                                {c.send}
                              </a>
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => update(markSent(lead, step.id))} data-testid="mark-sent">
                              {c.markSent}
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {lead.sent.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {c.sent}: {lead.sent.join(", ")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
