import type { Locale, MemoResponse, SearchResponse, SearchFilters } from "./types";

/**
 * The client half of `/api/law-expert/*` (factory-web `lawExpertApi`).
 *
 * The path is RELATIVE TO THE ORIGIN, not to the prototype's base path: Firebase Hosting on
 * apps.tokenwise.sk rewrites `/api/law-expert/**` to the function, next to
 * `/newapp/<slug>/**` for the pages. `fetch` never prefixes a base path, so this is right
 * as written — the same way the contact form reaches `/api/prototype-contact`.
 *
 * Both endpoints require the visitor's Firebase ID token; the server verifies it.
 */

const BASE = "/api/law-expert";

export type SearchParams = SearchFilters;

export type UiError = "auth" | "invalid" | "quota-user" | "quota-global" | "rate" | "source" | "internal" | "network";

export type ApiOutcome<T> = { ok: true; data: T } | { ok: false; error: UiError };

export function searchQueryString(p: SearchParams): string {
  const qs = new URLSearchParams();
  for (const key of ["q", "paragraph", "courtType", "region", "form", "from", "to", "source", "sort", "lawArea", "fileNumber", "ecli"] as const) {
    const v = p[key]?.trim();
    if (v) qs.set(key, v);
  }
  if (p.page && p.page > 0) qs.set("page", String(p.page));
  return qs.toString();
}

export function errorFromResponse(status: number, body: unknown): UiError {
  const b = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  if (status === 401 && b.error === "auth") return "auth";
  if (status === 400 && b.error === "invalid") return "invalid";
  if (status === 429 && b.error === "quota") {
    if (b.reason === "user-daily") return "quota-user";
    if (b.reason === "global-daily") return "quota-global";
    if (b.reason === "rate") return "rate";
  }
  if (status === 502 && b.error === "source") return "source";
  return "internal";
}

async function call<T>(path: string, init: RequestInit, getToken: () => Promise<string | null>): Promise<ApiOutcome<T>> {
  const token = await getToken().catch(() => null);
  if (!token) return { ok: false, error: "auth" };
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...init.headers, authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, error: "network" };
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, error: errorFromResponse(res.status, body) };
  return { ok: true, data: body as T };
}

export function searchDecisions(p: SearchParams, getToken: () => Promise<string | null>) {
  const qs = searchQueryString(p);
  return call<SearchResponse>(`/search${qs ? `?${qs}` : ""}`, { method: "GET" }, getToken);
}

export function requestMemo(facts: string, locale: Locale, getToken: () => Promise<string | null>, filters: SearchFilters = {}, includeMemo = false) {
  return call<MemoResponse>(
    "/memo",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ facts, locale, filters, includeMemo }) },
    getToken
  );
}

/** Criminal Code section headings (Slov-Lex), shown next to the § field. */
export function fetchSections(getToken: () => Promise<string | null>) {
  return call<{ version: string; sections: Record<string, string> }>("/sections", { method: "GET" }, getToken);
}

/** A reaction to a result, logged against the search that showed it (quality measurement). */
export interface FeedbackEvent {
  searchId: string;
  action: "select" | "unselect" | "save" | "pdf";
  resultId?: string;
  rank?: number;
}

export function sendFeedback(event: FeedbackEvent, getToken: () => Promise<string | null>) {
  return call<{ ok: true }>(
    "/feedback",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(event) },
    getToken
  );
}
