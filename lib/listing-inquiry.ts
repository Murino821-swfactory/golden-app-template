/**
 * listing-inquiry.ts — which offer the visitor is asking about.
 *
 * The listings section and the contact section are separate chapters of the landing page,
 * so the choice travels through this tiny store rather than through props. It lives only
 * in memory: a reload forgets it, and the form then sends a plain message.
 */
import { useSyncExternalStore } from "react";

export interface InquiryTarget {
  id: string;
  title: string;
}

let current: InquiryTarget | null = null;
const listeners = new Set<() => void>();

export function selectInquiry(target: InquiryTarget | null): void {
  current = target;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = () => current;
const serverSnapshot = () => null;

export function useInquiryTarget(): InquiryTarget | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
