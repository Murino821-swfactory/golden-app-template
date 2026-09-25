"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { requestMemo, type UiError } from "@/lib/law-expert/api";
import type { ResearchCopy } from "@/lib/law-expert/copy";
import { getIdToken } from "@/lib/law-expert/token";
import type { Locale, MemoResponse } from "@/lib/law-expert/types";
import { FACTS_MAX, FACTS_MIN, factsState } from "@/lib/law-expert/view";
import { MemoView } from "./memo-view";

export function MemoPanel({ copy, locale }: { copy: ResearchCopy; locale: Locale }) {
  const [facts, setFacts] = useState("");
  const [loading, setLoading] = useState(false);
  const [memo, setMemo] = useState<MemoResponse | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [touched, setTouched] = useState(false);
  const state = factsState(facts);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!state.valid) return;
    setLoading(true);
    setError(null);
    setMemo(null);
    const out = await requestMemo(facts.trim(), locale, getIdToken);
    setLoading(false);
    if (out.ok) setMemo(out.data);
    else setError(out.error);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border bg-card p-4 sm:p-6">
        <label htmlFor="le-facts" className="block font-medium">
          {copy.memo.label}
        </label>
        <textarea
          id="le-facts"
          value={facts}
          onChange={(e) => setFacts(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={copy.memo.placeholder}
          rows={6}
          maxLength={FACTS_MAX}
          aria-describedby="le-facts-help"
          aria-invalid={touched && !state.valid}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-base leading-relaxed placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
        />
        <div id="le-facts-help" className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
          <p>{touched && state.tooShort ? copy.memo.tooShort(FACTS_MIN) : copy.memo.privacy}</p>
          <p className="shrink-0 tabular-nums">{copy.memo.counter(state.length, FACTS_MAX)}</p>
        </div>
        <Button type="submit" disabled={loading} className="h-11 w-full sm:w-auto sm:px-6">
          {copy.memo.submit}
        </Button>
      </form>

      <div aria-live="polite" aria-busy={loading}>
        {loading && (
          <p className="flex items-start gap-3 text-sm text-muted-foreground">
            <span
              aria-hidden="true"
              className="mt-1.5 size-2 shrink-0 rounded-full bg-foreground motion-safe:animate-pulse"
            />
            {copy.memo.working}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-border bg-card p-4 text-sm">
            {copy.errors[error]}
          </p>
        )}
        {memo && <MemoView memo={memo} copy={copy} locale={locale} />}
      </div>
    </div>
  );
}
