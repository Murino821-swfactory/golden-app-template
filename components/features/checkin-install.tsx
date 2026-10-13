"use client";

import { useSyncExternalStore } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COPY, type CheckinLocale } from "@/lib/checkin-copy";

/**
 * "Add to home screen" — the web app's answer to an app-store install, and the
 * precondition for web push on iOS (16.4+: only an installed web app can be notified).
 * Chrome hands us a real install prompt (`beforeinstallprompt`); everywhere else the hint
 * tells the visitor the two taps. Shown after the first check-in, never inside an installed
 * app, and not again once dismissed.
 *
 * Everything the hint depends on lives outside React (display mode, localStorage, the
 * browser's install event), so it is read through `useSyncExternalStore` — no state, no
 * effect. The install event is captured at module load: Chrome fires it once, early, and a
 * listener attached on mount could miss it.
 */

const DISMISS_KEY = "unbroken:install-hint:dismissed";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

let captured: InstallPromptEvent | null = null;
let dismissedThisVisit = false;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    captured = e as InstallPromptEvent;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function standalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function dismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const getHidden = () => dismissedThisVisit || standalone() || dismissed();
const getIos = () => isIos();
const getPrompt = () => captured;
const serverHidden = () => true;
const serverIos = () => false;
const serverPrompt = () => null;

function dismiss() {
  dismissedThisVisit = true;
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Then it shows again next visit; that is fine.
  }
  notify();
}

export function InstallHint({ locale, visible }: { locale: CheckinLocale; visible: boolean }) {
  const c = COPY[locale];
  const hidden = useSyncExternalStore(subscribe, getHidden, serverHidden);
  const ios = useSyncExternalStore(subscribe, getIos, serverIos);
  const prompt = useSyncExternalStore(subscribe, getPrompt, serverPrompt);

  if (!visible || hidden) return null;

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    dismiss();
  };

  return (
    <section data-testid="install-hint" className="flex gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <Smartphone aria-hidden className="mt-0.5 size-6 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h2 className="text-base font-semibold">{c.installTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{prompt ? c.installBody : ios ? c.installIos : c.installAndroid}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {prompt && (
            <Button type="button" size="lg" onClick={install}>
              {c.installButton}
            </Button>
          )}
          <Button type="button" variant="ghost" size="lg" onClick={dismiss}>
            {c.dismiss}
          </Button>
        </div>
      </div>
    </section>
  );
}
