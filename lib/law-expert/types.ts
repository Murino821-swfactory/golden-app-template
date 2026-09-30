/**
 * The HTTP contract of `lawExpertApi`. A COPY of this file lives in the prototype
 * (golden-app-template, branch `demo/law-expert`, `lib/law-expert/types.ts`) — the two
 * repos share no package, so change both or the page breaks silently. Kept deliberately
 * small; the server validates its input with zod and the client tolerates unknown fields.
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
  provider?: "infosud" | "nsud";
  ecli?: string | null;
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
  /** Sum of source counts before cross-source deduplication. */
  total: number;
  hasMore?: boolean;
  coverage?: SourceCoverage[];
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

export type MemoUnavailable = "no-decisions" | "unreadable" | "model-failed" | "refused";

export interface SearchFilters {
  q?: string;
  /** Exact indexed reference to Act 300/2005; optional, never inferred. */
  paragraph?: string;
  courtType?: string;
  region?: string;
  form?: string;
  lawArea?: string;
  fileNumber?: string;
  ecli?: string;
  from?: string;
  to?: string;
  page?: number;
  sort?: "date" | "relevance";
  source?: "all" | "infosud" | "nsud";
  /** Internal source page size; not accepted from HTTP clients. */
  size?: number;
}

export interface SourceCoverage {
  provider: "infosud" | "nsud";
  status: "ok" | "failed" | "unsupported" | "excluded";
  total?: number;
  /** A bounded source window or missing details; not exhaustive results. */
  limited?: boolean;
}

export interface Comparison {
  source: number;
  relevance: "high" | "medium" | "low";
  similarity: string;
  differences: string;
  /** Verbatim passage, checked against the text actually read. */
  quote: string;
}

export interface ResearchInput {
  facts: string;
  locale: Locale;
  filters?: SearchFilters;
  includeMemo?: boolean;
}

export interface MemoResponse {
  qualification: Qualification[];
  queries?: string[];
  coverage?: SourceCoverage[];
  comparisons?: Comparison[];
  comparisonStatus?: "ok" | "failed" | "unverified";
  searchedAt?: string;
  unreadableCount?: number;
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
