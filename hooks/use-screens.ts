"use client";

import { useEffect, useState } from "react";
import { fetchScreens, type Screen } from "@/lib/screens";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The prototype's published screens, once the index has loaded; `[]` before and without. */
export function useScreens(): Screen[] {
  const [screens, setScreens] = useState<Screen[]>([]);
  useEffect(() => {
    let cancelled = false;
    void fetchScreens(BASE_PATH).then((list) => {
      if (!cancelled) setScreens(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return screens;
}
