import type { FacetValue, MemoBlock, MemoResponse } from "./types";

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
    notes: [...qualification, "", "Judikatúra:", ...sources].join("\n"),
  };
}

/** `<input type="date">` gives yyyy-mm-dd; InfoSúd wants dd.MM.yyyy. Anything else: no filter. */
export function isoToInfoSudDate(iso: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : undefined;
}

const PDF_URL = /^https:\/\/obcan\.justice\.sk\/content\/public\/item\/[0-9a-f-]{36}$/i;

/** The server already restricts PDF links; the page checks again before rendering an href. */
export function safePdfUrl(url: string | null | undefined): string | null {
  return url && PDF_URL.test(url) ? url : null;
}
