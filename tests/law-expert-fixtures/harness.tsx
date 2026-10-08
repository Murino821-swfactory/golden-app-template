import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { Research } from "../../components/law-expert/research";
import { ResearchArchive } from "../../components/law-expert/archive";
import { ResearchServices } from "../../components/law-expert/services";
import type { SavedResearch } from "../../lib/law-expert/saved";
import { encodeSnapshot, decodeSnapshot } from "../../lib/law-expert/saved";
import type { MemoResponse, SearchFilters, SearchResponse } from "../../lib/law-expert/types";
const rows = (): SavedResearch[] => JSON.parse(sessionStorage.getItem("test-archive") || "[]");
const write = (records: SavedResearch[]) => sessionStorage.setItem("test-archive", JSON.stringify(records));
const params = new URLSearchParams(location.search), locale = params.get("lang") === "en" ? "en" : "sk";
const quote = "Súd preskúmal otázku zavinenia pri vniknutí do uzavretého priestoru.";
const source = { id: "nsud:247174", provider: "nsud" as const, court: "Najvyšší súd SR", fileNumber: "1Tdo/47/2026", date: "19.08.2026", form: "", nature: [], snippet: [], pdfUrl: "https://www.nsud.sk/data/att/5a8/874346.283215.pdf", ecli: "ECLI:SK:NSSR:2026:2318010039.1", truncated: false };
const HEADINGS: Record<string, string> = { "208": "Týranie blízkej osoby a zverenej osoby", "212": "Krádež", "352": "Falšovanie a pozmeňovanie verejnej listiny, úradnej pečate, úradnej uzávery, úradného znaku a úradnej značky" };
const memo: MemoResponse = { qualification: [], crimeType: "Iný", memo: null, sources: [source], facets: { courtType: [], region: [], form: [], nature: [], subarea: [] }, model: "test-model", costUsd: 0.02, timingsMs: { compare: 10 }, queries: ["vlámania"], comparisons: [{ source: 0, relevance: "high", similarity: "Podobná právna otázka zavinenia.", differences: "Odlišná procesná fáza a dostupné dôkazy.", quote }], comparisonStatus: "ok", coverage: [{ provider: "infosud", status: "failed" }, { provider: "nsud", status: "ok" }],
  plan: { queries: ["vlámania do garáže", "krádeže vlámaním"], sections: [{ section: "212", heading: "Krádež" }], issue: "Či vniknutie do uzamknutej garáže je krádežou vlámaním." },
  ranking: [{ id: source.id, relevance: "high", reason: "Rovnaká otázka vniknutia do uzavretého priestoru." }], rankingStatus: "ok", searchId: "researchlogid0000001" };
const search: SearchResponse = { total: 1, page: 0, items: [source], facets: memo.facets, hasMore: false, source: { name: "NS SR", updated: "" }, coverage: memo.coverage, searchId: "searchlogid000000001" };
/** Answers by what was asked, so the browser tests exercise each kind of result the API gives. */
function answer(filters: SearchFilters): SearchResponse {
  if (filters.paragraph === "208" && filters.q?.includes("listina")) return { ...search, total: 0, items: [],
    coverage: [{ provider: "infosud", status: "ok", total: 0, method: "fulltext", section: "208" }, { provider: "nsud", status: "ok", total: 0, method: "merito", section: "208", candidates: 168, scanned: 40, matched: 0, limited: true }],
    paragraphInfo: { section: "208", heading: HEADINGS["208"]!, wordsMatchHeading: false, suggested: [{ section: "352", heading: HEADINGS["352"]! }] },
    suggestions: [{ reason: "suggestedSection", filters: { q: filters.q, paragraph: "352", source: "all" }, total: 26, section: { section: "352", heading: HEADINGS["352"]! } }, { reason: "withoutSection", filters: { q: filters.q, source: "all" }, total: 57 }] };
  if (filters.paragraph) return { ...search, items: [{ ...source, merito: `§ ${filters.paragraph}/1 Tr.zák.` }],
    coverage: [{ provider: "infosud", status: "ok", total: 0, method: "fulltext", section: filters.paragraph }, { provider: "nsud", status: "ok", total: 1, method: "merito", section: filters.paragraph }],
    paragraphInfo: { section: filters.paragraph, heading: HEADINGS[filters.paragraph] ?? null, wordsMatchHeading: true, suggested: [] } };
  return search;
}
const log = (key: string, value: unknown) => sessionStorage.setItem(key, JSON.stringify([...JSON.parse(sessionStorage.getItem(key) || "[]"), value]));
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
  search: async filters => {
    sessionStorage.setItem("last-search", JSON.stringify(filters));
    return { ok: true, data: answer(filters) };
  },
  research: async (facts, locale, filters, includeMemo) => {
    sessionStorage.setItem("last-request", JSON.stringify({ facts, locale, filters, includeMemo }));
    sessionStorage.setItem("model-calls", String(Number(sessionStorage.getItem("model-calls") ?? 0) + 1));
    return { ok: true, data: { ...memo, ...(includeMemo ? { memo: { blocks: [{ text: "Podložené stanovisko.", citations: [{ source: 0, quote }] }] } } : {}), searchedAt: new Date().toISOString() } };
  },
  sections: async () => ({ ok: true, data: { version: "20260818", sections: HEADINGS } }),
  feedback: event => log("feedback", event),
}}><main className="mx-auto max-w-5xl p-4">{location.pathname.endsWith("dashboard") ? <ResearchArchive locale={locale} /> : <Research />}</main></ResearchServices.Provider></NextIntlClientProvider>);
