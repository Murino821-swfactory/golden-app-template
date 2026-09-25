import { getAuthInstance } from "@/lib/firebase";

/**
 * The signed-in visitor's Firebase ID token, for `Authorization: Bearer`. Apart from
 * `api.ts` so the pure request code stays importable without Firebase (unit tests).
 * `null` when nobody is signed in — the API client turns that into the "auth" error.
 */
export async function getIdToken(): Promise<string | null> {
  const user = getAuthInstance().currentUser;
  return user ? user.getIdToken() : null;
}
