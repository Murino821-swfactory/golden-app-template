"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { User as FirebaseUser, AuthError } from "firebase/auth";
import { isInAppBrowser, escapeInAppBrowser } from "@/lib/auth-browser";
import { isSameSiteAuthDomain, popupFailureAction, type SignInOutcome } from "@/lib/sign-in-policy";
import type { User } from "@/types";

export type { SignInOutcome } from "@/lib/sign-in-policy";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authAvailable: boolean;
  /**
   * Load Firebase Auth now, ahead of the tap. A browser opens the Google window only inside
   * the tap that asked for it, and on phones and in Safari the SDK prepares its sign-in
   * iframe when Auth starts — so a page that offers sign-in calls this when it mounts.
   * Resolves false when Firebase is unavailable (not configured). Idempotent.
   */
  prepareSignIn: () => Promise<boolean>;
  /** Never throws for a cancel or a blocked window — those are outcomes the page explains. */
  signInWithGoogle: () => Promise<SignInOutcome>;
  signOut: () => Promise<void>;
  /**
   * The signed-in user's Firebase ID token, for a server that checks who is asking
   * (the hero-image controls). `null` when nobody is signed in. Never loads Firebase for
   * an anonymous visitor: without `user` it returns before importing anything.
   */
  getIdToken: () => Promise<string | null>;
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

// Lazy-loaded Firebase modules (cached after first load). `loaded` holds them once resolved,
// so the sign-in tap can reach `signInWithPopup` without awaiting anything.
type FirebaseModule = typeof import("@/lib/firebase");
type FirebaseAuthModule = typeof import("firebase/auth");
interface LoadedModules {
  firebase: FirebaseModule;
  sdk: FirebaseAuthModule;
}

let modulesPromise: Promise<LoadedModules> | null = null;
let loaded: LoadedModules | null = null;

function loadModules(): Promise<LoadedModules> {
  if (!modulesPromise) {
    modulesPromise = Promise.all([import("@/lib/firebase"), import("firebase/auth")]).then(
      ([firebase, sdk]) => (loaded = { firebase, sdk })
    );
    // A failed chunk download must not poison every later attempt.
    modulesPromise.catch(() => {
      modulesPromise = null;
    });
  }
  return modulesPromise;
}

const loadFirebase = () => loadModules().then((m) => m.firebase);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authAvailable, setAuthAvailable] = useState(true);
  const isSigningIn = useRef(false);
  const initStarted = useRef(false);
  const preparePromise = useRef<Promise<boolean> | null>(null);

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
      // (The login page is the exception: it loads Auth ahead of the tap, `prepareSignIn`.)
      const isRedirectReturn = isPendingRedirect();
      if (!hasExistingFirebaseSession() && !isRedirectReturn) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const { firebase, sdk } = await loadModules();

        if (cancelled) return;

        const auth = firebase.getAuthInstance();
        await firebase.ensureAuthPersistence();

        // Complete redirect-based sign-in flow if returning from OAuth
        if (isRedirectReturn) {
          try {
            const result = await sdk.getRedirectResult(auth);
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
        unsubscribe = sdk.onAuthStateChanged(auth, (firebaseUser) => {
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

    // Safety net: if Firebase init never resolves, stop loading after 5s. The updater reads
    // the CURRENT value — the closure's `loading` is the first render's, always true.
    const loadingTimeout = setTimeout(() => {
      if (cancelled) return;
      setLoading((stillLoading) => {
        if (stillLoading) console.warn("Firebase Auth init timeout — forcing loading=false");
        return false;
      });
    }, 5000);

    init();

    return () => {
      cancelled = true;
      clearTimeout(loadingTimeout);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const prepareSignIn = useCallback((): Promise<boolean> => {
    if (!preparePromise.current) {
      preparePromise.current = (async () => {
        try {
          const { firebase } = await loadModules();
          // getAuth() is what starts the SDK; on phones and in Safari it also prepares the
          // popup's iframe right away, instead of inside the tap.
          firebase.getAuthInstance();
          await firebase.ensureAuthPersistence();
          return true;
        } catch (err) {
          console.error("[auth] Firebase unavailable:", err);
          setAuthAvailable(false);
          preparePromise.current = null;
          return false;
        }
      })();
    }
    return preparePromise.current;
  }, []);

  const signInWithGoogle = async (): Promise<SignInOutcome> => {
    if (isSigningIn.current) return "cancelled";

    // Google refuses to sign anyone in inside a social app's built-in browser; the way on is
    // the phone's real browser. Decided first: it needs no SDK and works unconfigured.
    if (isInAppBrowser() && escapeInAppBrowser()) return "escaping";

    if (!authAvailable) {
      throw new Error("Sign-in is unavailable: Firebase is not configured.");
    }
    isSigningIn.current = true;

    try {
      // Fast path: the page loaded Firebase before this tap (prepareSignIn), so nothing is
      // awaited before the popup opens. Awaiting a ~700 kB download here is what got the
      // popup blocked on slow phones.
      const { firebase, sdk } = loaded ?? (await loadModules());
      const auth = firebase.getAuthInstance();
      if (!firebase.isAuthPersistenceReady()) await firebase.ensureAuthPersistence();
      const redirectWorks = isSameSiteAuthDomain(auth.config.authDomain, window.location.hostname);

      try {
        const result = await sdk.signInWithPopup(auth, firebase.googleProvider);
        setUser(mapFirebaseUser(result.user));
        return "signed-in";
      } catch (error) {
        const authError = error as AuthError;
        switch (popupFailureAction(authError?.code, redirectWorks)) {
          case "ignore":
            return "cancelled";
          case "retry":
            return "popup-blocked";
          case "redirect":
            await sdk.signInWithRedirect(auth, firebase.googleProvider);
            return "redirecting";
          default:
            console.error("signInWithPopup error:", authError?.code, authError?.message);
            throw error;
        }
      }
    } finally {
      isSigningIn.current = false;
    }
  };

  const signOut = async () => {
    const { firebase, sdk } = await loadModules();
    await sdk.signOut(firebase.getAuthInstance());
    setUser(null);
  };

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    const { getAuthInstance } = await loadFirebase();
    const current = getAuthInstance().currentUser;
    return current ? current.getIdToken() : null;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, loading, authAvailable, prepareSignIn, signInWithGoogle, signOut, getIdToken }}
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
