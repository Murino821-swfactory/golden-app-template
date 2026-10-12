"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useActionLabels, useCopy, useLookups, useWorkspace } from "@/hooks/use-workspace";
import { createPlacement, placementDefaults } from "@/lib/recruiting/actions";
import { INVOICE_STATUSES, addDays, fullName, isoDate, type InvoiceStatus } from "@/lib/recruiting/model";
import { formatDate, formatMoney } from "@/lib/recruiting/metrics";
import { Checkbox, Drawer, Field, FormRow, PrimaryButton, SecondaryButton, Select, TextInput } from "./ui";
import { useNow } from "./shared";

/** Turns an offer into a placement: salary × fee, guarantee window, invoice state. */
export function PlacementDrawer({ applicationId, open, onOpenChange }: { applicationId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useLocale();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const app = applicationId ? lookups.application(applicationId) : undefined;
  const candidate = app ? lookups.candidate(app.candidateId) : undefined;
  const job = app ? lookups.job(app.jobId) : undefined;
  const now = useNow();
  const defaults = ws && app ? placementDefaults(ws, app) : null;

  const [startDate, setStartDate] = useState(() => isoDate(new Date(now.getTime() + 30 * 86_400_000)));
  const [salary, setSalary] = useState(String(defaults?.salary ?? ""));
  const [fee, setFee] = useState(String(defaults?.feePercent ?? ""));
  const [guarantee, setGuarantee] = useState(String(defaults?.guaranteeDays ?? ""));
  const [invoice, setInvoice] = useState<InvoiceStatus>("draft");
  const [markFilled, setMarkFilled] = useState(true);

  if (!ws || !app || !candidate || !job) return null;
  const feeAmount = Math.round(((Number(salary) || 0) * (Number(fee) || 0)) / 100);

  return (
    <Drawer
      key={app.id}
      open={open}
      onOpenChange={onOpenChange}
      title={c.placement.title}
      description={`${fullName(candidate)} · ${job.title}`}
      closeLabel={c.common.close}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {c.placement.feeAmount}: <span className="font-semibold tabular-nums text-foreground">{formatMoney(feeAmount, ws.settings.currency, locale)}</span>
          </span>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => onOpenChange(false)}>{c.common.cancel}</SecondaryButton>
            <PrimaryButton
              disabled={!startDate || !(Number(salary) > 0)}
              onClick={() => {
                createPlacement(
                  { applicationId: app.id, startDate, salary: Number(salary), feePercent: Number(fee) || 0, guaranteeDays: Number(guarantee) || 0, invoiceStatus: invoice, markJobFilled: markFilled },
                  labels
                );
                onOpenChange(false);
              }}
            >
              {c.placement.create}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">{c.placement.intro}</p>
      <div className="space-y-4">
        <FormRow>
          <Field label={c.placement.startDate} required>{(id) => <TextInput id={id} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />}</Field>
          <Field label={c.placement.salary} required>{(id) => <TextInput id={id} type="number" min={0} step={100} value={salary} onChange={(e) => setSalary(e.target.value)} />}</Field>
          <Field label={c.placement.fee}>{(id) => <TextInput id={id} type="number" min={0} max={100} step={0.5} value={fee} onChange={(e) => setFee(e.target.value)} />}</Field>
          <Field label={c.placement.guarantee} hint={startDate && Number(guarantee) > 0 ? `${c.placement.guaranteeUntil}: ${formatDate(addDays(startDate, Number(guarantee)), locale)}` : undefined}>
            {(id) => <TextInput id={id} type="number" min={0} step={1} value={guarantee} onChange={(e) => setGuarantee(e.target.value)} />}
          </Field>
          <Field label={c.placement.invoice}>
            {(id) => (
              <Select id={id} value={invoice} onChange={(e) => setInvoice(e.target.value as InvoiceStatus)}>
                {INVOICE_STATUSES.map((s) => (
                  <option key={s} value={s}>{c.invoiceStatus[s]}</option>
                ))}
              </Select>
            )}
          </Field>
        </FormRow>
        <Checkbox label={c.placement.markFilled} checked={markFilled} onChange={setMarkFilled} />
      </div>
    </Drawer>
  );
}
