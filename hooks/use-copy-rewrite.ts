"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getDemoSlug } from "@/lib/demo-slug";
import { ownerActionsAvailable } from "@/lib/owner-contact";
import {
  DRAFT_POLL_LIMIT_MS,
  POLL_INTERVAL_MS,
  PUBLISH_POLL_LIMIT_MS,
  parseCopyStatus,
  postCopyAction,
  type CopyAction,
  type CopyStatus,
} from "@/lib/copy-rewrite";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export interface UseCopyRewrite {
  /** Present only for the prototype's creator or the founder. */
  status: CopyStatus | null;
  instructions: string;
  setInstructions(value: string): void;
  /** An action is in flight. */
  working: boolean;
  timedOut: boolean;
  /** The server's code for a refused action (402, 409, 429) — cleared by the next one. */
  actionError: string | null;
  pricingUrl: string | null;
  draft(): Promise<void>;
  publish(): Promise<void>;
  resetPrompt(): Promise<void>;
}

/**
 * The creator's and the founder's copy-rewrite panel state. An anonymous visitor makes no
 * request at all: nothing is asked before a session exists, and only where factory-web
 * routes the endpoint (apps.tokenwise.sk/newapp/<slug>).
 */
export function useCopyRewrite(): UseCopyRewrite {
  const { user, getIdToken } = useAuth();
  const slug = getDemoSlug();
  const available = ownerActionsAvailable(BASE_PATH, slug);
  const [status, setStatus] = useState<CopyStatus | null>(null);
  const [instructions, setInstructionsState] = useState("");
  const [working, setWorking] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pricingUrl, setPricingUrl] = useState<string | null>(null);
  const edited = useRef(false);
  const pollStarted = useRef<number | null>(null);

  const call = useCallback(
    async (action: CopyAction) => {
      if (!available || !slug) return null;
      const token = await getIdToken();
      if (!token) return null;
      return postCopyAction(token, slug, action);
    },
    [available, slug, getIdToken]
  );

  const refreshStatus = useCallback(async (): Promise<CopyStatus | null> => {
    try {
      const res = await call({ action: "status" });
      const next = res && res.status === 200 ? parseCopyStatus(res.body) : null;
      setStatus(next);
      // The saved prompt fills the box until the creator starts typing.
      if (next && !edited.current) setInstructionsState(next.instructions);
      if (!next?.pending) pollStarted.current = null;
      else if (pollStarted.current === null) pollStarted.current = Date.now();
      return next;
    } catch (err) {
      console.warn("[copy-rewrite] status unavailable:", err);
      setStatus(null);
      return null;
    }
  }, [call]);

  useEffect(() => {
    if (!user || !available) return;
    void refreshStatus();
  }, [user, available, refreshStatus]);

  // While a preview or a publish runs, re-check every 2.5 s, up to its kind's limit.
  const pendingKind = status?.pending?.kind ?? null;
  useEffect(() => {
    if (!pendingKind || timedOut) return;
    const limit = pendingKind === "publish" ? PUBLISH_POLL_LIMIT_MS : DRAFT_POLL_LIMIT_MS;
    const timer = setInterval(() => {
      const started = pollStarted.current ?? Date.now();
      if (Date.now() - started > limit) {
        setTimedOut(true);
        return;
      }
      void refreshStatus();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pendingKind, timedOut, refreshStatus]);

  const run = useCallback(
    async (action: CopyAction) => {
      setWorking(true);
      setActionError(null);
      setPricingUrl(null);
      try {
        const res = await call(action);
        if (res?.status === 202) {
          pollStarted.current = Date.now();
          setTimedOut(false);
        } else if (res) {
          const body = (res.body ?? {}) as { error?: unknown; pricingUrl?: unknown };
          setActionError(typeof body.error === "string" ? body.error : "generic");
          if (typeof body.pricingUrl === "string") setPricingUrl(body.pricingUrl);
        }
        await refreshStatus();
      } catch (err) {
        console.warn(`[copy-rewrite] ${action.action} failed:`, err);
        setActionError("generic");
      } finally {
        setWorking(false);
      }
    },
    [call, refreshStatus]
  );

  const draft = useCallback(() => run({ action: "draft", instructions }), [run, instructions]);

  const publish = useCallback(async () => {
    const id = status?.latestDraft?.id;
    if (id) await run({ action: "publish", draftId: id });
  }, [run, status]);

  const resetPrompt = useCallback(async () => {
    setWorking(true);
    try {
      const res = await call({ action: "resetPrompt" });
      const body = (res?.body ?? {}) as { instructions?: unknown };
      if (res?.status === 200 && typeof body.instructions === "string") {
        edited.current = false;
        setInstructionsState(body.instructions);
      }
      await refreshStatus();
    } catch (err) {
      console.warn("[copy-rewrite] reset failed:", err);
    } finally {
      setWorking(false);
    }
  }, [call, refreshStatus]);

  const setInstructions = useCallback((value: string) => {
    edited.current = true;
    setInstructionsState(value);
  }, []);

  // A status fetched before sign-out must not outlive the session.
  const current = user && available ? status : null;
  return { status: current, instructions, setInstructions, working, timedOut, actionError, pricingUrl, draft, publish, resetPrompt };
}
