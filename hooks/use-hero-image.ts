"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getDemoSlug } from "@/lib/demo-slug";
import {
  POLL_INTERVAL_MS,
  POLL_LIMIT_MS,
  fetchPublicHeroState,
  parseStatus,
  postHeroAction,
  type HeroStatus,
  type PublicHeroState,
} from "@/lib/hero-image";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/**
 * The actions exist only where factory-web routes them: prototypes served under
 * `/newapp/<slug>` on apps.tokenwise.sk. The same template is also published as
 * tokenwise.sk/demo/golden (with a slug, on the portal's origin, where a visitor may be
 * signed in) — there the endpoint does not exist, and a call would be a 404 in the console.
 */
const ACTIONS_AVAILABLE = BASE_PATH.startsWith("/newapp/");

export interface UseHeroImage {
  /** The image to paint behind the hero, if any. */
  src: string | null;
  /** Present only for the prototype's creator or the founder. */
  status: HeroStatus | null;
  timedOut: boolean;
  /** A request is in flight (generate or show/hide). */
  working: boolean;
  generate(): Promise<void>;
  setVisible(visible: boolean): Promise<void>;
}

/**
 * The hero background for everyone, and the controls' state for the two people who have
 * any. An anonymous visitor makes exactly one request — the public JSON — and never loads
 * Firebase Auth for this (`user` exists only when a session already did).
 */
export function useHeroImage(): UseHeroImage {
  const { user, getIdToken } = useAuth();
  const slug = ACTIONS_AVAILABLE ? getDemoSlug() : null;
  const [publicState, setPublicState] = useState<PublicHeroState>({ visible: false });
  const [status, setStatus] = useState<HeroStatus | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [working, setWorking] = useState(false);
  const pollStarted = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicHeroState(BASE_PATH).then((state) => {
      if (!cancelled) setPublicState(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const call = useCallback(
    async (action: Parameters<typeof postHeroAction>[2]) => {
      if (!slug) return null;
      const token = await getIdToken();
      if (!token) return null;
      return postHeroAction(token, slug, action);
    },
    [slug, getIdToken]
  );

  const refreshStatus = useCallback(async (): Promise<HeroStatus | null> => {
    try {
      const res = await call({ action: "status" });
      const next = res && res.status === 200 ? parseStatus(res.body) : null;
      setStatus(next);
      return next;
    } catch (err) {
      // No controls rather than broken ones; the hero keeps the public state.
      console.warn("[hero-image] status unavailable:", err);
      setStatus(null);
      return null;
    }
  }, [call]);

  // Signed-in creator or founder: fetch the uncached state once the session is known.
  useEffect(() => {
    if (!user || !slug) return;
    let cancelled = false;
    void (async () => {
      const next = await refreshStatus();
      if (!cancelled && next?.generation === "pending" && pollStarted.current === null) {
        pollStarted.current = Date.now();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, slug, refreshStatus]);

  // While a generation is pending, re-check every 2.5 s for at most 3 minutes.
  const pending = status?.generation === "pending";
  useEffect(() => {
    if (!pending || timedOut) return;
    const timer = setInterval(() => {
      const started = pollStarted.current ?? Date.now();
      if (Date.now() - started > POLL_LIMIT_MS) {
        setTimedOut(true);
        return;
      }
      void refreshStatus();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pending, timedOut, refreshStatus]);

  const generate = useCallback(async () => {
    setWorking(true);
    try {
      const res = await call({ action: "generate" });
      if (res?.status === 202) {
        pollStarted.current = Date.now();
        setTimedOut(false);
      }
      // 409 busy / 403 quota: the status says what the buttons should now be.
      await refreshStatus();
    } catch (err) {
      console.warn("[hero-image] generate failed:", err);
    } finally {
      setWorking(false);
    }
  }, [call, refreshStatus]);

  const setVisible = useCallback(
    async (visible: boolean) => {
      setWorking(true);
      try {
        await call({ action: "setVisible", visible });
        await refreshStatus();
      } catch (err) {
        console.warn("[hero-image] visibility change failed:", err);
      } finally {
        setWorking(false);
      }
    },
    [call, refreshStatus]
  );

  // A status fetched before sign-out must not outlive the session.
  const current = user && slug ? status : null;

  // The signed-in view wins: the person who just toggled sees the truth at once, not the
  // CDN's copy from up to 30 s ago.
  const src = current
    ? current.visible && current.src
      ? current.src
      : null
    : publicState.visible && publicState.src
      ? publicState.src
      : null;

  return { src, status: current, timedOut, working, generate, setVisible };
}
