"use client";

import { useState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { FirestoreError } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecords, emptyValues, missingRequired } from "@/hooks/use-records";
import type { EntityField } from "@/lib/prototype-config";
import { cn } from "@/lib/utils";

/** Colour per known session status (dark-only, golden product rule 1). Unknown values fall
 * back to a neutral chip so a prototype whose status options differ still reads cleanly. */
const STATUS_BADGE_CLASS: Record<string, string> = {
  Active: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  Paused: "border-zinc-500/30 bg-zinc-500/15 text-zinc-400",
  "Waiting for Reset": "border-amber-500/30 bg-amber-500/15 text-amber-400",
  Completed: "border-blue-500/30 bg-blue-500/15 text-blue-400",
};

function StatusBadge({ value }: { value: unknown }) {
  const label = String(value ?? "").trim();
  if (!label) return <>—</>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STATUS_BADGE_CLASS[label] ?? "border-border bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

/**
 * data-grid — list of records plus a form to add one, both generated from the entity
 * declared in `prototype.config.json`.
 *
 * Mobile-first (golden rule 2): under `sm` each record is a card, because a 5-column table
 * on a 390px phone is unreadable. The table only appears where there is room for it.
 */

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: EntityField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `field-${field.key}`;

  if (field.type === "boolean") {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 rounded border-border accent-primary"
        />
        <span className="text-muted-foreground">{field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-sm text-muted-foreground">
          {field.label}
        </label>
        <select
          id={id}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">—</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const inputType =
    field.type === "number" ? "number" : field.type === "date" ? "date" : "text";

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {field.label}
        {field.required && <span className="ml-1 text-primary">*</span>}
      </label>
      <Input
        id={id}
        type={inputType}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function formatValue(field: EntityField, value: unknown, t: (key: string) => string): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "boolean") return value ? t("yes") : t("no");
  return String(value);
}

/** A status field renders as a coloured badge; everything else as plain text. */
function renderCell(
  field: EntityField,
  value: unknown,
  t: (key: string) => string
): ReactNode {
  if (field.key === "status") return <StatusBadge value={value} />;
  return formatValue(field, value, t);
}

const ALL = "all";

export interface DataGridProps {
  /** Bumped by a sibling (e.g. the Quick Log parser) to force a refetch. */
  refreshSignal?: number;
}

export function DataGrid({ refreshSignal = 0 }: DataGridProps) {
  const { records, fields, entityLabel, loading, error, addRecord, removeRecord, refresh } =
    useRecords();
  const t = useTranslations("dataGrid");
  const tf = useTranslations("gridFilter");

  // Filter by status and agent, when the entity declares those fields.
  const statusField = fields.find((f) => f.key === "status");
  const agentField = fields.find((f) => f.key === "agent");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [agentFilter, setAgentFilter] = useState<string>(ALL);

  const filteredRecords = records.filter((rec) => {
    if (statusFilter !== ALL && String(rec.values.status ?? "") !== statusFilter) {
      return false;
    }
    if (agentFilter !== ALL && String(rec.values.agent ?? "") !== agentFilter) {
      return false;
    }
    return true;
  });

  // A sibling can ask for a refetch by changing refreshSignal — e.g. after the Quick Log
  // parser writes a record through its own hook instance, which this one knows nothing about.
  // Skip the mount run; the load effect in use-records already covers it.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    emptyValues(fields)
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const missing = missingRequired(fields, values);

  // The raw Firestore error (e.g. the composite-index URL a permission-denied response
  // carries) is never shown to a visitor — see the rendered message below — but it still
  // goes to the console so debugging keeps the detail.
  useEffect(() => {
    if (error) console.error("[data-grid] failed to load records:", error);
  }, [error]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await addRecord(values);
      setValues(emptyValues(fields));
    } catch (err) {
      // Same treatment as the load path: a Firestore error (e.g. the permission-denied a
      // non-owner visitor gets, since the deployed rules only let the requester write) never
      // reaches the visitor verbatim — only the validation error use-records.ts throws for a
      // missing required field is our own message and safe to show as-is.
      console.error("[data-grid] failed to add record:", err);
      if (err instanceof FirestoreError) {
        setFormError(err.code === "permission-denied" ? t("permissionDenied") : t("loadError"));
      } else {
        setFormError((err as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section data-pattern="data-grid" className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-border bg-card p-4 sm:p-6"
      >
        <h3 className="mb-4 text-lg font-medium">
          {t("addAction", { entity: entityLabel.toLowerCase() })}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
            />
          ))}
        </div>

        {formError && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          className="mt-5 w-full sm:w-auto"
          disabled={submitting || missing.length > 0}
        >
          {submitting ? t("saving") : t("addAction", { entity: entityLabel.toLowerCase() })}
        </Button>
      </form>

      <div>
        <h3 className="mb-3 text-lg font-medium">
          {t("listHeading", { entity: entityLabel })}{" "}
          <span className="text-muted-foreground">({records.length})</span>
        </h3>

        {(statusField || agentField) && (
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            {statusField && (
              <select
                aria-label={tf("filterBy", { field: statusField.label })}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm sm:w-auto"
              >
                <option value={ALL}>
                  {statusField.label}: {tf("filterAll")}
                </option>
                {(statusField.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
            {agentField && (
              <select
                aria-label={tf("filterBy", { field: agentField.label })}
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm sm:w-auto"
              >
                <option value={ALL}>
                  {agentField.label}: {tf("filterAll")}
                </option>
                {(agentField.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error instanceof FirestoreError && error.code === "permission-denied"
              ? t("permissionDenied")
              : t("loadError")}
          </p>
        )}

        {!loading && !error && records.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("empty", { entity: entityLabel.toLowerCase() })}
          </p>
        )}

        {!loading && !error && records.length > 0 && filteredRecords.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {tf("noMatch")}
          </p>
        )}

        {/* Mobile: one card per record. */}
        {!loading && filteredRecords.length > 0 && (
          <ul className="space-y-3 sm:hidden">
            {filteredRecords.map((rec) => (
              <li
                key={rec.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <dl className="space-y-1.5">
                  {fields.map((field) => (
                    <div key={field.key} className="flex justify-between gap-4 text-sm">
                      <dt className="text-muted-foreground">{field.label}</dt>
                      <dd className="text-right">{renderCell(field, rec.values[field.key], t)}</dd>
                    </div>
                  ))}
                </dl>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => void removeRecord(rec.id)}
                >
                  {t("remove")}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Desktop: a real table, only where the width exists for it. */}
        {!loading && filteredRecords.length > 0 && (
          <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-card">
                <tr>
                  {fields.map((field) => (
                    <th key={field.key} className="px-4 py-3 text-left font-medium">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="border-b border-border last:border-0">
                    {fields.map((field) => (
                      <td key={field.key} className="px-4 py-3">
                        {renderCell(field, rec.values[field.key], t)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void removeRecord(rec.id)}
                      >
                        {t("remove")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
