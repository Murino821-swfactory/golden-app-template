"use client";

import { useContent } from "@/hooks/use-content";

export function UseCasesSection() {
  const copy = useContent().useCases;
  if (!copy) return null;
  return (
    <section data-section="useCases" className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
      <h2 className="text-balance text-center text-3xl font-semibold tracking-tight">{copy.heading}</h2>
      <ol className="mt-10 grid gap-4 sm:grid-cols-2">
        {copy.items.map((item, i) => (
          <li key={i} className="rounded-xl border border-border bg-card p-6">
            <span aria-hidden className="text-sm font-medium tabular-nums text-primary">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 text-lg font-medium">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.situation}</p>
            <p className="mt-4 border-t border-border pt-4 text-sm">{item.action}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
