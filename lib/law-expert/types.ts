/**
 * The HTTP contract of `/api/law-expert/*`. A COPY of factory-web
 * `functions/src/law-expert/types.ts`, which is the server that answers it — the two repos
 * share no package, so change both or this page breaks silently.
 *
 * Spec: sw-factory `docs/superpowers/specs/2026-09-24-law-expert-research-design.md` §5.3.
 */

/** A run of snippet text; `hit` marks the words InfoSúd highlighted. Never HTML. */
export interface Segment {
  text: string;
  hit: boolean;
}

export interface FacetValue {
  value: string;
  count: number;
}

export type FacetName = "courtType" | "region" | "form" | "nature" | "subarea";
export type Facets = Record<FacetName, FacetValue[]>;

export interface DecisionHit {
  /** InfoSúd guid, `<record uuid>:<document uuid>`. */
  id: string;
  court: string;
  judge?: string;
  fileNumber: string;
  /** dd.MM.yyyy, as InfoSúd writes it. */
  date: string;
  form: string;
  nature: string[];
  snippet: Segment[];
  pdfUrl: string | null;
}

export interface SearchResponse {
  total: number;
  /** 0-based. */
  page: number;
  items: DecisionHit[];
  facets: Facets;
  source: { name: string; updated: string };
}

export type Locale = "en" | "sk";

export const CRIME_TYPES = ["Majetkový", "Násilný", "Hospodársky", "Korupčný", "Iný"] as const;
export type CrimeType = (typeof CRIME_TYPES)[number];

export interface Qualification {
  section: string;
  reason: string;
  slovLexUrl: string;
}

export interface Citation {
  /** Index into `MemoResponse.sources`. */
  source: number;
  quote: string;
}

export interface MemoBlock {
  heading?: string;
  text: string;
  /** Empty = the model wrote this without support in the sources; the UI marks it. */
  citations: Citation[];
}

export interface SourceDoc extends DecisionHit {
  ecli: string | null;
  /** The decision text was cut to fit the context budget — the UI says so. */
  truncated: boolean;
}

export type MemoUnavailable = "no-decisions" | "model-failed" | "refused";

export interface MemoResponse {
  qualification: Qualification[];
  crimeType: CrimeType;
  memo: { blocks: MemoBlock[] } | null;
  memoUnavailable?: MemoUnavailable;
  sources: SourceDoc[];
  facets: Facets;
  model: string;
  costUsd: number;
  timingsMs: Record<string, number>;
}

export type ApiError =
  | { error: "auth" }
  | { error: "invalid"; field: string }
  | { error: "quota"; reason: "user-daily" | "global-daily" | "rate" }
  | { error: "source" }
  | { error: "internal" };
