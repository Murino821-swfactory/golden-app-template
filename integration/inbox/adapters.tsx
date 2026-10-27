// Synthetic owner gate only. The page, hook, parsing, SDK, styles and rules stay real.
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { initializeApp } from "firebase/app";
import { FirebaseError } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, updateDoc as persist, type DocumentReference, type UpdateData, type DocumentData } from "firebase/firestore";
import full from "../../fixtures/full.config.json";
export * from "firebase/firestore";

export const config = { ...full, locales: ["en", "sk", "de"], content: { ...full.content, de: full.content.en } };
export function AuthGuard({ children }: { children: ReactNode }) { return children; }
export function useOwnerRole() { return { available: true, resolved: true, status: { role: "owner" as const } }; }

const db = getFirestore(initializeApp({ projectId: "rules-test" }));
connectFirestoreEmulator(db, "127.0.0.1", 8787, {
  mockUserToken: { sub: "inbox-owner", email: "owner@example.test", email_verified: true },
});
export function getFirestoreInstance() { return db; }

declare global {
  interface Window {
    inboxTest: { unavailable: boolean; hold: boolean; calls: number; release?: () => void };
  }
}
window.inboxTest = { unavailable: false, hold: false, calls: 0 };
export async function updateDoc(ref: DocumentReference, data: UpdateData<DocumentData>) {
  window.inboxTest.calls++;
  if (window.inboxTest.hold) await new Promise<void>((resolve) => { window.inboxTest.release = resolve; });
  if (window.inboxTest.unavailable) throw new FirebaseError("unavailable", "Injected unavailable write");
  return persist(ref, data);
}

// Next router is outside this isolated client fixture; the back link stays a native link.
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) { return <a {...props} />; }
