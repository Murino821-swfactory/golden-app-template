"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { UiError } from "@/lib/law-expert/api";
import type { ResearchCopy } from "@/lib/law-expert/copy";
import type { Locale, SearchFilters, SearchResponse, SectionRef } from "@/lib/law-expert/types";
import type { ResearchSnapshot } from "@/lib/law-expert/saved";
import { suggestionLabel } from "@/lib/law-expert/view";
import { DecisionCard } from "./decision-card";
import { Filters } from "./filters";
import { Coverage } from "./coverage";
import { SaveResearch } from "./save-research";
import { useResearchServices } from "./services";

/** A choice that may be a whole section heading long: it wraps on a phone instead of overflowing. */
const choiceClass = "min-h-11 w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-foreground/5 sm:w-auto";

/** Where a search went wrong, what the section means, and the wider searches that do find something. */
function SearchHelp({ result, sk, onSearch }: { result: SearchResponse; sk: boolean; onSearch: (patch: SearchFilters) => void }) {
  const info = result.paragraphInfo;
  const section = (s: SectionRef) => <button key={s.section} type="button" className={choiceClass} onClick={() => onSearch({ paragraph: s.section })}>§ {s.section} — {s.heading}</button>;
  return <>
    {info && !info.wordsMatchHeading && <div role="status" className="space-y-2 rounded-lg border border-border p-3 text-sm">
      <p>{info.heading
        ? (sk ? `§ ${info.section} Trestného zákona je „${info.heading}“. Zadané slová v jeho názve nie sú — skontrolujte, či ide o správny paragraf.` : `Criminal Code § ${info.section} is “${info.heading}”. The words you typed are not in its heading — check that this is the section you mean.`)
        : (sk ? `Trestný zákon nemá § ${info.section}.` : `The Criminal Code has no § ${info.section}.`)}</p>
      {info.suggested.length > 0 && <div className="flex flex-wrap gap-2"><span className="self-center">{sk ? "Slovám zodpovedá:" : "Your words match:"}</span>{info.suggested.map(section)}</div>}
    </div>}
    {!!result.sectionSuggestions?.length && <div className="space-y-2 text-sm">
      <p>{sk ? "Pre úplné výsledky NS SR (aj dlhé rozhodnutia) hľadajte podľa paragrafu:" : "For complete NS SR results, long decisions included, search by section:"}</p>
      <div className="flex flex-wrap gap-2">{result.sectionSuggestions.map(section)}</div>
    </div>}
  </>;
}

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
  /** A suggested search replaces the form's filters, so what the user sees is what ran. */
  function searchWith(next: SearchFilters) { setFilters(next); void run({ ...next, page: 0 }); }
  const result = snapshot?.search;
  const react = (action: "select" | "unselect" | "save" | "pdf", resultId?: string, rank?: number) => {
    if (result?.searchId) services.feedback({ searchId: result.searchId, action, resultId, rank });
  };
  return <div className="space-y-6">
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); void run({ ...filters, page: 0 }); }} className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
      <label className="block space-y-1 text-sm"><span>{copy.search.query}</span><input value={filters.q ?? ""} onChange={e => setFilters({ ...filters, q: e.target.value })} maxLength={200} placeholder={copy.search.queryPlaceholder} className="h-11 w-full rounded-md border border-border bg-background px-3" /></label>
      <Filters value={filters} onChange={setFilters} sk={sk} disabled={loading} />
      <Button type="submit" disabled={loading} className="min-h-11">{loading ? copy.search.searching : copy.search.submit}</Button>
      <p className="text-xs text-muted-foreground">{copy.search.logged}</p>
    </form>
    <div aria-live="polite" aria-busy={loading}>
      {error && <p role="alert">{copy.errors[error]}</p>}
      {result && snapshot && !error && <div className="space-y-4">
        <Coverage values={result.coverage} sk={sk} />
        <SearchHelp result={result} sk={sk} onSearch={patch => searchWith({ ...snapshot.filters, ...patch })} />
        <p className="text-sm">{result.items.length ? (sk ? `Zobrazených ${result.items.length} rozhodnutí. Počty v zdrojoch pred odstránením duplicít: ${result.total}.` : `Showing ${result.items.length} decisions. Source counts before deduplication: ${result.total}.`) : copy.search.none}</p>
        {!result.items.length && !!result.suggestions?.length && <div className="space-y-2">
          <p className="text-sm font-medium">{sk ? "Tieto širšie hľadania výsledky majú:" : "These wider searches do have results:"}</p>
          <div className="flex flex-wrap gap-2">{result.suggestions.map(s => <button key={s.reason} type="button" className={choiceClass} onClick={() => searchWith(s.filters)}>{suggestionLabel(s, sk)}</button>)}</div>
        </div>}
        <ol className="space-y-3">{result.items.map((hit, rank) => <li key={hit.id}>
          <DecisionCard hit={hit} copy={copy} ecli={hit.ecli} onOpenPdf={() => react("pdf", hit.id, rank)} />
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={snapshot.selectedIds.includes(hit.id)} onChange={e => { react(e.target.checked ? "select" : "unselect", hit.id, rank); setSnapshot({ ...snapshot, selectedIds: e.target.checked ? [...snapshot.selectedIds, hit.id] : snapshot.selectedIds.filter(id => id !== hit.id) }); }} />{sk ? "Vybrať pre ďalšiu prácu" : "Select for further work"}</label>
        </li>)}</ol>
        <div className="flex justify-between gap-3">
          <Button variant="outline" disabled={loading || result.page === 0} onClick={() => void run({ ...snapshot.filters, page: result.page - 1 })}>{copy.search.previous}</Button>
          <Button variant="outline" disabled={loading || !(result.hasMore ?? (result.total > (result.page + 1) * 10)) || result.page >= 50} onClick={() => void run({ ...snapshot.filters, page: result.page + 1 })}>{copy.search.next}</Button>
        </div>
        <p className="text-xs text-muted-foreground">{sk ? "Ukladá sa práve zobrazená strana s jej filtrami a výberom. Ďalšiu stranu môžete uložiť ako samostatnú rešerš." : "Saves the displayed page, filters and selections. Save another page as a separate research snapshot."}</p>
        <SaveResearch key={`${snapshot.searchedAt}:${snapshot.selectedIds.join()}`} snapshot={snapshot} onSaved={() => react("save")} />
      </div>}
    </div>
  </div>;
}
