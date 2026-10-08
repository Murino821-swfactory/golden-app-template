"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { FirestoreError } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RECORD_LIMIT, coerceValues, writeErrorKind, type EntityRecord, type ValueError } from "@/lib/records";
import type { EntityField } from "@/lib/prototype-config";

export interface RecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
    out[f.key] = f.type === "boolean" ? v === true : v === undefined || v === null ? "" : String(v);
  }
  return out;
}

export function RecordDialog({ open, onOpenChange, fields, entityLabel, record, count, onSave, onDelete }: RecordDialogProps) {
  const t = useTranslations("dataGrid");
  const tc = useTranslations("common");
  const [values, setValues] = useState(() => initialValues(fields, record));
  const [errors, setErrors] = useState<ValueError[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const describe = (err: unknown, op: "create" | "update" | "delete") => {
    console.error(`[data-grid] ${op} failed:`, err);
    const kind = writeErrorKind(err instanceof FirestoreError ? err.code : undefined, count, op);
    return kind === "limit" ? t("limitReached", { limit: RECORD_LIMIT }) : kind === "denied" ? t("permissionDenied") : t("loadError");
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found = coerceValues(fields, values).errors;
    setErrors(found);
    if (found.length > 0) return;
    setBusy(true);
    setFormError(null);
    try {
      await onSave(values);
      onOpenChange(false);
    } catch (err) {
      setFormError(describe(err, record ? "update" : "create"));
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
      onOpenChange(false);
    } catch (err) {
      setFormError(describe(err, "delete"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")}>
        <DialogTitle>{record ? t("editTitle", { entity: entityLabel }) : t("addTitle", { entity: entityLabel })}</DialogTitle>
        <DialogDescription className="sr-only">{entityLabel}</DialogDescription>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          {fields.map((field) => {
            const id = `field-${field.key}`;
            const err = errors.find((e) => e.key === field.key);
            const errId = err ? `${id}-error` : undefined;
            const set = (v: unknown) => setValues((prev) => ({ ...prev, [field.key]: v }));
            return (
              <div key={field.key} className="space-y-1.5">
                {field.type === "boolean" ? (
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
                {err && (
                  <p id={errId} className="text-sm text-destructive">{t(ERROR_KEY[err.code], { field: field.label })}</p>
                )}
              </div>
            );
          })}

          {formError && <p className="text-sm text-destructive" role="alert">{formError}</p>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
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
