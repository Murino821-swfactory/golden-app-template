"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FirestoreError } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RECORD_LIMIT, coerceValues, writeErrorKind, type EntityRecord, type ValueError } from "@/lib/records";
import type { EntityField } from "@/lib/prototype-config";
import { useAuth } from "@/hooks/use-auth";
import { FieldWidgetError, widgetFor } from "./widgets";

export interface RecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  fields: EntityField[];
  entityLabel: string;
  /** Absent = add mode. */
  record?: EntityRecord;
  count: number;
  onSave: (values: Record<string, unknown>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const ERROR_KEY: Record<ValueError["code"], string> = {
  required: "errorRequired",
  type: "errorType",
  tooLong: "errorTooLong",
  option: "errorOption",
};

function initialValues(fields: EntityField[], record?: EntityRecord): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = record?.values[f.key];
    const widget = widgetFor(f);
    out[f.key] = widget ? widget.initial(v) : f.type === "boolean" ? v === true : v === undefined || v === null ? "" : String(v);
  }
  return out;
}

export function RecordDialog({ open, onOpenChange, onCloseAutoFocus, fields, entityLabel, record, count, onSave, onDelete }: RecordDialogProps) {
  const t = useTranslations("dataGrid");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();
  const [values, setValues] = useState(() => initialValues(fields, record));
  const [errors, setErrors] = useState<ValueError[]>([]);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ key: string; fraction: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Closing the dialog stops an upload still running for it.
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    return () => controller.abort();
  }, []);

  /** Frees what a widget's stored value owns; a failure leaves an orphan file, not a broken record. */
  const release = (key: string, stored: unknown) => {
    const widget = widgetFor({ key });
    if (!widget || !user) return;
    widget.release(stored, user.uid).catch((err) => console.warn(`[data-grid] could not free ${key}:`, err));
  };

  const describe = (err: unknown, op: "create" | "update" | "delete") => {
    console.error(`[data-grid] ${op} failed:`, err);
    const kind = writeErrorKind(err instanceof FirestoreError ? err.code : undefined, count, op);
    return kind === "limit" ? t("limitReached", { limit: RECORD_LIMIT }) : kind === "denied" ? t("permissionDenied") : t("loadError");
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Widgets validate as the text they will store, before anything is uploaded.
    const draft: Record<string, unknown> = { ...values };
    const found: Record<string, string> = {};
    for (const field of fields) {
      const widget = widgetFor(field);
      if (!widget) continue;
      draft[field.key] = widget.draft(values[field.key]);
      const message = widget.issue(values[field.key], locale);
      if (message) found[field.key] = message;
    }
    const invalid = coerceValues(fields, draft).errors;
    setErrors(invalid);
    setIssues(found);
    if (invalid.length > 0 || Object.keys(found).length > 0) return;
    setBusy(true);
    setFormError(null);
    const saved = { ...draft };
    const fresh: string[] = [];
    try {
      for (const field of fields) {
        const widget = widgetFor(field);
        if (!widget) continue;
        saved[field.key] = await widget.commit(values[field.key], {
          uid: user?.uid ?? "",
          locale,
          signal: abort.current!.signal,
          onProgress: (fraction) => setProgress({ key: field.key, fraction }),
        });
        setProgress(null);
        if (saved[field.key] !== record?.values[field.key]) fresh.push(field.key);
      }
      await onSave(saved);
      // The record no longer refers to what it held before.
      for (const key of fresh) if (record) release(key, record.values[key]);
      onOpenChange(false);
    } catch (err) {
      // Nothing refers to what this attempt uploaded.
      for (const key of fresh) release(key, saved[key]);
      setProgress(null);
      setFormError(err instanceof FieldWidgetError ? err.message : describe(err, record ? "update" : "create"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setBusy(true);
    setFormError(null);
    try {
      await onDelete();
      for (const field of fields) if (record) release(field.key, record.values[field.key]);
      onOpenChange(false);
    } catch (err) {
      setFormError(describe(err, "delete"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")} onCloseAutoFocus={onCloseAutoFocus}>
        <DialogTitle>{record ? t("editTitle", { entity: entityLabel }) : t("addTitle", { entity: entityLabel })}</DialogTitle>
        <DialogDescription className="sr-only">{entityLabel}</DialogDescription>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          {fields.map((field) => {
            const id = `field-${field.key}`;
            const err = errors.find((e) => e.key === field.key);
            const issue = issues[field.key];
            const errId = err || issue ? `${id}-error` : undefined;
            const set = (v: unknown) => setValues((prev) => ({ ...prev, [field.key]: v }));
            const widget = widgetFor(field);
            return (
              <div key={field.key} className="space-y-1.5">
                {widget ? (
                  <widget.Input id={id} field={field} uid={user?.uid ?? null} value={values[field.key]} onChange={set}
                    invalid={Boolean(err || issue)} describedBy={errId} disabled={busy}
                    progress={progress?.key === field.key ? progress.fraction : null} />
                ) : field.type === "boolean" ? (
                  <label htmlFor={id} className="flex min-h-11 items-center gap-3 text-sm">
                    <input id={id} type="checkbox" checked={values[field.key] === true}
                      onChange={(e) => set(e.target.checked)} className="size-5 rounded border-border accent-primary" />
                    {field.label}
                  </label>
                ) : (
                  <>
                    <label htmlFor={id} className="text-sm text-muted-foreground">
                      {field.label}
                      {field.required && <span className="ml-1 text-primary" aria-hidden>*</span>}
                    </label>
                    {field.type === "select" ? (
                      <select id={id} value={String(values[field.key] ?? "")} onChange={(e) => set(e.target.value)}
                        aria-invalid={Boolean(err)} aria-describedby={errId} required={field.required}
                        className="h-11 w-full rounded-md border border-border bg-background px-3 text-base sm:text-sm">
                        <option value="">—</option>
                        {(field.options ?? []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === "longtext" ? (
                      <Textarea id={id} value={String(values[field.key] ?? "")} onChange={(e) => set(e.target.value)}
                        aria-invalid={Boolean(err)} aria-describedby={errId} />
                    ) : (
                      <Input id={id} className="h-11 text-base sm:text-sm"
                        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                        inputMode={field.type === "number" ? "decimal" : undefined}
                        value={String(values[field.key] ?? "")} onChange={(e) => set(e.target.value)}
                        aria-invalid={Boolean(err)} aria-describedby={errId} required={field.required} />
                    )}
                  </>
                )}
                {err ? (
                  <p id={errId} className="text-sm text-destructive">{t(ERROR_KEY[err.code], { field: field.label })}</p>
                ) : issue ? (
                  <p id={errId} className="text-sm text-destructive">{issue}</p>
                ) : null}
              </div>
            );
          })}

          {formError && <p className="text-sm text-destructive" role="alert">{formError}</p>}

          <div className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-2 border-t border-border bg-card px-5 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:flex-row sm:justify-between sm:border-0 sm:px-0 sm:pt-2 sm:pb-0">
            {record && onDelete ? (
              confirming ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="text-sm">{t("confirmDelete")}</span>
                  <Button type="button" variant="outline" className="h-11 text-destructive" disabled={busy} onClick={() => void handleDelete()}>
                    {t("confirmDeleteAction")}
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" className="h-11 text-destructive" onClick={() => setConfirming(true)}>
                  {t("delete")}
                </Button>
              )
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="ghost" className="h-11" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
              <Button type="submit" className="h-11" disabled={busy}>{busy ? t("saving") : t("save")}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
