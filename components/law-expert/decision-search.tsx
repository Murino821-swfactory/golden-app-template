"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchDecisions, type SearchParams, type UiError } from "@/lib/law-expert/api";
import { COURT_TYPES, FORMS, REGIONS, type ResearchCopy } from "@/lib/law-expert/copy";
import { getIdToken } from "@/lib/law-expert/token";
import type { SearchResponse } from "@/lib/law-expert/types";
import { DecisionCard } from "./decision-card";
import { FacetStats } from "./facet-stats";

const PAGE_SIZE = 10;
const FIELD = "h-11 w-full rounded-md border border-border bg-background px-3 text-base sm:text-sm";

function Select({
  id,
  label,
  value,
  onChange,
  options,
  any,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  any: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
        <option value="">{any}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DecisionSearch({ copy }: { copy: ResearchCopy }) {
  const [q, setQ] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [from, setFrom] = useState("");
  const [courtType, setCourtType] = useState("");
  const [region, setRegion] = useState("");
  const [form, setForm] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<SearchParams | null>(null);

  async function run(params: SearchParams) {
    setLoading(true);
    setError(null);
    const out = await searchDecisions(params, getIdToken);
    setLoading(false);
    if (!out.ok) {
      setError(out.error);
      return;
    }
    setQuery(params);
    setResult(out.data);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void run({ q, paragraph, courtType, region, form, from, page: 0 });
  }

  const page = result?.page ?? 0;
  const lastPage = result ? Math.max(0, Math.ceil(result.total / PAGE_SIZE) - 1) : 0;

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
        <div className="space-y-1.5">
          <label htmlFor="le-q" className="text-sm text-muted-foreground">
            {copy.search.query}
          </label>
          <Input
            id="le-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={copy.search.queryPlaceholder}
            maxLength={200}
            className="h-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="le-paragraph" className="text-sm text-muted-foreground">
              {copy.search.paragraph}
            </label>
            <Input
              id="le-paragraph"
              value={paragraph}
              onChange={(e) => setParagraph(e.target.value.replace(/[^0-9a-z]/gi, "").toLowerCase())}
              placeholder={copy.search.paragraphPlaceholder}
              inputMode="numeric"
              maxLength={4}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="le-from" className="text-sm text-muted-foreground">
              {copy.search.from}
            </label>
            <Input id="le-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select id="le-court" label={copy.search.courtType} value={courtType} onChange={setCourtType} options={COURT_TYPES} any={copy.search.any} />
          <Select id="le-region" label={copy.search.region} value={region} onChange={setRegion} options={REGIONS} any={copy.search.any} />
          <Select id="le-form" label={copy.search.form} value={form} onChange={setForm} options={FORMS} any={copy.search.any} />
        </div>
        <Button type="submit" disabled={loading} className="h-11 w-full sm:w-auto sm:px-6">
          {loading ? copy.search.searching : copy.search.submit}
        </Button>
      </form>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="rounded-lg border border-border bg-card p-4 text-sm">
            {copy.errors[error]}
          </p>
        )}
        {result && !error && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {result.total > 0 ? copy.search.found(result.total) : copy.search.none}
            </p>
            {result.total > 0 && <FacetStats facets={result.facets} copy={copy} />}
            <ol className="space-y-3">
              {result.items.map((hit) => (
                <li key={hit.id}>
                  <DecisionCard hit={hit} copy={copy} />
                </li>
              ))}
            </ol>
            {result.total > PAGE_SIZE && query && (
              <div className="flex justify-between gap-3">
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={loading || page === 0}
                  onClick={() => void run({ ...query, page: page - 1 })}
                >
                  {copy.search.previous}
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={loading || page >= Math.min(lastPage, 50)}
                  onClick={() => void run({ ...query, page: page + 1 })}
                >
                  {copy.search.next}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{copy.search.source}</p>
          </div>
        )}
      </div>
    </div>
  );
}
