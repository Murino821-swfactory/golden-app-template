"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { BookOpen, ArrowRight, Search, Star, CheckCircle2, Library, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { readingCopy } from "@/lib/reading-copy";
import { appendEntry, localDate, localized, parseDiary, persistDiary, questionsFor, quizVerdict, REFLECTION_QUESTIONS, searchBooks, starterBooks, STORAGE_KEY, type Book, type Entry } from "@/lib/reading-diary";

function BookJacket({ book, small = false }: { book: Book; small?: boolean }) {
  return <div aria-hidden className={`relative flex shrink-0 flex-col justify-between overflow-hidden rounded-r-xl border-l-8 border-primary/30 bg-primary/10 p-4 text-primary ${small ? "h-28 w-20" : "h-48 w-32"}`}>
    <span className="text-[9px] font-bold uppercase tracking-[.2em]">READ • DREAM</span>
    <BookOpen className={small ? "size-7" : "size-12"} strokeWidth={1.2} />
    <span className="line-clamp-3 text-xs font-semibold leading-tight">{book.title}</span>
  </div>;
}

export function ReadingDiary() {
  const locale = useLocale();
  const copy = readingCopy[locale === "sk" ? "sk" : "en"];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [storageProblem, setStorageProblem] = useState(false);
  const snapshot = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<"minimum" | "searchError" | null>(null);
  const request = useRef<AbortController | null>(null);
  const [selected, setSelected] = useState<Book | null>(null);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [date, setDate] = useState(localDate());
  const [rating, setRating] = useState(5);
  const [error, setError] = useState<"wrong" | "incomplete" | "saveError" | "max" | null>(null);
  const [notice, setNotice] = useState<"saved" | "deleted" | "saveError" | "exportError" | null>(null);
  const [view, setView] = useState<Entry | null>(null);
  useEffect(() => {
    try {
      snapshot.current = localStorage.getItem(STORAGE_KEY);
      setEntries(parseDiary(snapshot.current));
    } catch { setStorageProblem(true); }
    setReady(true);
    const changed = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) setStorageProblem(true); };
    window.addEventListener("storage", changed);
    return () => { window.removeEventListener("storage", changed); request.current?.abort(); };
  }, []);
  const starter = starterBooks(locale);
  const questions = selected ? questionsFor(selected) : null;
  const canSave = !!selected && quizVerdict(selected, answers).passed && ready && !storageProblem;
  const choose = (book: Book) => {
    setSelected(book); setAnswers(["", "", ""]); setDate(localDate()); setRating(5); setError(null); setNotice(null);
  };
  async function search(event: FormEvent) {
    event.preventDefault();
    request.current?.abort();
    setSearchError(null); setResults([]); setSearched(false);
    if (query.trim().length < 2) { setSearching(false); setSearchError("minimum"); return; }
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    setSearching(true);
    try {
      const books = await searchBooks(query, controller.signal);
      if (request.current === controller) { setResults(books); setSearched(true); }
    } catch {
      if (request.current === controller) setSearchError("searchError");
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setSearching(false);
    }
  }
  function commit(next: Entry[]) {
    snapshot.current = persistDiary(localStorage, snapshot.current, next);
    setEntries(next);
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (entries.length >= 200) { setError("max"); return; }
    const verdict = quizVerdict(selected, answers);
    if (!verdict.passed) { setError(questions ? "wrong" : "incomplete"); return; }
    let next: Entry[];
    try { next = appendEntry(entries, { book: selected, date, rating, answers: answers.map((a) => a.trim()) }); }
    catch { setError("incomplete"); return; }
    try { commit(next); setSelected(null); setNotice("saved"); }
    catch { setError("saveError"); }
  }
  function remove(entry: Entry) {
    if (!window.confirm(copy.confirm)) return;
    try { commit(entries.filter((e) => e.id !== entry.id)); setNotice("deleted"); }
    catch { setNotice("saveError"); }
  }
  function download() {
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, entries }, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "reading-diary.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setNotice("exportError"); }
  }
  const bookCards = (books: Book[]) => <div className="grid gap-4 md:grid-cols-3">{books.map((book) => {
    const existing = entries.some((e) => e.book.id === book.id);
    return <article key={book.id} className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5" data-book-id={book.id}>
      <div className="mb-5 flex items-start gap-4"><BookJacket book={book} small /><div className="min-w-0"><h3 className="break-words text-lg font-semibold">{book.title}</h3><p className="mt-2 text-sm text-muted-foreground">{book.author || copy.unknownAuthor}</p></div></div>
      <p className="mb-4 flex items-center gap-2 text-xs text-primary"><CheckCircle2 className="size-4 shrink-0" aria-hidden />{questionsFor(book) ? copy.knowledge : copy.reflection}</p>
      <Button className="mt-auto min-h-11 whitespace-normal" variant="outline" onClick={() => choose(book)} disabled={!ready || storageProblem || existing || entries.length >= 200}>{existing ? copy.already : copy.choose}<ArrowRight aria-hidden /></Button>
    </article>;
  })}</div>;
  return <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
    <div className="grid gap-3 py-7 sm:grid-cols-3">{[copy.step1, copy.step2, copy.step3].map((step, i) => <p key={step} className="flex items-center gap-3 text-sm"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">0{i + 1}</span>{step}</p>)}</div>
    <section className="mb-10" aria-label={copy.summary}><div className="grid grid-cols-3 gap-2 sm:gap-4">{[[entries.length, copy.books], [entries.filter((e) => questionsFor(e.book)).length, copy.quizzes], [entries.filter((e) => e.rating === 5).length, copy.favourites]].map(([n, label]) => <div key={label} className="rounded-2xl border border-border bg-card p-3 sm:p-5"><p className="text-3xl font-semibold text-primary">{n}</p><p className="mt-2 text-xs text-muted-foreground sm:text-sm">{label}</p></div>)}</div></section>
    {storageProblem && <p role="alert" className="mb-6 rounded-xl border border-destructive p-4">{copy.loadError}</p>}
    <section id="book-library" className="scroll-mt-20" aria-labelledby="library-title">
      <div className="mb-5 flex items-center gap-3"><Search className="size-6 text-primary" aria-hidden /><h2 id="library-title" className="text-2xl font-semibold">{copy.library}</h2></div><p className="mb-5 max-w-2xl text-muted-foreground">{copy.libraryIntro}</p>
      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row"><div className="flex-1"><label htmlFor="book-query" className="mb-2 block text-sm">{copy.searchLabel}</label><Input id="book-query" maxLength={150} value={query} onChange={(e) => { request.current?.abort(); request.current = null; setQuery(e.target.value); setResults([]); setSearched(false); setSearchError(null); setSearching(false); }} className="min-h-12" placeholder={locale === "sk" ? "napr. Malý princ" : "e.g. The Little Prince"} /></div><Button type="submit" className="min-h-12 px-5 sm:mt-7" disabled={searching}><Search aria-hidden />{searching ? copy.searching : copy.search}</Button></form>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{copy.privacy}</p>
      <div aria-live="polite">{searchError && <p className="my-4" role="alert">{copy[searchError]}</p>}{searched && results.length === 0 && <p className="my-4">{copy.emptySearch}</p>}{results.length > 0 && <><h3 className="mb-4 mt-7 text-sm font-semibold text-primary">{copy.external}</h3>{bookCards(results)}<a className="mt-3 inline-block min-h-11 text-xs text-muted-foreground underline" href="https://openlibrary.org" target="_blank" rel="noopener noreferrer">{copy.credit}</a></>}</div>
      <h3 className="mb-4 mt-8 text-sm font-semibold text-primary">{copy.starter}</h3>{bookCards(starter)}
    </section>
    <section id="my-diary" className="mt-12 border-t border-border pt-10" aria-labelledby="my-diary-title">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="my-diary-title" className="flex items-center gap-3 text-2xl font-semibold"><Library className="size-6 text-primary" aria-hidden />{copy.diary}</h2>{entries.length > 0 && <Button variant="outline" className="min-h-11" onClick={download}><Download aria-hidden />{copy.export}</Button>}</div><p className="mt-2 text-muted-foreground">{copy.diaryIntro}</p>
      <p role="status" className="mt-4 text-sm text-primary">{notice ? copy[notice] : ""}</p>
      {!ready ? <p>{copy.loading}</p> : entries.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center"><BookOpen className="mx-auto mb-4 size-10 text-primary" aria-hidden /><h3 className="text-xl font-semibold">{copy.empty}</h3><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{copy.emptyHint}</p></div> : <div className="mt-4 grid gap-4 sm:grid-cols-2">{entries.map((entry) => <article data-diary-entry key={entry.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex gap-4"><BookJacket book={entry.book} small /><div className="min-w-0"><h3 className="break-words text-lg font-semibold">{entry.book.title}</h3><p className="mt-1 text-sm text-muted-foreground">{entry.book.author}</p><p className="mt-3 text-xs text-muted-foreground">{copy.read}: <time dateTime={entry.date}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${entry.date}T12:00:00`))}</time></p><p className="mt-2 flex items-center gap-1 text-primary" aria-label={`${entry.rating} ${copy.score}`}>{Array.from({ length: entry.rating }, (_, i) => <Star key={i} className="size-4 fill-current" aria-hidden />)}</p></div></div><p className="mt-4 text-xs text-primary">{questionsFor(entry.book) ? copy.passed : copy.completed}</p><div className="mt-4 flex flex-wrap justify-between gap-2"><Button className="min-h-11" variant="outline" onClick={() => setView(entry)}>{copy.view}</Button><Button className="min-h-11" variant="ghost" disabled={storageProblem} aria-label={`${copy.remove}: ${entry.book.title}`} onClick={() => remove(entry)}><Trash2 aria-hidden />{copy.remove}</Button></div></article>)}</div>}
      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">{copy.storage}</p>{entries.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{copy.exportHint}</p>}
    </section>
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent closeLabel={copy.close}><DialogTitle>{copy.quizTitle}</DialogTitle><DialogDescription>{selected?.title} · {questions ? copy.knowledgeHint : copy.reflectionHint}</DialogDescription><form onSubmit={save} className="mt-6 space-y-5">
      {(questions ?? REFLECTION_QUESTIONS).map((q, i) => <fieldset key={i} className="space-y-3"><legend className="mb-2 text-sm font-semibold">{i + 1}. {localized("text" in q ? q.text : q, locale)}</legend>{questions ? questions[i].options.map((option, j) => <label key={j} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"><input type="radio" name={`question-${i}`} value={j} checked={answers[i] === String(j)} onChange={() => { setAnswers((old) => old.map((a, n) => n === i ? String(j) : a)); setError(null); }} className="size-4 accent-primary" />{localized(option, locale)}</label>) : <Textarea aria-label={`${copy.question} ${i + 1}`} minLength={20} maxLength={1000} required rows={3} value={answers[i]} onChange={(e) => { setAnswers((old) => old.map((a, n) => n === i ? e.target.value : a)); setError(null); }} />} </fieldset>)}
      <div className="grid grid-cols-2 gap-3"><div><label htmlFor="finished-date" className="mb-2 block text-sm">{copy.date}</label><Input id="finished-date" className="min-h-11" type="date" value={date} min="1900-01-01" max={localDate()} required onChange={(e) => setDate(e.target.value)} /></div><div><label htmlFor="book-rating" className="mb-2 block text-sm">{copy.rating}</label><select id="book-rating" value={rating} onChange={(e) => setRating(Number(e.target.value))} className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm">{[5, 4, 3, 2, 1].map((n) => <option value={n} key={n}>{n} ★</option>)}</select></div></div>
      {error && <p role="alert" className="text-sm">{copy[error]}</p>}
      <Button className="min-h-12 w-full whitespace-normal" type="submit" disabled={!ready || storageProblem || answers.some((a) => !a.trim())}><CheckCircle2 aria-hidden />{copy.save}</Button>
      <p className="text-xs text-muted-foreground">{canSave ? (questions ? copy.passed : copy.completed) : (questions ? copy.knowledgeHint : "")}</p>
    </form></DialogContent></Dialog>
    <Dialog open={view !== null} onOpenChange={(open) => { if (!open) setView(null); }}><DialogContent closeLabel={copy.close}><DialogTitle>{copy.answers}</DialogTitle><DialogDescription>{view?.book.title}</DialogDescription>{view && <div className="mt-5 space-y-4">{view.answers.map((answer, i) => { const qs = questionsFor(view.book); return <div key={i}><p className="text-sm font-semibold">{i + 1}. {localized(qs ? qs[i].text : REFLECTION_QUESTIONS[i], locale)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{qs ? localized(qs[i].options[Number(answer)], locale) : answer}</p></div>; })}</div>}</DialogContent></Dialog>
  </div>;
}
