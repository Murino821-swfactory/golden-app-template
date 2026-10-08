import type { SourceCoverage } from "@/lib/law-expert/types";
import { coverageLine } from "@/lib/law-expert/view";
export function Coverage({ values = [], sk }: { values?: SourceCoverage[]; sk: boolean }) {
  // A research run searches each source several times: one line per distinct statement.
  const lines = [...new Set(values.map(v => coverageLine(v, sk)))];
  return <div className="space-y-1 rounded-lg border border-border p-3 text-sm" role="status">
    {lines.map(line => <p key={line}>{line}</p>)}
    <p className="text-xs text-muted-foreground">{sk ? "Výsledky sú výberom z verejných databáz, nie úplným prehľadom judikatúry. Zdroje hľadajú a radia odlišne." : "Results are a sample of public databases, not exhaustive case law. The sources search and rank differently."}</p>
  </div>;
}
