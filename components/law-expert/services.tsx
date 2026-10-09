"use client";
import { createContext, useContext } from "react";
import { searchDecisions, requestMemo, fetchSections, sendFeedback, type FeedbackEvent } from "@/lib/law-expert/api";
import { getIdToken } from "@/lib/law-expert/token";
import { researchStore } from "@/lib/law-expert/store";
import type { Locale, SearchFilters } from "@/lib/law-expert/types";

export const researchServices = {
  store: researchStore,
  search: (filters: SearchFilters) => searchDecisions(filters, getIdToken),
  research: (facts: string, locale: Locale, filters: SearchFilters, includeMemo: boolean) => requestMemo(facts, locale, getIdToken, filters, includeMemo),
  sections: () => fetchSections(getIdToken),
  /** Fire and forget: a lost reaction must never disturb the page. */
  feedback: (event: FeedbackEvent) => { void sendFeedback(event, getIdToken).catch(() => undefined); },
};
/** The same UI is exercised with bounded fake services in browser tests; production uses Firebase/API. */
export const ResearchServices = createContext(researchServices);
export const useResearchServices = () => useContext(ResearchServices);
