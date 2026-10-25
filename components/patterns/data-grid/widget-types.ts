import type { ComponentType } from "react";
import type { EntityField } from "@/lib/prototype-config";

/**
 * widget-types.ts — the contract of a field widget (see widgets.ts). Kept apart from the
 * registry so a widget can import it without importing itself back.
 */

export interface FieldWidgetInputProps {
  id: string;
  field: EntityField;
  uid: string | null;
  value: unknown;
  onChange: (value: unknown) => void;
  invalid: boolean;
  describedBy?: string;
  /** 0–1 while the form uploads this field, otherwise null. */
  progress: number | null;
  disabled: boolean;
}

export interface FieldWidgetContext {
  uid: string;
  locale: string;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}

export interface FieldWidget {
  /** Form state from what is stored (`undefined` when adding). */
  initial(stored: unknown): unknown;
  /** The value validation sees, before anything is uploaded. */
  draft(value: unknown): string;
  /** A problem the generic rules cannot see, in the visitor's language. */
  issue(value: unknown, locale: string): string | null;
  /** The value to store, after uploading what it must. */
  commit(value: unknown, context: FieldWidgetContext): Promise<string>;
  /** Frees what a stored value owns once no record refers to it. */
  release(stored: unknown, uid: string): Promise<void>;
  Input: ComponentType<FieldWidgetInputProps>;
  Cell: ComponentType<{ value: unknown }>;
}

/** An error whose message is already written for the visitor. */
export class FieldWidgetError extends Error {}
