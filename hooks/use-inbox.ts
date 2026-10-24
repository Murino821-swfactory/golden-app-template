"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";
import { getDemoSlug } from "@/lib/demo-slug";
import { parseMessage, type InboxMessage } from "@/lib/messages";

/** Runs only when `enabled` (the server confirmed owner/admin) — a stranger never queries. */
export function useInbox(enabled: boolean) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [readStatus, setReadStatus] = useState<Record<string, "pending" | "failed" | undefined>>({});
  const pendingReads = useRef(new Set<string>());
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
      if (!enabled || !slug || pendingReads.current.has(id)) return;
      pendingReads.current.add(id);
      setReadStatus((prev) => ({ ...prev, [id]: "pending" }));
      try {
        await updateDoc(doc(getFirestoreInstance(), `demos/${slug}/contactMessages/${id}`), { readAt: serverTimestamp() });
        // A message becomes read only after Firestore acknowledges the metadata write.
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
        setReadStatus((prev) => ({ ...prev, [id]: undefined }));
      } catch (err) {
        console.warn("[inbox] mark read failed:", err);
        setReadStatus((prev) => ({ ...prev, [id]: "failed" }));
      } finally {
        pendingReads.current.delete(id);
      }
    },
    [enabled, slug]
  );

  return { messages, loading: enabled ? loading : false, error, markRead, readStatus };
}
