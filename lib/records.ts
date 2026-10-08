/**
 * records.ts — the grid's data rules, as pure functions.
 *
 * Nothing here imports Firebase: the landing's product preview uses `formatValue`, and a
 * landing section must never pull the Firestore SDK. The ONE place these ops meet Firestore
 * is lib/records-firestore.ts. The batch shapes are the contract factory-web's rules
 * enforce (sw-factory spec 2026-09-29-golden-template-v2-design.md §4.2): change one,
 * change both.
 */
import type { EntityField } from "./prototype-config";

export const RECORD_LIMIT = 200;
export const TEXT_MAX = 200;
export const LONGTEXT_MAX = 2000;

export interface EntityRecord {
  id: string;
  userId: string;
  createdAt: Date;
  values: Record<string, unknown>;
}

/** Every visitor's private sandbox. Without a demo slug (local dev) there is no tenant. */
export function sandboxRoot(slug: string | null, uid: string): string {
  return slug ? `demos/${slug}/users/${uid}` : `users/${uid}`;
}

export function recordsPath(slug: string | null, uid: string): string {
  return `${sandboxRoot(slug, uid)}/records`;
}

/** One write, described as data so the exact batch the rules demand is testable. */
export type RecordOp =
  | { kind: "setRecord"; path: string; values: Record<string, unknown> }
  | { kind: "updateRecord"; path: string; values: Record<string, unknown> }
  | { kind: "deleteRecord"; path: string }
  | { kind: "moveCounter"; path: string; delta: 1 | -1; last: string };

export function buildCreateOps(
  slug: string | null,
  uid: string,
  id: string,
  values: Record<string, unknown>
): RecordOp[] {
  return [
    { kind: "setRecord", path: `${recordsPath(slug, uid)}/${id}`, values },
    { kind: "moveCounter", path: sandboxRoot(slug, uid), delta: 1, last: id },
  ];
}

export function buildUpdateOps(
  slug: string | null,
  uid: string,
  id: string,
  values: Record<string, unknown>
): RecordOp[] {
  return [{ kind: "updateRecord", path: `${recordsPath(slug, uid)}/${id}`, values }];
}

export function buildDeleteOps(slug: string | null, uid: string, id: string): RecordOp[] {
  return [
    { kind: "deleteRecord", path: `${recordsPath(slug, uid)}/${id}` },
    { kind: "moveCounter", path: sandboxRoot(slug, uid), delta: -1, last: id },
  ];
}

export type ValueError = { key: string; code: "required" | "type" | "tooLong" | "option" };

/** Form input → the values Firestore stores. Only configured keys survive; empty = absent. */
export function coerceValues(
  fields: readonly EntityField[],
  raw: Record<string, unknown>
): { values: Record<string, unknown>; errors: ValueError[] } {
  const values: Record<string, unknown> = {};
  const errors: ValueError[] = [];
  for (const field of fields) {
    const key = field.key;
    const input = raw[key];
    if (field.type === "boolean") {
      values[key] = input === true;
      continue;
    }
    const text = typeof input === "number" ? String(input) : typeof input === "string" ? input.trim() : "";
    if (text === "") {
      if (field.required) errors.push({ key, code: "required" });
      continue;
    }
    switch (field.type) {
      case "number": {
        const n = Number(text);
        if (Number.isFinite(n)) values[key] = n;
        else errors.push({ key, code: "type" });
        break;
      }
      case "date":
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) values[key] = text;
        else errors.push({ key, code: "type" });
        break;
      case "select":
        if ((field.options ?? []).includes(text)) values[key] = text;
        else errors.push({ key, code: "option" });
        break;
      case "text":
        if (text.length <= TEXT_MAX) values[key] = text;
        else errors.push({ key, code: "tooLong" });
        break;
      case "longtext":
        if (text.length <= LONGTEXT_MAX) values[key] = text;
        else errors.push({ key, code: "tooLong" });
        break;
    }
  }
  return { values, errors };
}

/** Empty form state derived from the configured fields — booleans start false, the rest "". */
export function emptyValues(fields: readonly EntityField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) out[field.key] = field.type === "boolean" ? false : "";
  return out;
}

/** Which configured fields are missing a value that `required` demands. */
export function missingRequired(fields: readonly EntityField[], values: Record<string, unknown>): string[] {
  return fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = values[f.key];
      return v === undefined || v === null || v === "";
    })
    .map((f) => f.key);
}

/**
 * Newest first. Sorting stays in JS, not in the query: a server-side `orderBy` needs a
 * composite index per collection, and the set of prototypes is unbounded — do not move it
 * back into the query.
 */
export function sortByCreatedAtDesc(records: readonly EntityRecord[]): EntityRecord[] {
  return [...records].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function filterRecords(
  records: readonly EntityRecord[],
  fields: readonly EntityField[],
  query: string,
  chip: { key: string; value: string } | null
): EntityRecord[] {
  const q = query.trim().toLocaleLowerCase();
  const searchable = fields.filter((f) => f.type === "text" || f.type === "longtext" || f.type === "select");
  return records.filter((r) => {
    if (chip && r.values[chip.key] !== chip.value) return false;
    if (!q) return true;
    return searchable.some((f) => String(r.values[f.key] ?? "").toLocaleLowerCase().includes(q));
  });
}

export type SortKey = { key: string; dir: "asc" | "desc" } | null;

const isEmpty = (v: unknown) => v === undefined || v === null || v === "";

export function sortRecords(
  records: readonly EntityRecord[],
  fields: readonly EntityField[],
  sort: SortKey
): EntityRecord[] {
  const field = sort ? fields.find((f) => f.key === sort.key) : undefined;
  if (!sort || !field) return sortByCreatedAtDesc(records);
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    const av = a.values[field.key];
    const bv = b.values[field.key];
    if (isEmpty(av) && isEmpty(bv)) return 0;
    if (isEmpty(av)) return 1; // empties last, whatever the direction
    if (isEmpty(bv)) return -1;
    if (field.type === "number") return sign * (Number(av) - Number(bv));
    if (field.type === "boolean") return sign * (Number(av === true) - Number(bv === true));
    return sign * String(av).localeCompare(String(bv));
  });
}

export function formatValue(field: EntityField, value: unknown, labels: { yes: string; no: string }): string {
  if (isEmpty(value)) return "—";
  if (field.type === "boolean") return value === true ? labels.yes : labels.no;
  return String(value);
}

/** A first visit (no counter yet) with samples to show. A counter at 0 means the visitor
 * deleted every sample — they keep the empty grid they asked for. */
export function shouldSeed(counterExists: boolean, samples: readonly unknown[] | undefined): boolean {
  return !counterExists && (samples?.length ?? 0) > 0;
}

/** What a refused write means to the person who made it. */
export function writeErrorKind(
  code: string | undefined,
  countSeen: number,
  op: "create" | "update" | "delete"
): "limit" | "denied" | "other" {
  if (code !== "permission-denied") return "other";
  // One below the cap too: another tab may have added the record that filled it.
  if (op === "create" && countSeen >= RECORD_LIMIT - 1) return "limit";
  return "denied";
}
