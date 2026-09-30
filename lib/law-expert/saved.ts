import type { Locale, MemoResponse, SearchFilters, SearchResponse } from "./types";

export interface ResearchSnapshot {
  version: 1;
  mode: "search" | "problem";
  locale: Locale;
  facts: string;
  filters: SearchFilters;
  includeMemo: boolean;
  searchedAt: string;
  search: SearchResponse | null;
  memo: MemoResponse | null;
  selectedIds: string[];
}
export interface SavedResearch {
  id: string;
  title: string;
  notes: string;
  snapshot: ResearchSnapshot;
}

/** A versioned snapshot: reopening never spends tokens or changes yesterday's evidence. */
export function encodeSnapshot(snapshot: ResearchSnapshot): string {
  const json = JSON.stringify(snapshot);
  if (new TextEncoder().encode(json).length > 700_000) throw new Error("Research too large");
  return json;
}
export function decodeSnapshot(json: string): ResearchSnapshot {
  const value = JSON.parse(json) as ResearchSnapshot;
  if (value?.version !== 1 || !["search", "problem"].includes(value.mode) ||
    !["sk", "en"].includes(value.locale) || typeof value.facts !== "string" ||
    typeof value.includeMemo !== "boolean" || typeof value.searchedAt !== "string" ||
    !Number.isFinite(Date.parse(value.searchedAt)) ||
    !value.filters || Array.isArray(value.filters) || typeof value.filters !== "object" || !Array.isArray(value.selectedIds) ||
    value.selectedIds.some(id => typeof id !== "string") ||
    (value.search !== null && (!Array.isArray(value.search?.items) || !value.search?.facets)) ||
    (value.memo !== null && (!Array.isArray(value.memo?.sources) || !Array.isArray(value.memo?.qualification)))) {
    throw new Error("Unsupported research snapshot");
  }
  return value;
}
export function repeatInput(snapshot: ResearchSnapshot) {
  return { mode: snapshot.mode, facts: snapshot.facts, filters: { ...snapshot.filters, page: 0 }, includeMemo: snapshot.includeMemo };
}
