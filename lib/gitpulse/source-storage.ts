import { getApp } from "firebase/app";
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage";

/**
 * source-storage.ts — the one place a content item's file meets Firebase Storage.
 *
 * Imported on demand (components/gitpulse/source-field.tsx), so the dashboard carries no
 * Storage SDK until a file is picked or shown. The bucket is the app's default one
 * (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET); factory-web `storage.rules` owns who may write.
 */

const bucket = () => getStorage(getApp());

/** Resumable, so a phone that drops the connection for a moment does not start over. */
export function uploadFile(
  path: string,
  file: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(bucket(), path), file, { contentType });
    const abort = () => task.cancel();
    signal.addEventListener("abort", abort, { once: true });
    task.on(
      "state_changed",
      (snap) => onProgress(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0),
      (err) => {
        signal.removeEventListener("abort", abort);
        reject(err);
      },
      () => {
        signal.removeEventListener("abort", abort);
        resolve();
      }
    );
  });
}

export function fileUrl(path: string): Promise<string> {
  return getDownloadURL(ref(bucket(), path));
}

/** Gone already is fine: a second tab may have freed it. */
export async function deleteFile(path: string): Promise<void> {
  try {
    await deleteObject(ref(bucket(), path));
  } catch (err) {
    if ((err as { code?: string }).code !== "storage/object-not-found") throw err;
  }
}
