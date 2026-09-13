"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { User as FirebaseUser, AuthError } from "firebase/auth";
import { isInAppBrowser, escapeInAppBrowser } from "@/lib/auth-browser";
import type { User } from "@/types";

/**
 * Error codes that trigger redirect fallback instead of failing.
 * These happen when popup is blocked, closed, or not supported.
 */
const REDIRECT_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
]);

interface AuthContextType {
  user: User | null;
  loading: boolean;
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

/**
 * Synchronous probe for an existing Firebase Auth session.
 * Firebase Auth writes `firebase:authUser:<apiKey>:<authDomain>` to localStorage.
 */
function hasExistingFirebaseSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("firebase:authUser:")) {
        const value = localStorage.getItem(key);
        if (value && value !== "null" && value.length > 4) return true;
      }
    }
  } catch {
    // localStorage might be blocked (private mode etc.)
  }
  return false;
}

/**
 * Check if current page load is a redirect return from OAuth provider.
 */
function isPendingRedirect(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (
        key &&
        (key.includes("firebase:pendingRedirect") ||
          key.includes("firebase:redirectUser"))
      ) {
        return true;
      }
    }
    const url = new URL(window.location.href);
    if (url.searchParams.has("mode") || url.hash.includes("state=")) {
      return true;
    }
  } catch {
    // sessionStorage might be blocked
  }
  return false;
}

// Lazy-loaded Firebase modules (cached after first load).
type FirebaseModule = typeof import("@/lib/firebase");
type FirebaseAuthModule = typeof import("firebase/auth");

let firebaseModulePromise: Promise<FirebaseModule> | null = null;
let firebaseAuthPromise: Promise<FirebaseAuthModule> | null = null;

function loadFirebase(): Promise<FirebaseModule> {
  if (!firebaseModulePromise) {
    firebaseModulePromise = import("@/lib/firebase");
  }
  return firebaseModulePromise;
}

function loadFirebaseAuth(): Promise<FirebaseAuthModule> {
  if (!firebaseAuthPromise) {
    firebaseAuthPromise = import("firebase/auth");
  }
  return firebaseAuthPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authAvailable, setAuthAvailable] = useState(true);
  const isSigningIn = useRef(false);
  const initStarted = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initStarted.current) return;
    initStarted.current = true;

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const init = async () => {
      // Whether Firebase Auth is needed at all is a question only localStorage can
      // answer, so it is asked here rather than in the effect body: `init` owns every
      // state transition in this bootstrap — anonymous exit, redirect result, auth
      // subscription and failure — instead of one of the four sitting apart from the
      // rest as a synchronous setState (react-hooks/set-state-in-effect).
      //
      // 1. an existing session in localStorage, or
      // 2. a return trip from the OAuth provider.
      // Neither: skip Firebase Auth entirely, ~250 KB of JS the visitor never downloads.
      const isRedirectReturn = isPendingRedirect();
      if (!hasExistingFirebaseSession() && !isRedirectReturn) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const [firebaseMod, authSdk] = await Promise.all([
          loadFirebase(),
          loadFirebaseAuth(),
        ]);

        if (cancelled) return;

        const { getAuthInstance, ensureAuthPersistence } = firebaseMod;
        const { onAuthStateChanged, getRedirectResult } = authSdk;

        const auth = getAuthInstance();
        await ensureAuthPersistence();

        // Complete redirect-based sign-in flow if returning from OAuth
        if (isRedirectReturn) {
          try {
            const result = await getRedirectResult(auth);
            if (result?.user) {
              setUser(mapFirebaseUser(result.user));
            }
          } catch (error) {
            const authError = error as AuthError;
            if (authError?.code !== "auth/popup-closed-by-user") {
              console.error(
                "getRedirectResult error:",
                authError?.code,
                authError?.message
              );
            }
          }
        }

        if (cancelled) return;

        // Subscribe to auth state changes
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          setUser(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
          setLoading(false);
        });
      } catch (err) {
        console.error("[auth] Firebase unavailable:", err);
        if (!cancelled) {
          setAuthAvailable(false);
          setLoading(false);
        }
      }
    };

    // Safety net: if Firebase init never resolves, stop loading after 5s
    const loadingTimeout = setTimeout(() => {
      if (!cancelled && loading) {
        console.warn("Firebase Auth init timeout — forcing loading=false");
        setLoading(false);
      }
    }, 5000);

    init();

    return () => {
      cancelled = true;
      clearTimeout(loadingTimeout);
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    if (!authAvailable) {
      throw new Error("Sign-in is unavailable: Firebase is not configured.");
    }
    if (isSigningIn.current) return;
    isSigningIn.current = true;

    try {
      const [firebaseMod, authSdk] = await Promise.all([
        loadFirebase(),
        loadFirebaseAuth(),
      ]);
      const { getAuthInstance, ensureAuthPersistence, googleProvider } =
        firebaseMod;
      const { signInWithPopup, signInWithRedirect } = authSdk;

      const auth = getAuthInstance();
      await ensureAuthPersistence();

      // Check for in-app browser — these don't support popup auth
      if (isInAppBrowser()) {
        const escaped = escapeInAppBrowser();
        if (escaped) {
          isSigningIn.current = false;
          return;
        }
        // If escape failed, try redirect flow
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      // Try popup first, fall back to redirect on specific errors
      try {
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
          setUser(mapFirebaseUser(result.user));
        }
      } catch (error) {
        const authError = error as AuthError;

        // User closed popup — not an error, just cancelled
        if (authError?.code === "auth/popup-closed-by-user") {
          return;
        }

        // Fallback to redirect for popup-related errors
        if (authError?.code && REDIRECT_FALLBACK_CODES.has(authError.code)) {
          try {
            await signInWithRedirect(auth, googleProvider);
            return;
          } catch (redirectError) {
            console.error("signInWithRedirect failed:", redirectError);
            throw redirectError;
          }
        }

        console.error(
          "signInWithPopup error:",
          authError?.code,
          authError?.message
        );
        throw error;
      }
    } finally {
      isSigningIn.current = false;
    }
  };

  const signOut = async () => {
    const [firebaseMod, authSdk] = await Promise.all([
      loadFirebase(),
      loadFirebaseAuth(),
    ]);
    const { getAuthInstance } = firebaseMod;
    const { signOut: firebaseSignOut } = authSdk;
    await firebaseSignOut(getAuthInstance());
    setUser(null);
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
