import type { Facets } from "@/lib/law-expert/types";
import type { ResearchCopy } from "@/lib/law-expert/copy";
import { facetShares } from "@/lib/law-expert/view";

/**
 * How a result set splits — straight from the counts InfoSúd returns with every search,
 * so it costs nothing and describes all matching decisions, not just the page shown.
 */
export function FacetStats({ facets, copy }: { facets: Facets; copy: ResearchCopy }) {
  const groups = [
    { label: copy.stats.form, shares: facetShares(facets.form) },
    { label: copy.stats.nature, shares: facetShares(facets.nature) },
    { label: copy.stats.region, shares: facetShares(facets.region) },
  ].filter((g) => g.shares.length > 0);
  if (groups.length === 0) return null;

  return (
    <details className="rounded-lg border border-border bg-card p-4 text-card-foreground">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium">{copy.stats.title}</summary>
      <div className="mt-3 grid gap-6 sm:grid-cols-3">
        {groups.map((g) => (
          <div key={g.label}>
            <h4 className="mb-2 text-sm text-muted-foreground">{g.label}</h4>
            <ul className="space-y-2">
              {g.shares.map((s) => (
                <li key={s.value} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">{s.value}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{s.percent} %</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted" aria-hidden="true">
                    <div className="h-full rounded-full bg-foreground/70" style={{ width: `${s.percent}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
