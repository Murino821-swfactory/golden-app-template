import { createContext, useContext, type AnchorHTMLAttributes, type ReactNode } from "react";
import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, getDocs as readDocuments, type Query, type DocumentData } from "firebase/firestore";
import full from "../../fixtures/full.config.json";
import { parsePrototypeConfig } from "../../lib/prototype-config";
export { contentFor, entityFieldsFor } from "../../lib/prototype-config";
export * from "firebase/firestore";

export const config = parsePrototypeConfig({ ...full, locales: ["en", "sk", "de"], content: { ...full.content, de: full.content.en } });
const user = { uid: "record-keyboard-user", email: "keyboard@example.test", displayName: "Synthetic visitor", photoURL: null, createdAt: null };
const auth = { user, loading: false, authAvailable: true, signInWithGoogle: async () => {}, signOut: async () => {}, getIdToken: async () => null };
const AuthContext = createContext(auth);
export function AuthProvider({ children }: { children: ReactNode }) { return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>; }
export function useAuthContext() { return useContext(AuthContext); }

const db = getFirestore(initializeApp({ projectId: "rules-test" }));
connectFirestoreEmulator(db, "127.0.0.1", 8788, { mockUserToken: { sub: user.uid, email: user.email, email_verified: true } });
export function getFirestoreInstance() { return db; }
declare global {
  interface Window { recordFocusTest: { holdReads: boolean; releaseReads: (() => void)[] } }
}
window.recordFocusTest = { holdReads: false, releaseReads: [] };
export async function getDocs(query: Query<DocumentData>) {
  if (window.recordFocusTest.holdReads) await new Promise<void>(resolve => window.recordFocusTest.releaseReads.push(resolve));
  return readDocuments(query);
}
export function usePathname() { return location.pathname; }
export function useRouter() { return { push: (href: string) => location.assign(href) }; }
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) { return <a {...props} />; }
// The unrelated map is the only dashboard block replaced: no third-party tile traffic.
export function MapBase() { return <section data-pattern="map-base" />; }
