import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
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
 * MUST pattern: call before any auth operation to prevent silent failures
 * in in-app browsers that block indexedDB.
 */
let persistenceSet = false;
export async function ensureAuthPersistence(): Promise<void> {
  if (persistenceSet) return;
  try {
    await setPersistence(getAuthInstance(), browserLocalPersistence);
    persistenceSet = true;
  } catch (err) {
    console.warn("[auth] setPersistence failed (expected in some browsers):", err);
    persistenceSet = true;
  }
}

/**
 * Demo-tenant mode: when NEXT_PUBLIC_DEMO_SLUG is set, all Firestore paths
 * are namespaced under demos/{slug}/...
 */
export function getDemoSlug(): string | null {
  return process.env.NEXT_PUBLIC_DEMO_SLUG || null;
}

export function getCollectionPath(collection: string): string {
  const slug = getDemoSlug();
  return slug ? `demos/${slug}/${collection}` : collection;
}
