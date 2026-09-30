"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { UiError } from "@/lib/law-expert/api";
import type { ResearchCopy } from "@/lib/law-expert/copy";
import type { Locale, SearchFilters } from "@/lib/law-expert/types";
import type { ResearchSnapshot } from "@/lib/law-expert/saved";
import { DecisionCard } from "./decision-card";
import { Filters } from "./filters";
import { Coverage } from "./coverage";
import { SaveResearch } from "./save-research";
import { useResearchServices } from "./services";

export function DecisionSearch({ copy, locale, initial }: { copy: ResearchCopy; locale: Locale; initial?: SearchFilters }) {
  const sk = locale === "sk", services = useResearchServices();
  const [filters, setFilters] = useState<SearchFilters>(initial ?? { source: "all" });
  const [snapshot, setSnapshot] = useState<ResearchSnapshot | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [loading, setLoading] = useState(false);
  async function run(params: SearchFilters) {
    setLoading(true); setError(null);
    const out = await services.search(params);
    setLoading(false);
    if (!out.ok) { setError(out.error); return; }
    setSnapshot({ version: 1, mode: "search", locale, facts: "", filters: params, includeMemo: false,
      searchedAt: new Date().toISOString(), search: out.data, memo: null, selectedIds: [] });
  }
  const result = snapshot?.search;
  return <div className="space-y-6">
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); void run({ ...filters, page: 0 }); }} className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
      <label className="block space-y-1 text-sm"><span>{copy.search.query}</span><input value={filters.q ?? ""} onChange={e => setFilters({ ...filters, q: e.target.value })} maxLength={200} placeholder={copy.search.queryPlaceholder} className="h-11 w-full rounded-md border border-border bg-background px-3" /></label>
      <Filters value={filters} onChange={setFilters} sk={sk} disabled={loading} />
      <Button type="submit" disabled={loading} className="min-h-11">{loading ? copy.search.searching : copy.search.submit}</Button>
    </form>
    <div aria-live="polite" aria-busy={loading}>
      {error && <p role="alert">{copy.errors[error]}</p>}
      {result && snapshot && !error && <div className="space-y-4">
        <Coverage values={result.coverage} sk={sk} />
        <p className="text-sm">{result.items.length ? (sk ? `Zobrazených ${result.items.length} rozhodnutí. Počty v zdrojoch pred odstránením duplicít: ${result.total}.` : `Showing ${result.items.length} decisions. Source counts before deduplication: ${result.total}.`) : copy.search.none}</p>
        <ol className="space-y-3">{result.items.map(hit => <li key={hit.id}>
          <DecisionCard hit={hit} copy={copy} ecli={hit.ecli} />
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={snapshot.selectedIds.includes(hit.id)} onChange={e => setSnapshot({ ...snapshot, selectedIds: e.target.checked ? [...snapshot.selectedIds, hit.id] : snapshot.selectedIds.filter(id => id !== hit.id) })} />{sk ? "Vybrať pre ďalšiu prácu" : "Select for further work"}</label>
        </li>)}</ol>
        <div className="flex justify-between gap-3">
          <Button variant="outline" disabled={loading || result.page === 0} onClick={() => void run({ ...snapshot.filters, page: result.page - 1 })}>{copy.search.previous}</Button>
          <Button variant="outline" disabled={loading || !(result.hasMore ?? (result.total > (result.page + 1) * 10)) || result.page >= 50} onClick={() => void run({ ...snapshot.filters, page: result.page + 1 })}>{copy.search.next}</Button>
        </div>
        <p className="text-xs text-muted-foreground">{sk ? "Ukladá sa práve zobrazená strana s jej filtrami a výberom. Ďalšiu stranu môžete uložiť ako samostatnú rešerš." : "Saves the displayed page, filters and selections. Save another page as a separate research snapshot."}</p>
        <SaveResearch key={`${snapshot.searchedAt}:${snapshot.selectedIds.join()}`} snapshot={snapshot} />
      </div>}
    </div>
  </div>;
}
