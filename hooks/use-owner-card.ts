"use client";

import { useEffect, useState } from "react";
import { fetchOwnerCard, type OwnerCard } from "@/lib/owner-contact";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The public card every visitor sees. The setter lets the owner's save show immediately
 * instead of after the 30 s edge cache expires. */
export function useOwnerCard(): [OwnerCard, (card: OwnerCard) => void] {
  const [card, setCard] = useState<OwnerCard>({});
  useEffect(() => {
    let cancelled = false;
    void fetchOwnerCard(BASE_PATH).then((c) => {
      if (!cancelled) setCard(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return [card, setCard];
}
