"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getAuthInstance, ensureAuthPersistence } from "@/lib/firebase";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** False when Firebase could not be initialised in this environment (no
   * `NEXT_PUBLIC_FIREBASE_*`). The app still renders; sign-in is what stops working. */
  authAvailable: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    createdAt: firebaseUser.metadata.creationTime
      ? new Date(firebaseUser.metadata.creationTime)
      : null,
  };
}

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authAvailable, setAuthAvailable] = useState(true);

  useEffect(() => {
    let auth: ReturnType<typeof getAuthInstance>;
    try {
      auth = getAuthInstance();
    } catch (err) {
      // Firebase is not configured here (CI, local dev without .env.local). Degrade to
      // "signed out, sign-in unavailable" instead of taking the page down: this throw is
      // synchronous inside an effect, so React unmounts the whole tree and the visitor
      // gets a blank screen — measured on the static export, where a /login with the
      // button present in the HTML rendered zero buttons after hydration.
      //
      // This is runtime resilience, NOT a relaxed gate. Missing `NEXT_PUBLIC_FIREBASE_*`
      // in the pipeline must still be a hard BUILD failure (P10) — a demo whose login is
      // dead is not a demo.
      console.error("[auth] Firebase unavailable — sign-in disabled:", err);
      setAuthAvailable(false);
      setLoading(false);
      return;
    }

    // Check for redirect result (in-app browser fallback)
    getRedirectResult(auth).catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapFirebaseUser(firebaseUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!authAvailable) {
      throw new Error("Sign-in is unavailable: Firebase is not configured.");
    }
    await ensureAuthPersistence();
    const auth = getAuthInstance();

    try {
      // Try popup first
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // Fallback to redirect for in-app browsers
      if (
        err instanceof Error &&
        (err.message.includes("popup") ||
          err.message.includes("blocked") ||
          err.message.includes("cross-origin"))
      ) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw err;
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(getAuthInstance());
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, authAvailable, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
