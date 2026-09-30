"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { localePath } from "@/lib/locale-routing";
import { researchCopy } from "@/lib/law-expert/copy";
import type { SavedResearch } from "@/lib/law-expert/saved";
import type { Locale } from "@/lib/law-expert/types";
import { useResearchServices } from "./services";
import { MemoView } from "./memo-view";
import { DecisionCard } from "./decision-card";
import { Coverage } from "./coverage";

function SavedDetail({ record, locale, changed }: { record: SavedResearch; locale: Locale; changed: (record: SavedResearch | null) => void }) {
  const sk = locale === "sk", { store } = useResearchServices(), copy = researchCopy(locale);
  const [notes, setNotes] = useState(record.notes);
  const [state, setState] = useState<"idle" | "working" | "saved" | "failed">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const s = record.snapshot;
  const hits = s.search?.items ?? s.memo?.sources ?? [];
  return <article className="min-w-0 space-y-5 rounded-lg border border-border bg-card p-4 sm:p-6">
    <h3 className="font-heading text-xl font-semibold">{record.title}</h3>
    <p className="text-xs text-muted-foreground">{sk ? "Uložený výsledok hľadania z " : "Search snapshot from "}{new Date(s.searchedAt).toLocaleString(locale)}</p>
    {s.facts && <p className="whitespace-pre-wrap break-words">{s.facts}</p>}
    <dl className="grid gap-2 text-sm sm:grid-cols-2">{Object.entries(s.filters).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => <div key={key} className="min-w-0 break-words"><dt className="text-muted-foreground">{({ q: sk ? "Slová" : "Words", source: sk ? "Zdroj" : "Source", courtType: sk ? "Súd" : "Court", lawArea: sk ? "Oblasť" : "Area", region: sk ? "Kraj" : "Region", form: sk ? "Forma" : "Form", from: sk ? "Od" : "From", to: sk ? "Do" : "To", paragraph: "§ TZ", fileNumber: sk ? "Spis" : "File", ecli: "ECLI", page: sk ? "Strana (od 0)" : "Page (from 0)" } as Record<string, string>)[key] ?? key}</dt><dd>{String(value)}</dd></div>)}</dl>
    {s.memo && <MemoView memo={s.memo} copy={copy} locale={locale} />}
    {s.search && <><Coverage values={s.search.coverage} sk={sk} /><ol className="space-y-3">{s.search.items.map(hit => <li key={hit.id}><DecisionCard hit={hit} copy={copy} ecli={hit.ecli} /></li>)}</ol></>}
    {s.selectedIds.length > 0 && <div className="text-sm"><h4 className="font-medium">{sk ? "Váš výber" : "Your selection"}</h4><ul>{hits.filter(h => s.selectedIds.includes(h.id)).map(h => <li key={h.id}>{h.fileNumber} · {h.court}</li>)}</ul></div>}
    <form className="space-y-3" onSubmit={async e => {
      e.preventDefault(); if (state === "working") return; setState("working");
      try { await store.notes(record.id, notes); changed({ ...record, notes }); setState("saved"); }
      catch { setState("failed"); }
    }}>
      <label className="block space-y-1"><span>{sk ? "Moje poznámky" : "My notes"}</span><textarea value={notes} onChange={e => { setNotes(e.target.value); setState("idle"); }} maxLength={10000} rows={5} className="w-full rounded-md border border-border bg-background p-3" /></label>
      <Button disabled={state === "working"} type="submit" className="min-h-11">{sk ? "Uložiť poznámky" : "Save notes"}</Button>
    </form>
    {state === "saved" && <p role="status">{sk ? "Poznámky uložené." : "Notes saved."}</p>}
    {state === "failed" && <p role="alert">{sk ? "Zmenu sa nepodarilo uložiť. Skúste znova." : "Could not save. Please retry."}</p>}
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="outline" className="min-h-11"><Link href={`${localePath(locale, "/research")}?repeat=${encodeURIComponent(record.id)}`}>{sk ? "Upraviť zadanie a hľadať znova" : "Edit inputs and search again"}</Link></Button>
      <Button variant="outline" disabled={state === "working"} onClick={() => setConfirmDelete(true)}>{sk ? "Vymazať rešerš" : "Delete research"}</Button>
    </div>
    {confirmDelete && <div className="space-y-2 rounded-md border border-border p-3"><p>{sk ? "Vymazať uložený výsledok aj poznámky?" : "Delete the saved result and notes?"}</p><div className="flex gap-3"><Button disabled={state === "working"} onClick={async () => {
      setState("working"); try { await store.remove(record.id); changed(null); } catch { setState("failed"); }
    }}>{sk ? "Áno, vymazať" : "Yes, delete"}</Button><Button variant="outline" onClick={() => setConfirmDelete(false)}>{sk ? "Zrušiť" : "Cancel"}</Button></div></div>}
  </article>;
}

export function ResearchArchive({ locale }: { locale: Locale }) {
  const sk = locale === "sk", { store } = useResearchServices();
  const [records, setRecords] = useState<SavedResearch[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    store.list().then(rows => { if (!cancelled) { setRecords(rows); setState("ready"); } }).catch(() => { if (!cancelled) setState("failed"); });
    return () => { cancelled = true; };
  }, [store, revision]);
  const current = records.find(r => r.id === selected);
  return <section className="space-y-4" aria-label={sk ? "Moje rešerše" : "My research"}>
    <h2 className="font-heading text-xl font-semibold">{sk ? "Moje rešerše" : "My research"}</h2>
    {state === "loading" && <p role="status">{sk ? "Načítavam…" : "Loading…"}</p>}
    {state === "failed" && <div role="alert"><p>{sk ? "Rešerše sa nepodarilo načítať. Prihláste sa ako vlastník prototypu." : "Could not load research. Sign in as the prototype owner."}</p><Button variant="outline" onClick={() => { setState("loading"); setRevision(r => r + 1); }}>{sk ? "Skúsiť znova" : "Retry"}</Button></div>}
    {state === "ready" && !records.length && <p className="text-muted-foreground">{sk ? "Zatiaľ nemáte uloženú rešerš. Uložte výsledok vyhľadávania alebo porovnania rozhodnutí." : "No saved research yet. Save a search or decision comparison."}</p>}
    <ul className="space-y-2">{records.map(r => <li key={r.id}><button type="button" aria-expanded={selected === r.id} className="min-h-11 w-full rounded-md border border-border p-3 text-left hover:bg-muted" onClick={() => setSelected(selected === r.id ? null : r.id)}><span className="block font-medium">{r.title}</span><span className="text-xs text-muted-foreground">{new Date(r.snapshot.searchedAt).toLocaleDateString(locale)} · {(r.snapshot.search?.items ?? r.snapshot.memo?.sources ?? []).length} {sk ? "rozhodnutí" : "decisions"}</span></button></li>)}</ul>
    {current && <SavedDetail key={current.id} record={current} locale={locale} changed={next => {
      setRecords(rows => next ? rows.map(r => r.id === next.id ? next : r) : rows.filter(r => r.id !== current.id));
      if (!next) setSelected(null);
    }} />}
  </section>;
}
