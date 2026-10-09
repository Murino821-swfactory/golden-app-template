"use client";
import { useEffect, useState } from "react";
import { useResearchServices } from "./services";

/** One request per page load; a failure is forgotten so the next mount asks again. */
let loading: Promise<Record<string, string>> | null = null;

/** Criminal Code section → official heading (Slov-Lex), from the API. Empty until it arrives. */
export function useSectionHeadings(): Record<string, string> {
  const services = useResearchServices();
  const [headings, setHeadings] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    loading ??= services.sections().then(out => {
      if (!out.ok) { loading = null; return {}; }
      return out.data.sections;
    }, () => { loading = null; return {}; });
    void loading.then(map => { if (live) setHeadings(map); });
    return () => { live = false; };
  }, [services]);
  return headings;
}
