"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { researchCopy } from "@/lib/law-expert/copy";
import type { Locale } from "@/lib/law-expert/types";
import { DecisionSearch } from "./decision-search";
import { useResearchServices } from "./services";
import { repeatInput } from "@/lib/law-expert/saved";
import { MemoPanel } from "./memo-panel";

type Tab = "memo" | "search";

/**
 * The research page of law-expert (OTH-91): a memo on the visitor's facts, or a direct
 * search of InfoSúd and NS SR. Both panels stay mounted, so switching tabs keeps what was typed and
 * found. The server half is factory-web `lawExpertApi`.
 */
export function Research() {
  const locale: Locale = useLocale() === "sk" ? "sk" : "en";
  const copy = researchCopy(locale);
  const { store } = useResearchServices();
  const [tab, setTab] = useState<Tab>("memo");
  const [initial, setInitial] = useState<ReturnType<typeof repeatInput> | undefined>();
  const [restore, setRestore] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    let cancelled = false;
    const id = new URLSearchParams(window.location.search).get("repeat");
    Promise.resolve().then(async () => {
      if (!id) { if (!cancelled) setRestore("ready"); return; }
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
  ];

  if (restore === "loading") return <p role="status" className="p-6">{locale === "sk" ? "Načítavam zadanie…" : "Loading inputs…"}</p>;
  if (restore === "failed") return <p role="alert" className="p-6">{locale === "sk" ? "Uložené zadanie sa nepodarilo načítať. Vráťte sa do dashboardu a skúste znova." : "Could not load saved inputs. Return to the dashboard and retry."}</p>;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{copy.pageTitle}</h1>
        <p className="max-w-prose text-muted-foreground">{copy.pageIntro}</p>
      </header>

      <div role="tablist" aria-label={copy.pageTitle} className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`le-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`le-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className="min-h-11 rounded-md px-3 text-sm font-medium transition-colors hover:bg-foreground/5 aria-selected:bg-primary aria-selected:text-primary-foreground"
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
    </div>
  );
}
