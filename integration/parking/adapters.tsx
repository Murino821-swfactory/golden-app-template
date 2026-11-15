import { createContext, useContext, type AnchorHTMLAttributes, type ReactNode } from "react";
import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

/**
 * What the parking fixture replaces: Google sign-in (one stable synthetic visitor with an
 * emulator token), Firestore (the emulator, real factory-web rules), Next's router and link,
 * and the base map's style — an empty one, so no request leaves loopback. Everything else in
 * the bundle is the real dashboard of this prototype with its real config.
 */
const user = { uid: "parking-visitor", email: "visitor@example.test", displayName: "Synthetic visitor", photoURL: null, createdAt: null };
const auth = { user, loading: false, authAvailable: true, signInWithGoogle: async () => {}, signOut: async () => {}, getIdToken: async () => null };
const AuthContext = createContext(auth);
export function AuthProvider({ children }: { children: ReactNode }) { return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>; }
export function useAuthContext() { return useContext(AuthContext); }

const db = getFirestore(initializeApp({ projectId: "rules-test" }));
connectFirestoreEmulator(db, "127.0.0.1", 8790, { mockUserToken: { sub: user.uid, email: user.email, email_verified: true } });
export function getFirestoreInstance() { return db; }

export function usePathname() { return location.pathname; }
export function useRouter() { return { push: (href: string) => location.assign(href) }; }
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) { return <a {...props} />; }

export const PARKING_MAP_STYLE = { version: 8 as const, sources: {}, layers: [] as [] };
