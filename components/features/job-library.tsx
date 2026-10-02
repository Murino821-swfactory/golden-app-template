"use client";

import { startTransition, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { COPY, type CvLocale } from "@/lib/cv-matcher-copy";
import {
  CUSTOM_ROLE_LIMIT, DESCRIPTION_LIMIT, JOB_CATEGORIES, JOB_LIBRARY_KEY, TITLE_LIMIT,
  defaultJobRoles, parseSavedRoles, serializeSavedRoles, type JobCategory, type JobRole,
} from "@/lib/job-library";

const fieldClass = "min-h-11 w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function JobLibrary({ locale, job, onUse }: {
  locale: CvLocale; job: string; onUse: (description: string) => void;
}) {
  const c = COPY[locale].library;
  const id = useId();
  const [saved, setSaved] = useState<JobRole[]>([]);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<JobCategory>("ai");
  const [notice, setNotice] = useState<"savedNotice" | "deletedNotice" | "loadedNotice" | null>(null);
  const [error, setError] = useState<"storageError" | "invalid" | "limit" | null>(null);

  useEffect(() => {
    try {
      const roles = parseSavedRoles(localStorage.getItem(JOB_LIBRARY_KEY));
      startTransition(() => { setSaved(roles); setReady(true); });
    } catch {
      startTransition(() => { setError("storageError"); setReady(true); });
    }
  }, []);

  const defaults = defaultJobRoles(locale);
  const all = [...defaults, ...saved];
  const selected = all.find(role => role.id === selectedId);
  const isCustom = selectedId.startsWith("custom:");
  const query = search.trim().toLocaleLowerCase(locale);
  const matches = (role: JobRole) => `${role.title} ${c.categories[role.category]}`.toLocaleLowerCase(locale).includes(query);

  function select(value: string) {
    setSelectedId(value);
    const role = all.find(role => role.id === value);
    setTitle(role?.title ?? "");
    setCategory(role?.category ?? "ai");
    setNotice(null);
  }

  function persist(next: JobRole[]): boolean {
    try {
      // Read before writing: do not silently overwrite damaged data or another tab's edits.
      const stored = parseSavedRoles(localStorage.getItem(JOB_LIBRARY_KEY));
      if (serializeSavedRoles(stored) !== serializeSavedRoles(saved)) throw new Error("Library changed in another tab");
      localStorage.setItem(JOB_LIBRARY_KEY, serializeSavedRoles(next));
      setSaved(next);
      setError(null);
      return true;
    } catch {
      setError("storageError");
      setNotice(null);
      return false;
    }
  }

  function save() {
    setNotice(null);
    if (!title.trim() || title.length > TITLE_LIMIT || !job.trim() || job.length > DESCRIPTION_LIMIT) {
      setError("invalid");
      return;
    }
    if (!isCustom && saved.length >= CUSTOM_ROLE_LIMIT) { setError("limit"); return; }
    const role: JobRole = {
      id: isCustom ? selectedId : `custom:${crypto.randomUUID()}`,
      title: title.trim(), category, description: job.trim(),
    };
    const next = isCustom ? saved.map(item => item.id === role.id ? role : item) : [...saved, role];
    if (persist(next)) { setSelectedId(role.id); setSearch(""); setNotice("savedNotice"); }
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3 rounded-lg border border-border p-4">
      <h2 id={`${id}-heading`} className="text-base font-semibold">{c.title}</h2>
      <p className="text-xs leading-relaxed text-muted-foreground">{c.intro}</p>
      <div className="space-y-1">
        <label htmlFor={`${id}-search`} className="text-sm">{c.search}</label>
        <input id={`${id}-search`} type="search" value={search} onChange={e => { setSearch(e.target.value); select(""); }} className={fieldClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${id}-select`} className="text-sm">{c.choose}</label>
        <select id={`${id}-select`} value={selectedId} onChange={e => select(e.target.value)} className={fieldClass}>
          <option value="">{c.choose}</option>
          <optgroup label={c.defaults}>
            {defaults.filter(matches).map(role => <option key={role.id} value={role.id}>{role.title}</option>)}
          </optgroup>
          {saved.some(matches) && <optgroup label={c.saved}>
            {saved.filter(matches).map(role => <option key={role.id} value={role.id}>{role.title}</option>)}
          </optgroup>}
        </select>
        {!all.some(matches) && <p className="text-sm text-muted-foreground">{c.noMatches}</p>}
      </div>
      <Button type="button" variant="outline" className="min-h-11 whitespace-normal" disabled={!selected} onClick={() => {
        if (selected) { onUse(selected.description); setNotice("loadedNotice"); }
      }}>{c.use}</Button>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={`${id}-title`} className="text-sm">{c.roleTitle}</label>
          <input id={`${id}-title`} value={title} maxLength={TITLE_LIMIT} onChange={e => setTitle(e.target.value)} className={fieldClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${id}-category`} className="text-sm">{c.category}</label>
          <select id={`${id}-category`} value={category} onChange={e => setCategory(e.target.value as JobCategory)} className={fieldClass}>
            {JOB_CATEGORIES.map(key => <option key={key} value={key}>{c.categories[key]}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-11 max-w-full whitespace-normal" disabled={!ready} onClick={save}>
          {isCustom ? c.update : c.save}
        </Button>
        {isCustom && <Button type="button" variant="ghost" className="min-h-11" onClick={() => {
          if (persist(saved.filter(role => role.id !== selectedId))) { select(""); setNotice("deletedNotice"); }
        }}>{c.remove}</Button>}
      </div>
      {error && <p role="alert" className="text-sm">{c[error]}</p>}
      <p role="status" className="text-sm text-muted-foreground">{notice ? c[notice] : ""}</p>
    </section>
  );
}
