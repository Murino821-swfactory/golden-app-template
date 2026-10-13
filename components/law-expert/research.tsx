"use client";

import { createContext, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { researchCopy } from "@/lib/law-expert/copy";
import type { Locale } from "@/lib/law-expert/types";
import { appCopy } from "@/lib/legal/copy";
import { DecisionSearch } from "./decision-search";
import { useResearchServices } from "./services";
import { repeatInput } from "@/lib/law-expert/saved";
import { MemoPanel } from "./memo-panel";
import { ResearchArchive } from "./archive";

type Tab = "memo" | "search" | "archive";

/** The matter a research run belongs to (`?matter=<id>`): a saved snapshot is linked to it. */
export const ResearchMatter = createContext<string | null>(null);

/**
 * The research page of law-expert (OTH-91): a memo on the visitor's facts, a direct search of
 * InfoSúd and NS SR, and the archive of saved research. The panels stay mounted, so switching
 * tabs keeps what was typed and found. The server half is factory-web `lawExpertApi`.
 */
export function Research() {
  const locale: Locale = useLocale() === "sk" ? "sk" : "en";
  const copy = researchCopy(locale);
  const app = appCopy(locale);
  const { store } = useResearchServices();
  const [tab, setTab] = useState<Tab>("memo");
  const [matterId, setMatterId] = useState<string | null>(null);
  const [initial, setInitial] = useState<ReturnType<typeof repeatInput> | undefined>();
  const [restore, setRestore] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("repeat");
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setMatterId(params.get("matter"));
      if (params.get("tab") === "archive") setTab("archive");
      if (!id) { setRestore("ready"); return; }
      try {
        const saved = await store.get(id);
        if (!cancelled) { setInitial(repeatInput(saved.snapshot)); setTab(saved.snapshot.mode === "search" ? "search" : "memo"); setRestore("ready"); }
      } catch { if (!cancelled) setRestore("failed"); }
    });
    return () => { cancelled = true; };
  }, [store]);
  const tabs: { id: Tab; label: string }[] = [
    { id: "memo", label: copy.tabs.memo },
    { id: "search", label: copy.tabs.search },
    { id: "archive", label: app.research.archiveTab },
  ];

  if (restore === "loading") return <p role="status" className="p-6">{locale === "sk" ? "Načítavam zadanie…" : "Loading inputs…"}</p>;

  return (
    <ResearchMatter.Provider value={matterId}>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{app.research.title}</h1>
          <p className="max-w-prose text-sm text-muted-foreground">{app.research.intro}</p>
          {restore === "failed" && <p role="alert" className="text-sm">{locale === "sk" ? "Uložené zadanie sa nepodarilo načítať." : "The saved inputs could not be loaded."}</p>}
        </header>
        <div role="tablist" aria-label={copy.pageTitle} className="grid grid-cols-3 gap-1 rounded-lg border border-border p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`le-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`le-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className="min-h-11 rounded-md px-2 text-sm font-medium transition-colors hover:bg-foreground/5 aria-selected:bg-primary aria-selected:text-primary-foreground"
            >
              {t.label}
            </button>
          ))}
        </div>
        <div id="le-panel-memo" role="tabpanel" aria-labelledby="le-tab-memo" hidden={tab !== "memo"}>
          <MemoPanel copy={copy} locale={locale} initial={initial?.mode === "problem" ? initial : undefined} />
        </div>
        <div id="le-panel-search" role="tabpanel" aria-labelledby="le-tab-search" hidden={tab !== "search"}>
          <DecisionSearch copy={copy} locale={locale} initial={initial?.mode === "search" ? initial.filters : undefined} />
        </div>
        <div id="le-panel-archive" role="tabpanel" aria-labelledby="le-tab-archive" hidden={tab !== "archive"}>
          {tab === "archive" && <ResearchArchive locale={locale} />}
        </div>
      </div>
    </ResearchMatter.Provider>
  );
}
