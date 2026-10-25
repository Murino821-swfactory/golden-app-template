import { createContext, useContext, type AnchorHTMLAttributes, type ReactNode } from "react";
import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

/** The fixture's stand-ins: a synthetic signed-in visitor and the two local emulators. */
export const UID = "content-source-user";
const user = { uid: UID, email: "visitor@example.test", displayName: "Synthetic visitor", photoURL: null, createdAt: null };
const auth = { user, loading: false, authAvailable: true, signInWithGoogle: async () => {}, signOut: async () => {}, getIdToken: async () => null };
const AuthContext = createContext(auth);
export function AuthProvider({ children }: { children: ReactNode }) { return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>; }
export function useAuthContext() { return useContext(AuthContext); }

// The real lib/gitpulse/source-storage.ts calls getStorage(getApp()) — this app, these emulators.
const app = initializeApp({ projectId: "rules-test", apiKey: "synthetic", storageBucket: "rules-test.appspot.com" });
const token = { sub: UID, email: user.email, email_verified: true };
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8789, { mockUserToken: token });
connectStorageEmulator(getStorage(app), "127.0.0.1", 9189, { mockUserToken: token });
export function getFirestoreInstance() { return db; }
export function getAuthInstance(): never { throw new Error("The fixture has no Firebase Auth."); }

export function usePathname() { return location.pathname; }
export function useRouter() { return { push: (href: string) => location.assign(href) }; }
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) { return <a {...props} />; }
// The map is not part of this page's config; no third-party tile traffic either way.
export function MapBase() { return <section data-pattern="map-base" />; }
