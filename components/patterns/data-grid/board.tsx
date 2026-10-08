"use client";

import { useTranslations } from "next-intl";
import { groupByField } from "@/lib/board";
import { formatValue, type EntityRecord } from "@/lib/records";
import type { EntityField } from "@/lib/prototype-config";

/** Desktop: one column per option. Phone: the same groups stacked — no sideways page scroll. */
export function Board({
  records,
  fields,
  boardField,
  onOpen,
}: {
  records: EntityRecord[];
  fields: EntityField[];
  boardField: EntityField;
  onOpen: (record: EntityRecord) => void;
}) {
  const t = useTranslations("dataGrid");
  const yesNo = { yes: t("yes"), no: t("no") };
  const titleField = fields.find((f) => f.key !== boardField.key) ?? fields[0]!;
  const detailFields = fields.filter((f) => f.key !== boardField.key && f.key !== titleField.key).slice(0, 2);

  return (
    <div data-board className="grid gap-4 md:auto-cols-[minmax(14rem,1fr)] md:grid-flow-col md:overflow-x-auto">
      {groupByField(records, boardField).map((col) => (
        <section key={col.value ?? "__none"} className="rounded-lg border border-border bg-card/50 p-3">
          <h4 className="mb-2 flex items-center justify-between text-sm font-medium">
            {col.value ?? t("noValue")}
            <span className="text-muted-foreground">{col.records.length}</span>
          </h4>
          <ul className="space-y-2">
            {col.records.map((rec) => (
              <li key={rec.id}>
                <button type="button" onClick={() => onOpen(rec)}
                  className="min-h-11 w-full rounded-md border border-border bg-card p-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring">
                  <span className="block font-medium">{formatValue(titleField, rec.values[titleField.key], yesNo)}</span>
                  {detailFields.map((f) => (
                    <span key={f.key} className="block text-xs text-muted-foreground">
                      {f.label}: {formatValue(f, rec.values[f.key], yesNo)}
                    </span>
                  ))}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
