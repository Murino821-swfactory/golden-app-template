"use client";

import { Fragment, useState } from "react";
import type { MemoResponse } from "@/lib/law-expert/types";
import type { ResearchCopy } from "@/lib/law-expert/copy";
import { groupMemo, safePdfUrl, type MemoPart } from "@/lib/law-expert/view";
import { DecisionCard } from "./decision-card";
import { FacetStats } from "./facet-stats";
import { SaveCase } from "./save-case";

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

export function MemoView({ memo, copy, locale }: { memo: MemoResponse; copy: ResearchCopy; locale: string }) {
  const [open, setOpen] = useState<OpenQuote>(null);
  const sections = memo.memo ? groupMemo(memo.memo.blocks) : [];
  const hasUnsupported = sections.some((s) => s.parts.some((p) => p.unsupported));
  const seconds = (Object.values(memo.timingsMs).reduce((a, b) => a + b, 0) / 1000).toFixed(1);

  return (
    <div className="space-y-8">
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
                <DecisionCard hit={s} copy={copy} number={i + 1} ecli={s.ecli} truncated={s.truncated} />
              </li>
            ))}
          </ol>
          <FacetStats facets={memo.facets} copy={copy} />
          <p className="text-xs text-muted-foreground">{copy.search.source}</p>
        </section>
      )}

      <p className="text-xs text-muted-foreground">{copy.memo.took(seconds)}</p>

      {memo.memo && <SaveCase memo={memo} copy={copy} locale={locale} />}
    </div>
  );
}
