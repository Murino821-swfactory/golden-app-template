"use client";

import { useContent } from "@/hooks/use-content";

export function ComparisonSection() {
  const copy = useContent().comparison;
  if (!copy) return null;
  return (
    <section data-section="comparison" className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
      <h2 className="text-balance text-center text-3xl font-semibold tracking-tight">{copy.heading}</h2>
      <div className="mt-10 space-y-3">
        {copy.rows.map((row, i) => (
          <article key={i} className="rounded-xl border border-border bg-card p-5 sm:grid sm:grid-cols-[1fr_2fr_2fr] sm:gap-6">
            <h3 className="font-medium">{row.topic}</h3>
            <div className="mt-4 sm:mt-0"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{copy.beforeLabel}</p><p className="mt-2 text-sm text-muted-foreground">{row.before}</p></div>
            <div className="mt-4 sm:mt-0"><p className="text-xs font-medium uppercase tracking-wider text-primary">{copy.afterLabel}</p><p className="mt-2 text-sm">{row.after}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}
