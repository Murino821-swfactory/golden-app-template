"use client";
import { useContext, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { localePath } from "@/lib/locale-routing";
import type { ResearchSnapshot } from "@/lib/law-expert/saved";
import { updateWorkspace } from "@/lib/legal/store";
import { useResearchServices } from "./services";
import { ResearchMatter } from "./research";
export function SaveResearch({ snapshot, onSaved }: { snapshot: ResearchSnapshot; onSaved?: () => void }) {
  const sk = snapshot.locale === "sk", { store } = useResearchServices();
  const matterId = useContext(ResearchMatter);
  const [title, setTitle] = useState((snapshot.facts || snapshot.filters.q || (sk ? "Rešerš rozhodnutí" : "Decision research")).slice(0, 120));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const id = useRef<string | null>(null);
  if (state === "saved") return <p role="status">{sk ? "Rešerš uložená. " : "Research saved. "}{matterId ? <Link className="underline" href={`${localePath(snapshot.locale, "/matters")}?id=${matterId}&tab=research`}>{sk ? "Otvoriť spis" : "Open the matter"}</Link> : <Link className="underline" href={localePath(snapshot.locale, "/dashboard")}>{sk ? "Otvoriť dashboard" : "Open dashboard"}</Link>}</p>;
  return <form onSubmit={async e => {
    e.preventDefault(); if (state === "saving" || !title.trim()) return;
    setState("saving"); id.current ??= crypto.randomUUID();
    try {
      await store.save(id.current, title, snapshot);
      // The matter keeps the link in the workspace; the snapshot itself stays in the archive.
      if (matterId) { try { updateWorkspace(w => ({ ...w, matters: w.matters.map(m => m.id === matterId && !m.researchIds.includes(id.current!) ? { ...m, researchIds: [...m.researchIds, id.current!] } : m) })); } catch { /* no workspace outside the browser */ } }
      setState("saved"); onSaved?.();
    }
    catch { setState("failed"); }
  }} className="space-y-3 rounded-lg border border-border bg-card p-4">
    <label className="block space-y-1 text-sm"><span>{sk ? "Názov rešerše" : "Research title"}</span>
      <input value={title} onChange={e => setTitle(e.target.value)} required maxLength={120} className="h-11 w-full rounded-md border border-border bg-background px-3" />
    </label>
    <p className="text-xs text-muted-foreground">{sk ? "Uloží sa zadanie, filtre, výsledky, váš výber a prípadné stanovisko s citáciami. Číslo spisu nie je potrebné." : "Saves your problem, filters, results, selections and any memo with citations. No case number is required."}</p>
    {state === "failed" && <p role="alert">{sk ? "Uloženie sa nepodarilo. Overte prihlásenie vlastníka a skúste znova." : "Could not save. Check the owner's sign-in and retry."}</p>}
    <Button disabled={state === "saving" || !title.trim()} type="submit" className="min-h-11">{state === "saving" ? (sk ? "Ukladám…" : "Saving…") : (sk ? "Uložiť celú rešerš" : "Save full research")}</Button>
  </form>;
}
