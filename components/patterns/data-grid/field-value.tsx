"use client";

import { formatValue } from "@/lib/records";
import type { EntityField } from "@/lib/prototype-config";
import { widgetFor } from "./widgets";

/** A stored value as the grid shows it: the field's widget cell, or the generic text. */
export function FieldValue({ field, value, labels }: { field: EntityField; value: unknown; labels: { yes: string; no: string } }) {
  const widget = widgetFor(field);
  return widget ? <widget.Cell value={value} /> : <>{formatValue(field, value, labels)}</>;
}
