/**
 * checkin-cloud.ts — the ONE place the check-in log touches Firestore.
 *
 * A signed-in visitor's log is one document in their private sandbox,
 * `demos/{slug}/users/{uid}/state/checkins` = `{ value: <encodeLog()>, updatedAt }`
 * (factory-web rules: the `state` slots, ≤ 200 000 characters each). The public check-in
 * page never loads Firestore for an anonymous visitor: the SDK is imported here, lazily,
 * only once there is a user to sync.
 *
 * "permission-denied" is a state, not an error: the rule may not be deployed for this
 * prototype yet, or the slug is unknown. The hook then keeps the device copy and says so.
 */
import type { CloudCopy } from "./checkin-engine";
import { decodeLog, encodeLog, type CheckinLog } from "./checkin-engine";
import { getDemoSlug } from "./demo-slug";

export const CLOUD_SLOT = "checkins";

export function cloudPath(uid: string, slug = getDemoSlug()): string {
  return slug ? `demos/${slug}/users/${uid}/state/${CLOUD_SLOT}` : `users/${uid}/state/${CLOUD_SLOT}`;
}

export class CloudDenied extends Error {
  constructor() {
    super("cloud sync denied");
  }
}

function isDenied(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "permission-denied";
}

async function firestore() {
  const [{ getFirestoreInstance }, sdk] = await Promise.all([import("./firebase"), import("firebase/firestore")]);
  return { db: getFirestoreInstance(), sdk };
}

export async function pullCloud(uid: string): Promise<CloudCopy | null> {
  try {
    const { db, sdk } = await firestore();
    const snap = await sdk.getDoc(sdk.doc(db, cloudPath(uid)));
    if (!snap.exists()) return null;
    const data = snap.data() as { value?: unknown; updatedAt?: { toMillis(): number } };
    return {
      log: decodeLog(typeof data.value === "string" ? data.value : null),
      stamp: data.updatedAt?.toMillis?.() ?? 0,
    };
  } catch (err) {
    if (isDenied(err)) throw new CloudDenied();
    throw err;
  }
}

/** Writes the log and returns the cloud's new stamp. */
export async function pushCloud(uid: string, log: CheckinLog): Promise<number> {
  try {
    const { db, sdk } = await firestore();
    const ref = sdk.doc(db, cloudPath(uid));
    await sdk.setDoc(ref, { value: encodeLog(log), updatedAt: sdk.serverTimestamp() });
    const snap = await sdk.getDoc(ref);
    const data = snap.data() as { updatedAt?: { toMillis(): number } } | undefined;
    return data?.updatedAt?.toMillis?.() ?? Date.now();
  } catch (err) {
    if (isDenied(err)) throw new CloudDenied();
    throw err;
  }
}
