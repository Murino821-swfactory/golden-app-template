"use client";

import { useLocale } from "next-intl";
import { useContent } from "@/hooks/use-content";
import { cn } from "@/lib/utils";

/**
 * law-expert: the audiences. The first two use cases are the two kinds of customer — the
 * sole practitioner and the firm — drawn as large cards with the branch's photographs; the
 * rest are the practice areas the demo tells a story for. Copy stays in the config, so
 * "Edit texts" keeps working.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const IMAGES = [`${BASE_PATH}/law/hearing.jpg`, `${BASE_PATH}/law/firm.jpg`];

export function UseCasesSection() {
  const copy = useContent().useCases;
  const locale = useLocale();
  if (!copy) return null;
  const sk = locale === "sk";
  return (
    <section data-section="useCases" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <h2 className="text-balance text-center font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{copy.heading}</h2>
      <ol className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {copy.items.map((item, i) => {
          const large = i < 2;
          return (
            <li key={i} className={cn("relative isolate overflow-hidden rounded-2xl border border-border bg-card", large ? "min-h-[22rem] p-6 sm:p-8" : "p-6")}>
              {large && (
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={IMAGES[i]} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_55%,transparent),var(--card)_70%)]" />
                </div>
              )}
              <div className={cn("flex h-full flex-col", large && "justify-end")}>
                <span aria-hidden className="text-sm font-medium tabular-nums text-primary">{String(i + 1).padStart(2, "0")}</span>
                <h3 className={cn("mt-2 font-heading font-semibold", large ? "text-2xl sm:text-3xl" : "text-lg")}>{item.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{item.situation}</p>
                <p className="mt-4 border-t border-border pt-4 text-sm">{item.action}</p>
                {large && <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">{i === 0 ? (sk ? "Režim: samostatný advokát" : "Mode: sole practitioner") : (sk ? "Režim: kancelária s rolami a tímom" : "Mode: firm with roles and a team")}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
