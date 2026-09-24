"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { analyzeCv, SAMPLES, type AnalysisResult, type MatchTier, type SkillHit } from "@/lib/cv-analyzer";
import { COPY, cvLocale, groupedRecommendations, reportToMarkdown, type CvLocale } from "@/lib/cv-matcher-copy";

/**
 * CV ↔ job posting matcher (OTH-85). Everything runs in the browser: the score, the gaps
 * and the advice are recomputed as the visitor types, and nothing is sent anywhere.
 *
 * Colours: layout and surfaces use the palette tokens, so the header's palette switcher
 * repaints this too. The three status colours (match / missing / nice-to-have) are fixed on
 * purpose — they carry meaning, and meaning must not change with the palette.
 */

const TIER_STYLE: Record<MatchTier, { text: string; fill: string }> = {
  high: { text: "text-emerald-300", fill: "bg-emerald-400" },
  medium: { text: "text-amber-300", fill: "bg-amber-400" },
  low: { text: "text-rose-300", fill: "bg-rose-400" },
};

// Zone widths ARE the thresholds (0–39, 40–69, 70–100), so the bar reads as the rule itself.
const ZONES: { tier: MatchTier; width: string }[] = [
  { tier: "low", width: "40%" },
  { tier: "medium", width: "30%" },
  { tier: "high", width: "30%" },
];

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function downloadMarkdown(result: AnalysisResult, locale: CvLocale) {
  const blob = new Blob([reportToMarkdown(result, locale)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cv-match-report.md";
  a.click();
  URL.revokeObjectURL(url);
}

function TextPanel({
  label,
  placeholder,
  value,
  onChange,
  clearLabel,
  words,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  clearLabel: string;
  words: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="min-h-56 w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm leading-relaxed text-card-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-72"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span aria-live="off">{words}</span>
        <button
          type="button"
          onClick={() => onChange("")}
          disabled={!value}
          aria-label={`${clearLabel} ${label}`}
          className="min-h-11 rounded-md px-2 underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          {clearLabel}
        </button>
      </div>
    </div>
  );
}

function ScoreBlock({ result, locale }: { result: AnalysisResult; locale: CvLocale }) {
  const c = COPY[locale];
  const style = TIER_STYLE[result.tier];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{c.scoreLabel}</p>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span data-testid="match-score" className={cn("text-6xl font-semibold tabular-nums tracking-tight", style.text)}>
          {result.score}%
        </span>
        <span data-testid="match-tier" className={cn("text-xl font-medium", style.text)}>
          {c.tier[result.tier]}
        </span>
      </div>
      <p className="max-w-prose text-sm text-muted-foreground">{c.tierHint[result.tier]}</p>

      <div aria-hidden className="pt-2">
        <div className="relative flex h-3 w-full gap-0.5">
          {ZONES.map((z) => (
            <div
              key={z.tier}
              style={{ width: z.width }}
              className={cn(
                "h-full first:rounded-l-full last:rounded-r-full",
                z.tier === result.tier ? TIER_STYLE[z.tier].fill : "bg-muted-foreground/25"
              )}
            />
          ))}
          <div
            className="absolute -top-1.5 h-6 w-1 -translate-x-1/2 rounded-full bg-foreground shadow-[0_0_0_3px_var(--background)] transition-[left] duration-300 motion-reduce:transition-none"
            style={{ left: `${result.score}%` }}
          />
        </div>
        <div className="mt-2 flex text-xs text-muted-foreground">
          {ZONES.map((z, i) => (
            <span key={z.tier} style={{ width: z.width }} className={cn(i === 2 && "text-right", i === 1 && "text-center")}>
              {c.zones[i]}
            </span>
          ))}
        </div>
      </div>

      {result.method === "keywords" && (
        <p className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">{c.keywordNotice}</p>
      )}
    </div>
  );
}

function SkillList({
  title,
  hits,
  empty,
  kind,
  locale,
}: {
  title: string;
  hits: SkillHit[];
  empty: string;
  kind: "matched" | "missing";
  locale: CvLocale;
}) {
  const c = COPY[locale];
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h3 id={headingId} className="flex items-baseline gap-2 text-base font-semibold">
        {title}
        <span className="text-sm font-normal tabular-nums text-muted-foreground">{hits.length}</span>
      </h3>
      {hits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul aria-label={title} className="flex flex-wrap gap-2">
          {hits.map((h) => {
            const tone =
              kind === "matched"
                ? "bg-emerald-400/10 text-emerald-200 ring-emerald-400/35"
                : h.priority === "required"
                  ? "bg-rose-400/10 text-rose-200 ring-rose-400/40"
                  : "bg-amber-400/10 text-amber-200 ring-amber-400/35";
            return (
              <li
                key={h.skill.id}
                title={`${h.priority === "required" ? c.required : c.preferred}, ${c.mentions(h.jobMentions)}`}
                className={cn("rounded-full px-3 py-1 text-sm ring-1 ring-inset", tone)}
              >
                <span>{h.skill.name}</span>
                {kind === "missing" && h.priority === "preferred" && (
                  <span className="sr-only"> ({c.preferred})</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {kind === "missing" && hits.length > 0 && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-rose-400" />
            {c.required}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-amber-400" />
            {c.preferred}
          </span>
        </p>
      )}
    </section>
  );
}

export function CvMatcher({ className }: { className?: string }) {
  const locale = cvLocale(useLocale());
  const c = COPY[locale];
  const [cv, setCv] = useState("");
  const [job, setJob] = useState("");

  // Typing stays instant on a long paste; the analysis catches up a frame later.
  const deferredCv = useDeferredValue(cv);
  const deferredJob = useDeferredValue(job);
  const result = useMemo(() => analyzeCv(deferredCv, deferredJob), [deferredCv, deferredJob]);
  const groups = result ? groupedRecommendations(result, locale) : [];

  return (
    <div className={cn("space-y-8", className)}>
      <div className="space-y-3 print:hidden">
        <p className="text-sm text-muted-foreground">{c.samplesLabel}</p>
        <div className="flex flex-wrap gap-2">
          {SAMPLES[locale].map((s) => (
            <Button
              key={s.id}
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => {
                setCv(s.cv);
                setJob(s.job);
              }}
            >
              {c.sampleButton(s.label)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 print:hidden">
        <TextPanel
          label={c.cvLabel}
          placeholder={c.cvPlaceholder}
          value={cv}
          onChange={setCv}
          clearLabel={c.clear}
          words={c.words(wordCount(cv))}
        />
        <TextPanel
          label={c.jobLabel}
          placeholder={c.jobPlaceholder}
          value={job}
          onChange={setJob}
          clearLabel={c.clear}
          words={c.words(wordCount(job))}
        />
      </div>

      {!result ? (
        <p className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-muted-foreground">
          {c.emptyState}
        </p>
      ) : (
        <section aria-label={c.reportTitle} className="space-y-10 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-8">
          <ScoreBlock result={result} locale={locale} />

          <div className="grid gap-8 md:grid-cols-2">
            <SkillList title={c.matched} hits={result.matched} empty={c.matchedEmpty} kind="matched" locale={locale} />
            <SkillList title={c.missing} hits={result.missing} empty={c.missingEmpty} kind="missing" locale={locale} />
          </div>

          {groups.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">{c.recommendations}</h2>
              {groups.map(({ group, items }) => (
                <div key={group} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">{c.groups[group]}</h3>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item} className="max-w-prose border-l-2 border-foreground/25 pl-3 text-sm leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 print:hidden">
            {/* Not `bg-primary`: in some palettes the derived primary is too dark to carry
                text. Foreground on background is the one pair the build checks for AA. */}
            <Button
              type="button"
              className="h-11 bg-foreground text-background hover:bg-foreground/90"
              onClick={() => downloadMarkdown(result, locale)}
            >
              <Download aria-hidden />
              {c.exportMarkdown}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => window.print()}>
              <Printer aria-hidden />
              {c.print}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
