import { sourceWidget } from "@/components/gitpulse/source-field";
import type { FieldWidget } from "./widget-types";

export type { FieldWidget } from "./widget-types";
export { FieldWidgetError } from "./widget-types";

/**
 * widgets.ts — fields whose input and cell are drawn by prototype code instead of the
 * generic controls (demo/gitpulse-studio: a content item's `repository` is a source picker
 * that also takes a video, an image, a sound, a Markdown file or a link).
 *
 * A widget still stores ONE value of its field's configured type, so the grid's search,
 * sort, coercion and the Firestore rules see nothing new. What it adds is the lifecycle
 * around that value: an upload before the record is written, and freeing the file once
 * no record refers to it.
 */

const FIELD_WIDGETS: Readonly<Record<string, FieldWidget | undefined>> = { repository: sourceWidget };

export function widgetFor(field: { key: string }): FieldWidget | undefined {
  return Object.hasOwn(FIELD_WIDGETS, field.key) ? FIELD_WIDGETS[field.key] : undefined;
}
