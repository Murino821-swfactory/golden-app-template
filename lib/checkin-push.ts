import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuthInstance } from "./firebase";
import type { CheckinLocale } from "./checkin-copy";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const KEY = "unbroken:push-token";
export type PushStatus = { enabled: boolean; time?: string; timeZone?: string };
export type PushAvailability = "ready" | "install" | "unsupported" | "denied";

export async function pushAvailability(): Promise<PushAvailability> {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (ios && !standalone) return "install";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !(await isSupported().catch(() => false))) return "unsupported";
  return Notification.permission === "denied" ? "denied" : "ready";
}
function storedToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
async function call(data: Record<string, unknown>): Promise<PushStatus> {
  const functions = getFunctions(getAuthInstance().app, "us-central1");
  return (await httpsCallable<Record<string, unknown>, PushStatus>(functions, "unbrokenReminder")(data)).data;
}
export async function pushStatus(): Promise<PushStatus> {
  const token = storedToken();
  return token ? call({ action: "status", token }) : { enabled: false };
}
export async function enablePush(time: string, locale: CheckinLocale): Promise<PushStatus> {
  // Must be the first awaited operation inside the tap handler (iOS user activation).
  if (await Notification.requestPermission() !== "granted") throw new Error("permission");
  const registration = await navigator.serviceWorker.register(`${BASE}/unbroken-push-sw.js`, { scope: `${BASE}/` });
  if (!registration.active) await new Promise<void>((resolve, reject) => {
    const worker = registration.installing || registration.waiting;
    if (!worker) { reject(new Error("worker")); return; }
    const timeout = setTimeout(() => reject(new Error("worker timeout")), 15_000);
    const check = () => {
      if (worker.state === "activated") { clearTimeout(timeout); resolve(); }
      if (worker.state === "redundant") { clearTimeout(timeout); reject(new Error("worker")); }
    };
    worker.addEventListener("statechange", check);
    check();
  });
  const token = await getToken(getMessaging(getAuthInstance().app), {
    serviceWorkerRegistration: registration,
    ...(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ? { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY } : {}),
  });
  const previous = storedToken();
  const status = await call({ action: "register", token, time, locale,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  // Retain the token for disabling even if notification permission is revoked later.
  try { localStorage.setItem(KEY, token); } catch { /* IndexedDB still holds FCM's token. */ }
  if (previous && previous !== token) await call({ action: "unregister", token: previous }).catch(() => {});
  return status;
}
export async function disablePush(): Promise<PushStatus> {
  const token = storedToken();
  if (!token) throw new Error("missing device token");
  return call({ action: "unregister", token });
}
