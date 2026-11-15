import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function getApp(): FirebaseApp {
  if (app) return app;
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return app;
}

export function getAuthInstance(): Auth {
  if (auth) return auth;
  auth = getAuth(getApp());
  return auth;
}

export function getFirestoreInstance(): Firestore {
  if (db) return db;
  db = getFirestore(getApp());
  return db;
}

/**
 * MUST pattern (sw-factory docs/factory/GOOGLE_SIGN_IN.md): settle persistence before any
 * auth operation, so a browser that blocks indexedDB/localStorage (some in-app browsers,
 * private modes) keeps the session for this tab instead of failing silently. Runs once;
 * the login page settles it before the tap (`prepareSignIn`), so the tap need not wait.
 */
let persistencePromise: Promise<void> | null = null;
let persistenceReady = false;
export function ensureAuthPersistence(): Promise<void> {
  if (!persistencePromise) {
    persistencePromise = (async () => {
      const auth = getAuthInstance();
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {
        try {
          await setPersistence(auth, browserSessionPersistence);
        } catch (err) {
          console.warn("[auth] no persistent storage; the session lasts this page only:", err);
        }
      }
      persistenceReady = true;
    })();
  }
  return persistencePromise;
}

/** True once `ensureAuthPersistence()` has settled — the sign-in tap then awaits nothing. */
export function isAuthPersistenceReady(): boolean {
  return persistenceReady;
}

import { getDemoSlug } from "./demo-slug";

// Re-export for existing consumers — new code should import from lib/demo-slug directly.
export { getDemoSlug };

export function getCollectionPath(collection: string): string {
  const slug = getDemoSlug();
  return slug ? `demos/${slug}/${collection}` : collection;
}

/** Shared Google Auth provider instance. */
export const googleProvider = new GoogleAuthProvider();
