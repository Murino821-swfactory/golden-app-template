/** Records grouped by one select field — the board view's columns. Pure. */
import type { EntityField } from "./prototype-config";
import type { EntityRecord } from "./records";

export interface BoardColumn {
  /** The option, or null for records with no (or a no-longer-offered) value. */
  value: string | null;
  records: EntityRecord[];
}

export function groupByField(records: readonly EntityRecord[], field: EntityField): BoardColumn[] {
  const columns: BoardColumn[] = (field.options ?? []).map((value) => ({ value, records: [] }));
  const rest: BoardColumn = { value: null, records: [] };
  for (const record of records) {
    const v = record.values[field.key];
    const column = typeof v === "string" ? columns.find((c) => c.value === v) : undefined;
    (column ?? rest).records.push(record);
  }
  return rest.records.length > 0 ? [...columns, rest] : columns;
}
