"use client";

import { Fragment, useState } from "react";
import type { MemoResponse } from "@/lib/law-expert/types";
import type { ResearchCopy } from "@/lib/law-expert/copy";
import { groupMemo, safePdfUrl, type MemoPart } from "@/lib/law-expert/view";
import { DecisionCard } from "./decision-card";
import { FacetStats } from "./facet-stats";
import { Coverage } from "./coverage";

/**
 * The memo, rendered so that every claim can be checked: a cited sentence carries the
 * numbers of the decisions it quotes, and tapping a number opens the exact passage under
 * the paragraph. Text the model wrote without a quote is shown, but marked as such.
 */

type OpenQuote = { section: number; part: number; source: number } | null;

function Part({
  part,
  copy,
  isOpen,
  onToggle,
}: {
  part: MemoPart;
  copy: ResearchCopy;
  isOpen: (source: number) => boolean;
  onToggle: (source: number) => void;
}) {
  return (
    <>
      <span
        className={part.unsupported ? "text-muted-foreground underline decoration-dotted underline-offset-4" : undefined}
      >
        {part.text}
      </span>
      {part.sources.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onToggle(n)}
          aria-expanded={isOpen(n)}
          aria-label={copy.memo.showQuote(n)}
          className="mx-0.5 inline-flex h-6 min-w-6 -translate-y-1.5 items-center justify-center rounded-full border border-border px-1.5 text-[0.7rem] font-semibold tabular-nums transition-colors hover:bg-foreground/10 aria-expanded:bg-primary aria-expanded:text-primary-foreground"
        >
          {n}
        </button>
      ))}
    </>
  );
}

export function MemoView({ memo, copy, locale, onOpenPdf }: { memo: MemoResponse; copy: ResearchCopy; locale: string; onOpenPdf?: (id: string, rank: number) => void }) {
  const sk = locale === "sk";
  const reasons = new Map((memo.ranking ?? []).map(r => [r.id, r.reason]));
  const [open, setOpen] = useState<OpenQuote>(null);
  const sections = memo.memo ? groupMemo(memo.memo.blocks) : [];
  const hasUnsupported = sections.some((s) => s.parts.some((p) => p.unsupported));
  const seconds = (Object.values(memo.timingsMs).reduce((a, b) => a + b, 0) / 1000).toFixed(1);

  return (
    <div className="space-y-8">
      <Coverage values={memo.coverage} sk={sk} />
      {memo.plan ? <div className="space-y-1 text-sm text-muted-foreground">
        {memo.plan.issue && <p>{sk ? "Právna otázka: " : "Legal question: "}{memo.plan.issue}</p>}
        {!!memo.plan.queries.length && <p>{sk ? "Hľadané výrazy: " : "Search expressions: "}{memo.plan.queries.join(" · ")}</p>}
        {!!memo.plan.sections.length && <p>{sk ? "Hľadané paragrafy: " : "Sections searched: "}{memo.plan.sections.map(s => `§ ${s.section}${s.heading ? ` ${s.heading}` : ""}`).join(" · ")}</p>}
      </div> : !!memo.queries?.length && <p className="text-sm text-muted-foreground">{sk ? "Použité dopyty: " : "Queries used: "}{memo.queries.join(" · ")}</p>}
      {memo.rankingStatus === "failed" && <p role="status" className="text-sm">{sk ? "Zoradenie podľa právnej otázky sa nepodarilo; rozhodnutia sú v poradí, v akom ich našlo viac hľadaní." : "Ranking by legal question failed; decisions are ordered by how many searches found them."}</p>}
      {memo.rankingStatus === "empty" && <p role="status" className="text-sm">{sk ? "Model nenašiel rozhodnutie jednoznačne k vašej otázke; zobrazujeme najbližšie nájdené." : "The model found no decision clearly on your question; the nearest ones found are shown."}</p>}
      {!!memo.unreadableCount && <p role="status" className="text-sm">{sk ? `Nepodarilo sa prečítať ${memo.unreadableCount} dokumentov.` : `${memo.unreadableCount} documents could not be read.`}</p>}
      {memo.comparisonStatus && memo.comparisonStatus !== "ok" && <p role="status">{sk ? "Podobnosť sa nepodarilo podložiť overenou pasážou. Nižšie sú kandidáti, nie potvrdené podobné prípady." : "Similarity could not be supported by a verified passage. The documents below are candidates, not confirmed similar cases."}</p>}
      {!!memo.comparisons?.length && <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">{sk ? "Podobnosť a rozdiely" : "Similarities and differences"}</h2>
        <p className="text-xs text-muted-foreground">{sk ? "Porovnanie vytvorila AI z načítaných pasáží. Citovaný text bol overený v zdroji; posúdenie právnej podobnosti si vyžaduje kontrolu advokátom." : "AI compared the retrieved passages. Quoted text was checked against the source; legal similarity still requires a lawyer’s review."}</p>
        {memo.comparisons.map(c => <article key={c.source} className="space-y-2 rounded-lg border border-border bg-card p-4">
          <a className="font-medium underline" href={`#source-${c.source + 1}`}>{memo.sources[c.source]?.fileNumber} · {memo.sources[c.source]?.court}</a>
          <p className="text-xs text-muted-foreground">{sk ? "Relevancia: " : "Relevance: "}{(sk ? { high: "vysoká", medium: "čiastočná", low: "nízka" } : { high: "high", medium: "partial", low: "low" })[c.relevance]}</p>
          <p className="text-sm"><strong>{sk ? "Podobnosť: " : "Similarity: "}</strong>{c.similarity}</p>
          <p className="text-sm"><strong>{sk ? "Rozdiely a neistoty: " : "Differences and uncertainties: "}</strong>{c.differences}</p>
          <blockquote className="whitespace-pre-wrap border-l-2 border-primary pl-3 text-sm">{c.quote}</blockquote>
        </article>)}
      </section>}

      {memo.memoUnavailable && (
        <p role="status" className="rounded-lg border border-border bg-card p-4 text-sm">
          {copy.memo.unavailable[memo.memoUnavailable]}
        </p>
      )}

      {memo.qualification.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">{copy.memo.qualification}</h2>
          <ul className="space-y-3">
            {memo.qualification.map((q) => (
              <li key={q.section} className="rounded-lg border border-border bg-card p-4 text-card-foreground">
                <p className="font-heading text-xl font-semibold tabular-nums">§ {q.section}</p>
                <p className="mt-1 text-sm leading-relaxed">{q.reason}</p>
                <a
                  href={q.slovLexUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
                >
                  {copy.memo.slovLex}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sections.length > 0 && (
        <section className="space-y-6">
          <p className="text-sm text-muted-foreground">{copy.memo.disclaimer(memo.model)}</p>
          {sections.map((section, si) => {
            const here = open && open.section === si ? open : null;
            const source = here ? memo.sources[here.source - 1] : undefined;
            const passage = here ? section.parts[here.part]?.quotes.find((q) => q.source === here.source)?.quote : undefined;
            return (
              <div key={si} className="space-y-3">
                {section.heading && <h3 className="font-heading text-lg font-semibold">{section.heading}</h3>}
                <p className="max-w-prose whitespace-pre-line leading-relaxed">
                  {section.parts.map((part, pi) => (
                    <Fragment key={pi}>
                      <Part
                        part={part}
                        copy={copy}
                        isOpen={(n) => open?.section === si && open.part === pi && open.source === n}
                        onToggle={(n) =>
                          setOpen((cur) =>
                            cur && cur.section === si && cur.part === pi && cur.source === n
                              ? null
                              : { section: si, part: pi, source: n }
                          )
                        }
                      />
                    </Fragment>
                  ))}
                </p>
                {here && passage && source && (
                  <blockquote className="max-w-prose border-l-2 border-foreground/60 pl-4">
                    <p className="text-sm leading-relaxed">„{passage}“</p>
                    <footer className="mt-2 text-xs text-muted-foreground">
                      <a href={`#source-${here.source}`} className="underline underline-offset-4">
                        {here.source}. {source.fileNumber}, {source.court}
                      </a>
                      {safePdfUrl(source.pdfUrl) && (
                        <>
                          {", "}
                          <a
                            href={safePdfUrl(source.pdfUrl)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-4"
                          >
                            PDF
                          </a>
                        </>
                      )}
                    </footer>
                  </blockquote>
                )}
              </div>
            );
          })}
          {hasUnsupported && (
            <p className="text-xs text-muted-foreground">{copy.memo.unsupported}</p>
          )}
        </section>
      )}

      {memo.sources.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">{copy.memo.sources}</h2>
          <ol className="space-y-3">
            {memo.sources.map((s, i) => (
              <li key={s.id}>
                <DecisionCard hit={s} copy={copy} number={i + 1} ecli={s.ecli} truncated={s.truncated} reason={reasons.get(s.id)} onOpenPdf={() => onOpenPdf?.(s.id, i)} />
              </li>
            ))}
          </ol>
          <FacetStats facets={memo.facets} copy={copy} />
          <p className="text-xs text-muted-foreground">{copy.search.source}</p>
        </section>
      )}

      <p className="text-xs text-muted-foreground">{copy.memo.took(seconds)}</p>


    </div>
  );
}
