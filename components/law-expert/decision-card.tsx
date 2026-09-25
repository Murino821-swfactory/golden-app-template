import type { DecisionHit, Segment } from "@/lib/law-expert/types";
import type { ResearchCopy } from "@/lib/law-expert/copy";
import { safePdfUrl } from "@/lib/law-expert/view";

/** Snippet text with InfoSúd's hits in weight and underline — the palette has one hue. */
function Snippet({ segments }: { segments: Segment[] }) {
  return (
    <p className="mt-3 text-sm leading-relaxed text-card-foreground/90">
      {segments.map((s, i) =>
        s.hit ? (
          <strong key={i} className="font-semibold underline decoration-2 underline-offset-2">
            {s.text}
          </strong>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </p>
  );
}

interface DecisionCardProps {
  hit: DecisionHit;
  copy: ResearchCopy;
  /** Source number in a memo — the number its citations point to. */
  number?: number;
  ecli?: string | null;
  truncated?: boolean;
}

export function DecisionCard({ hit, copy, number, ecli, truncated }: DecisionCardProps) {
  const pdf = safePdfUrl(hit.pdfUrl);
  return (
    <article
      id={number ? `source-${number}` : undefined}
      className="scroll-mt-24 rounded-lg border border-border bg-card p-4 text-card-foreground"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 font-medium">
          {number !== undefined && <span className="mr-2 tabular-nums">{number}.</span>}
          {hit.fileNumber}
        </h3>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{hit.date}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{hit.court}</p>
      <p className="text-sm text-muted-foreground">
        {[hit.form, ...hit.nature].filter(Boolean).join(", ")}
      </p>
      {hit.snippet.length > 0 && <Snippet segments={hit.snippet} />}
      {ecli && (
        <p className="mt-2 break-all text-xs text-muted-foreground">
          {copy.memo.ecli} {ecli}
        </p>
      )}
      {truncated && <p className="mt-1 text-xs text-muted-foreground">{copy.memo.truncated}</p>}
      {pdf && (
        <a
          href={pdf}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
        >
          {copy.search.pdf}
        </a>
      )}
    </article>
  );
}
