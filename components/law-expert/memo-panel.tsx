"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { UiError } from "@/lib/law-expert/api";
import type { ResearchCopy } from "@/lib/law-expert/copy";
import type { Locale, SearchFilters } from "@/lib/law-expert/types";
import type { ResearchSnapshot } from "@/lib/law-expert/saved";
import { FACTS_MAX, FACTS_MIN, factsState } from "@/lib/law-expert/view";
import { MemoView } from "./memo-view";
import { Filters } from "./filters";
import { SaveResearch } from "./save-research";
import { useResearchServices } from "./services";

export function MemoPanel({ copy, locale, initial }: { copy: ResearchCopy; locale: Locale; initial?: { facts: string; filters: SearchFilters; includeMemo: boolean } }) {
  const sk = locale === "sk", services = useResearchServices();
  const [facts, setFacts] = useState(initial?.facts ?? "");
  const [filters, setFilters] = useState<SearchFilters>(initial?.filters ?? { source: "all" });
  const [includeMemo, setIncludeMemo] = useState(initial?.includeMemo ?? false);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<ResearchSnapshot | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [touched, setTouched] = useState(false);
  const state = factsState(facts);
  const react = (action: "select" | "unselect" | "save" | "pdf", resultId?: string, rank?: number) => {
    const searchId = snapshot?.memo?.searchId;
    if (searchId) services.feedback({ searchId, action, resultId, rank });
  };
  async function onSubmit(e: FormEvent) {
    e.preventDefault(); setTouched(true);
    if (!state.valid || loading) return;
    setLoading(true); setError(null); setSnapshot(null);
    // Capture submitted input; later edits cannot silently change a saved result's provenance.
    const input = { facts: facts.trim(), filters: { ...filters }, includeMemo };
    const out = await services.research(input.facts, locale, input.filters, input.includeMemo);
    setLoading(false);
    if (out.ok) setSnapshot({ version: 1, mode: "problem", locale, ...input, searchedAt: out.data.searchedAt ?? new Date().toISOString(), memo: out.data, search: null, selectedIds: [] });
    else setError(out.error);
  }
  return <div className="space-y-8">
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
      <label htmlFor="le-facts" className="block font-medium">{sk ? "Právna otázka a okolnosti prípadu" : "Legal issue and circumstances"}</label>
      <textarea id="le-facts" value={facts} onChange={e => setFacts(e.target.value)} onBlur={() => setTouched(true)} placeholder={copy.memo.placeholder} rows={6} maxLength={FACTS_MAX} aria-describedby="le-facts-help" aria-invalid={touched && !state.valid} className="w-full rounded-md border border-border bg-background px-3 py-2 text-base leading-relaxed" />
      <div id="le-facts-help" className="flex justify-between gap-3 text-xs text-muted-foreground"><p>{touched && state.tooShort ? copy.memo.tooShort(FACTS_MIN) : copy.memo.privacy}</p><p className="shrink-0">{state.length}/{FACTS_MAX}</p></div>
      <details><summary className="min-h-11 cursor-pointer text-sm">{sk ? "Zdroje a filtre (predvolene bez časového obmedzenia)" : "Sources and filters (no date limit by default)"}</summary><Filters value={filters} onChange={setFilters} sk={sk} disabled={loading} /></details>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={includeMemo} onChange={e => setIncludeMemo(e.target.checked)} />{sk ? "Pridať aj stanovisko s citáciami" : "Include a cited memo"}</label>
      <Button type="submit" disabled={loading} className="min-h-11">{sk ? "Nájsť a porovnať rozhodnutia" : "Find and compare decisions"}</Button>
    </form>
    <div aria-live="polite" aria-busy={loading}>
      {loading && <p className="text-sm text-muted-foreground">{copy.memo.working}</p>}
      {error && <p role="alert">{copy.errors[error]}</p>}
      {snapshot?.memo && <div className="space-y-6">
        <MemoView memo={snapshot.memo} copy={copy} locale={locale} onOpenPdf={(id, rank) => react("pdf", id, rank)} />
        {snapshot.memo.sources.length > 0 && <fieldset className="space-y-2"><legend className="font-medium">{sk ? "Rozhodnutia pre ďalšiu prácu" : "Decisions for further work"}</legend>{snapshot.memo.sources.map((hit, rank) => <label key={hit.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={snapshot.selectedIds.includes(hit.id)} onChange={e => { react(e.target.checked ? "select" : "unselect", hit.id, rank); setSnapshot({ ...snapshot, selectedIds: e.target.checked ? [...snapshot.selectedIds, hit.id] : snapshot.selectedIds.filter(id => id !== hit.id) }); }} />{hit.fileNumber} · {hit.court}</label>)}</fieldset>}
        <SaveResearch key={`${snapshot.searchedAt}:${snapshot.selectedIds.join()}`} snapshot={snapshot} onSaved={() => react("save")} />
      </div>}
    </div>
  </div>;
}
