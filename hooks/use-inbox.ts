"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";
import { getDemoSlug } from "@/lib/demo-slug";
import { parseMessage, type InboxMessage } from "@/lib/messages";

/** Runs only when `enabled` (the server confirmed owner/admin) — a stranger never queries. */
export function useInbox(enabled: boolean) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const slug = getDemoSlug();

  useEffect(() => {
    if (!enabled || !slug) return;
    let cancelled = false;
    const ref = collection(getFirestoreInstance(), `demos/${slug}/contactMessages`);
    getDocs(query(ref, orderBy("createdAt", "desc"), limit(100)))
      .then((snap) => {
        if (cancelled) return;
        setMessages(snap.docs.map((d) => parseMessage(d.id, d.data())).filter((m): m is InboxMessage => m !== null));
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err as Error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, slug]);

  const markRead = useCallback(
    async (id: string) => {
      if (!slug) return;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
      await updateDoc(doc(getFirestoreInstance(), `demos/${slug}/contactMessages/${id}`), { readAt: serverTimestamp() }).catch(
        (err) => console.warn("[inbox] mark read failed:", err)
      );
    },
    [slug]
  );

  return { messages, loading: enabled ? loading : false, error, markRead };
}
