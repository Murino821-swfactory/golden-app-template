import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { Research } from "../../components/law-expert/research";
import { ResearchArchive } from "../../components/law-expert/archive";
import { ResearchServices } from "../../components/law-expert/services";
import type { SavedResearch } from "../../lib/law-expert/saved";
import { encodeSnapshot, decodeSnapshot } from "../../lib/law-expert/saved";
import type { MemoResponse, SearchResponse } from "../../lib/law-expert/types";
const rows = (): SavedResearch[] => JSON.parse(sessionStorage.getItem("test-archive") || "[]");
const write = (records: SavedResearch[]) => sessionStorage.setItem("test-archive", JSON.stringify(records));
const params = new URLSearchParams(location.search), locale = params.get("lang") === "en" ? "en" : "sk";
const quote = "Súd preskúmal otázku zavinenia pri vniknutí do uzavretého priestoru.";
const source = { id: "nsud:247174", provider: "nsud" as const, court: "Najvyšší súd SR", fileNumber: "1Tdo/47/2026", date: "19.08.2026", form: "", nature: [], snippet: [], pdfUrl: "https://www.nsud.sk/data/att/5a8/874346.283215.pdf", ecli: "ECLI:SK:NSSR:2026:2318010039.1", truncated: false };
const memo: MemoResponse = { qualification: [], crimeType: "Iný", memo: null, sources: [source], facets: { courtType: [], region: [], form: [], nature: [], subarea: [] }, model: "test-model", costUsd: 0.02, timingsMs: { compare: 10 }, queries: ["vlámanie"], comparisons: [{ source: 0, relevance: "high", similarity: "Podobná právna otázka zavinenia.", differences: "Odlišná procesná fáza a dostupné dôkazy.", quote }], comparisonStatus: "ok", coverage: [{ provider: "infosud", status: "failed" }, { provider: "nsud", status: "ok" }] };
const search: SearchResponse = { total: 1, page: 0, items: [source], facets: memo.facets, hasMore: false, source: { name: "NS SR", updated: "" }, coverage: memo.coverage };
createRoot(document.getElementById("root")!).render(<NextIntlClientProvider locale={locale} messages={{}} timeZone="Europe/Bratislava"><ResearchServices.Provider value={{
  store: {
    list: async () => rows(),
    get: async id => { const row = rows().find(r => r.id === id); if (!row) throw new Error("not found"); return row; },
    save: async (id, title, snapshot) => {
      if (params.has("save-fails")) throw new Error("permission denied");
      write([...rows().filter(r => r.id !== id), { id, title, notes: "", snapshot: decodeSnapshot(encodeSnapshot(snapshot)) }]);
    },
    notes: async (id, notes) => write(rows().map(r => r.id === id ? { ...r, notes } : r)),
    remove: async id => write(rows().filter(r => r.id !== id)),
  },
  search: async filters => { sessionStorage.setItem("last-search", JSON.stringify(filters)); return { ok: true, data: search }; },
  research: async (facts, locale, filters, includeMemo) => {
    sessionStorage.setItem("last-request", JSON.stringify({ facts, locale, filters, includeMemo }));
    sessionStorage.setItem("model-calls", String(Number(sessionStorage.getItem("model-calls") ?? 0) + 1));
    return { ok: true, data: { ...memo, ...(includeMemo ? { memo: { blocks: [{ text: "Podložené stanovisko.", citations: [{ source: 0, quote }] }] } } : {}), searchedAt: new Date().toISOString() } };
  },
}}><main className="mx-auto max-w-5xl p-4">{location.pathname.endsWith("dashboard") ? <ResearchArchive locale={locale} /> : <Research />}</main></ResearchServices.Provider></NextIntlClientProvider>);
