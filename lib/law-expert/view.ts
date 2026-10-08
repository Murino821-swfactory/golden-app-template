import type { FacetValue, MemoBlock, MemoResponse, SearchSuggestion, SourceCoverage } from "./types";
import { LONGTEXT_MAX } from "@/lib/records";

/**
 * What the research page shows, decided without a browser. Kept apart from the
 * components so `tests/law-expert-logic.spec.ts` can pin it — the signed-in page has no
 * e2e test of its own.
 */

/** Same bounds the server enforces (factory-web `handler.ts`); here only to guide typing. */
export const FACTS_MIN = 20;
export const FACTS_MAX = 2_000;

/** Below this, uncited text is a connective ("." / ", ktorý") — not a claim worth flagging. */
const CLAIM_MIN_CHARS = 40;

export interface MemoPart {
  text: string;
  /** 1-based numbers of the sources this text cites — the markers after it. */
  sources: number[];
  quotes: { source: number; quote: string }[];
  unsupported: boolean;
}

export interface MemoSection {
  heading: string | null;
  parts: MemoPart[];
}

export function isUnsupported(block: MemoBlock): boolean {
  return !block.heading && block.citations.length === 0 && block.text.trim().length >= CLAIM_MIN_CHARS;
}

export function citedSources(block: MemoBlock): number[] {
  return [...new Set(block.citations.map((c) => c.source + 1))].sort((a, b) => a - b);
}

export function groupMemo(blocks: MemoBlock[]): MemoSection[] {
  const sections: MemoSection[] = [];
  for (const block of blocks) {
    if (block.heading) {
      sections.push({ heading: block.heading, parts: [] });
      continue;
    }
    if (sections.length === 0) sections.push({ heading: null, parts: [] });
    sections[sections.length - 1]!.parts.push({
      text: block.text,
      sources: citedSources(block),
      quotes: block.citations.map((c) => ({ source: c.source + 1, quote: c.quote })),
      unsupported: isUnsupported(block),
    });
  }
  return sections;
}

export interface FacetShare extends FacetValue {
  percent: number;
}

export function facetShares(values: FacetValue[], top = 4): FacetShare[] {
  const total = values.reduce((n, v) => n + v.count, 0);
  if (total === 0) return [];
  return [...values]
    .sort((a, b) => b.count - a.count)
    .slice(0, top)
    .map((v) => ({ ...v, percent: Math.round((v.count / total) * 100) }));
}

export function factsState(text: string) {
  const length = text.trim().length;
  return { length, tooShort: length < FACTS_MIN, tooLong: length > FACTS_MAX, valid: length >= FACTS_MIN && length <= FACTS_MAX };
}

/**
 * Values for the prototype's `case` entity (prototype.config.json → patterns.dataGrid).
 * The memo knows the qualification and the sources; the case number and the court are
 * the user's own matter, so they come from the form.
 */
/** The template stores a longtext of at most LONGTEXT_MAX characters (golden template v2,
 * `coerceValues`); a longer one would refuse the whole save. Cut, mark the cut, keep the save. */
function capNotes(notes: string): string {
  return notes.length <= LONGTEXT_MAX ? notes : `${notes.slice(0, LONGTEXT_MAX - 1)}…`;
}

export function caseRecordValues(
  memo: MemoResponse,
  own: { caseNumber: string; courtName: string }
): Record<string, unknown> {
  const qualification = memo.qualification.map((q) => `§ ${q.section} Tr. zák.: ${q.reason}`);
  const sources = memo.sources.map((s) => `${s.ecli ?? s.fileNumber} (${s.court}, ${s.date})`);
  return {
    caseNumber: own.caseNumber.trim(),
    courtName: own.courtName.trim(),
    crimeType: memo.crimeType,
    status: "Prebieha",
    decisionDate: "",
    notes: capNotes([...qualification, "", "Judikatúra:", ...sources].join("\n")),
  };
}

const PDF_URL = /^https:\/\/obcan\.justice\.sk\/content\/public\/item\/[0-9a-f-]{36}$/i;

/** The server already restricts PDF links; the page checks again before rendering an href. */
export function safePdfUrl(url: string | null | undefined): string | null {
  return url && (PDF_URL.test(url) || /^https:\/\/www\.nsud\.sk\/data\/att\/[a-z0-9]+\/[a-z0-9.-]+\.pdf$/i.test(url)) ? url : null;
}

/**
 * One line per source saying how it was searched and what the result can and cannot claim —
 * never "searched, nothing" when the source could not have found it (audit 2026-10-08).
 */
export function coverageLine(c: SourceCoverage, sk: boolean): string {
  const name = c.provider === "nsud" ? "NS SR" : "InfoSúd";
  const status = { ok: sk ? "prehľadaný" : "searched", failed: sk ? "výpadok — výsledky sú neúplné" : "unavailable — incomplete results",
    unsupported: sk ? "neprehľadaný: nepodporuje zvolené filtre" : "not searched: selected filters unsupported",
    excluded: sk ? "vylúčený filtrom súdu" : "excluded by court filter" }[c.status];
  const parts = [`${name}: ${status}`];
  if (c.status === "ok") {
    if (c.method === "fulltext" && c.section) parts.push(sk ? `§ ${c.section} hľadaný v texte rozhodnutí` : `§ ${c.section} searched in decision text`);
    if (c.method === "merito") parts.push(sk ? `§ ${c.section} v hlavnej kvalifikácii rozhodnutia (merito)` : `§ ${c.section} in the decision's main qualification (merito)`);
    if (c.scanned !== undefined) parts.push(sk ? `slová overené v ${c.scanned} z ${c.candidates} rozhodnutí, zhoda ${c.matched}` : `words checked in ${c.scanned} of ${c.candidates} decisions, ${c.matched} matched`);
    if (c.shortOnly) parts.push(sk ? "textové hľadanie NS SR pokrýva len kratšie rozhodnutia — pre úplné výsledky NS SR zadajte § Trestného zákona" : "NS SR text search covers shorter decisions only — enter a Criminal Code section for complete NS SR results");
    if (c.capped) parts.push(sk ? "zdroj vrátil najviac 1 000 záznamov" : "the source returned at most 1,000 records");
    if (c.limited && !c.shortOnly && !c.capped && c.scanned === undefined) parts.push(sk ? "len časť výsledkov bola dostupná" : "only part of the results was available");
  }
  return parts.join("; ");
}

/** The button text for a wider search offered after an empty result. */
export function suggestionLabel(s: SearchSuggestion, sk: boolean): string {
  const label = {
    court: sk ? "Všetky súdy a zdroje" : "All courts and sources",
    lawArea: sk ? "Bez oblasti práva" : "Without the legal area",
    dates: sk ? "Bez obmedzenia dátumu" : "Without the date limit",
    regionForm: sk ? "Bez kraja a formy" : "Without region and form",
    withoutWords: sk ? `Len § ${s.filters.paragraph}, bez slov` : `Only § ${s.filters.paragraph}, without words`,
    withoutSection: sk ? "Len slová, bez §" : "Only the words, without §",
    suggestedSection: `§ ${s.section?.section ?? s.filters.paragraph} — ${s.section?.heading ?? ""}`,
  }[s.reason];
  return `${label} (${s.total.toLocaleString(sk ? "sk" : "en")})`;
}
