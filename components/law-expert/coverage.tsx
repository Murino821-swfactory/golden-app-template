import type { SourceCoverage } from "@/lib/law-expert/types";
export function Coverage({ values = [], sk }: { values?: SourceCoverage[]; sk: boolean }) {
  const unique = values.filter((v, i) => values.findIndex(x => x.provider === v.provider && x.status === v.status && x.limited === v.limited) === i);
  const labels = sk ? { ok: "prehľadaný", failed: "výpadok — výsledky sú neúplné", unsupported: "neprehľadaný: nepodporuje zvolené filtre", excluded: "vylúčený filtrom súdu" }
    : { ok: "searched", failed: "unavailable — incomplete results", unsupported: "not searched: selected filters unsupported", excluded: "excluded by court filter" };
  return <div className="space-y-1 rounded-lg border border-border p-3 text-sm" role="status">
    {unique.map(v => <p key={`${v.provider}-${v.status}-${v.limited}`}>
      <strong>{v.provider === "nsud" ? "NS SR" : "InfoSúd"}</strong>: {labels[v.status]}{v.limited ? (sk ? "; len časť výsledkov bola dostupná" : "; only a bounded subset was available") : ""}
    </p>)}
    <p className="text-xs text-muted-foreground">{sk ? "Výsledky sú výberom z verejných databáz, nie úplným prehľadom judikatúry. NS SR používa poradie svojho indexu; textové dopyty sa medzi zdrojmi môžu správať odlišne." : "Results are a sample of public databases, not exhaustive case law. NS SR uses its index order; text matching differs between sources."}</p>
  </div>;
}
