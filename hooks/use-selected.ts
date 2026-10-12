"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The record a list page has open in its drawer, kept in the URL (`?id=…`) so a card on
 * the pipeline can link straight to a candidate and the back button closes the drawer.
 * Pages that call this render inside the shell's Suspense boundary (static export rule).
 */
export function useSelected(param = "id"): [string | null, (id: string | null) => void] {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const value = params.get(param);
  const set = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (id) next.set(param, id);
      else next.delete(param);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router, param]
  );
  return [value, set];
}
