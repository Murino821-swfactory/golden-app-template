"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FirestoreError } from "firebase/firestore";
import { ArrowDown, ArrowUp, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecords } from "@/hooks/use-records";
import { RECORD_LIMIT, filterRecords, formatValue, sortRecords, type EntityRecord, type SortKey } from "@/lib/records";
import { cn } from "@/lib/utils";
import { RecordDialog } from "./record-dialog";

/**
 * data-grid — the visitor's own records of the configured entity (spec 2026-09-29 §6.2).
 *
 * List first, form in a dialog: on a 390 px phone the records are the content and the form
 * is an action. Under `sm` each record is a card button; from `sm` a real table whose
 * headers sort. Search and the chips for the first select field filter in the browser —
 * a visitor holds at most RECORD_LIMIT records.
 */
export function DataGrid() {
  const { records, fields, entityLabel, loading, error, count, atLimit, addRecord, updateRecord, removeRecord } = useRecords();
  const t = useTranslations("dataGrid");
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>(null);
  const [dialog, setDialog] = useState<{ record?: EntityRecord } | null>(null);

  const chipField = fields.find((f) => f.type === "select");
  const yesNo = { yes: t("yes"), no: t("no") };
  const visible = useMemo(
    () => sortRecords(filterRecords(records, fields, query, chipField && chip ? { key: chipField.key, value: chip } : null), fields, sort),
    [records, fields, query, chip, chipField, sort]
  );

  useEffect(() => {
    if (error) console.error("[data-grid] failed to load records:", error);
  }, [error]);

  const nextSort = (key: string): SortKey =>
    sort?.key !== key ? { key, dir: "asc" } : sort.dir === "asc" ? { key, dir: "desc" } : null;

  return (
    <section data-pattern="data-grid" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium">
          {t("listHeading", { entity: entityLabel })} <span className="text-muted-foreground">({count})</span>
        </h3>
        <Button className="h-11" disabled={atLimit || loading} onClick={() => setDialog({})}>
          <Plus className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t("addAction", { entity: entityLabel.toLowerCase() })}</span>
        </Button>
      </div>

      {atLimit && <p className="rounded-lg border border-border bg-card p-3 text-sm" role="status">{t("limitReached", { limit: RECORD_LIMIT })}</p>}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <label htmlFor="grid-search" className="sr-only">{t("searchLabel")}</label>
        <Input id="grid-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchLabel")} className="h-11 pl-9 text-base sm:text-sm" />
      </div>

      {chipField && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={chipField.label}>
          {[null, ...(chipField.options ?? [])].map((opt) => (
            <button key={opt ?? "__all"} type="button" aria-pressed={chip === opt} onClick={() => setChip(opt)}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm transition-colors motion-reduce:transition-none",
                chip === opt ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
              )}>
              {opt ?? t("all")}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error instanceof FirestoreError && error.code === "permission-denied" ? t("permissionDenied") : t("loadError")}
        </p>
      )}

      {!loading && !error && records.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t("empty", { entity: entityLabel.toLowerCase() })}
        </p>
      )}

      {!loading && records.length > 0 && visible.length === 0 && (
        <p className="p-4 text-center text-sm text-muted-foreground">{t("noMatches")}</p>
      )}

      {!loading && visible.length > 0 && (
        <ul className="space-y-3 sm:hidden">
          {visible.map((rec) => (
            <li key={rec.id}>
              <button type="button" onClick={() => setDialog({ record: rec })}
                className="w-full rounded-lg border border-border bg-card p-4 text-left focus-visible:outline-2 focus-visible:outline-ring">
                <dl className="space-y-1.5">
                  {fields.map((field) => (
                    <div key={field.key} className="flex justify-between gap-4 text-sm">
                      <dt className="text-muted-foreground">{field.label}</dt>
                      <dd className="text-right">{formatValue(field, rec.values[field.key], yesNo)}</dd>
                    </div>
                  ))}
                </dl>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && visible.length > 0 && (
        <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-card">
              <tr>
                {fields.map((field) => (
                  <th key={field.key} scope="col"
                    aria-sort={sort?.key === field.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className="px-2 py-1 text-left font-medium">
                    <button type="button" onClick={() => setSort(nextSort(field.key))}
                      aria-label={t("sortBy", { field: field.label })}
                      className="inline-flex min-h-11 items-center gap-1 px-2">
                      {field.label}
                      {sort?.key === field.key && (sort.dir === "asc" ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />)}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((rec) => (
                <tr key={rec.id} className="border-b border-border last:border-0">
                  {fields.map((field) => (
                    <td key={field.key} className="px-4 py-3">{formatValue(field, rec.values[field.key], yesNo)}</td>
                  ))}
                  <td className="px-2 py-1 text-right">
                    <Button variant="ghost" className="h-11" onClick={() => setDialog({ record: rec })}>{t("edit")}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog && (
        <RecordDialog
          key={dialog.record?.id ?? "new"}
          open
          onOpenChange={(open) => !open && setDialog(null)}
          fields={fields}
          entityLabel={entityLabel}
          record={dialog.record}
          count={count}
          onSave={(values) => (dialog.record ? updateRecord(dialog.record.id, values) : addRecord(values))}
          onDelete={dialog.record ? () => removeRecord(dialog.record!.id) : undefined}
        />
      )}
    </section>
  );
}
