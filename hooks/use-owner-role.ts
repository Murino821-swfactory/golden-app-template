"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getDemoSlug } from "@/lib/demo-slug";
import {
  ownerActionsAvailable,
  parseOwnerCard,
  parseOwnerStatus,
  postOwnerContact,
  type OwnerCard,
  type OwnerStatus,
} from "@/lib/owner-contact";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export interface UseOwnerRole {
  /** Owner actions can exist in this build at all (published under /newapp/, with a slug). */
  available: boolean;
  /** The server has answered for the signed-in user — or there is nothing to ask. */
  resolved: boolean;
  /** Present only for the prototype's owner or the founder. */
  status: OwnerStatus | null;
  saveCard: (card: OwnerCard) => Promise<OwnerCard>;
}

export function useOwnerRole(): UseOwnerRole {
  const { user, loading, getIdToken } = useAuth();
  const slug = getDemoSlug();
  const available = ownerActionsAvailable(BASE_PATH, slug);
  const [answer, setAnswer] = useState<{ uid: string; status: OwnerStatus | null } | null>(null);

  useEffect(() => {
    if (!available || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const res = await postOwnerContact(token, slug!, { action: "status" });
        if (!cancelled) setAnswer({ uid: user.uid, status: res.status === 200 ? parseOwnerStatus(res.body) : null });
      } catch (err) {
        console.warn("[owner] status unavailable:", err);
        if (!cancelled) setAnswer({ uid: user.uid, status: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [available, user, slug, getIdToken]);

  const current = user && answer?.uid === user.uid ? answer : null;
  const resolved = !available || (!loading && !user) || current !== null;

  const saveCard = useCallback(
    async (card: OwnerCard) => {
      const token = await getIdToken();
      if (!token || !slug) throw new Error("not signed in");
      const res = await postOwnerContact(token, slug, { action: "save", card });
      if (res.status !== 200) throw new Error(`owner-contact save answered ${res.status}`);
      const saved = parseOwnerCard((res.body as { card?: unknown } | null)?.card);
      setAnswer((prev) => (prev?.status ? { ...prev, status: { ...prev.status, card: saved } } : prev));
      return saved;
    },
    [getIdToken, slug]
  );

  return { available, resolved, status: current?.status ?? null, saveCard };
}
