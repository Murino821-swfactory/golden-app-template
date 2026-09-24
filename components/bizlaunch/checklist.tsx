"use client";

import { CalendarClock, Check, ExternalLink } from "lucide-react";
import { CHECKLISTS, checklistProgress } from "@/lib/data/countries";
import { inLocale } from "@/lib/data/localized";
import type { CountryCode, EntityKind } from "@/lib/data/tax";
import { cn } from "@/lib/utils";
import { COPY, stepsDone } from "./copy";

interface ChecklistProps {
  country: CountryCode;
  entity: EntityKind;
  locale: string;
  done: readonly string[];
  onToggle: (stepId: string) => void;
}

export function Checklist({ country, entity, locale, done, onToggle }: ChecklistProps) {
  const steps = CHECKLISTS[country][entity];
  const ticked = new Set(done);
  const count = steps.filter((step) => ticked.has(step.id)).length;
  const progress = checklistProgress(steps, done);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm">{stepsDone(count, steps.length, locale)}</p>
          <p className="text-2xl font-semibold tabular-nums" data-testid="checklist-progress">
            {progress} %
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label={stepsDone(count, steps.length, locale)}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-foreground motion-safe:transition-[width] motion-safe:duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ol className="relative space-y-3">
        {steps.map((step, index) => {
          const isDone = ticked.has(step.id);
          const inputId = `step-${country}-${entity}-${step.id}`;
          return (
            <li
              key={step.id}
              className={cn(
                "flex gap-3 rounded-lg border bg-background p-4 sm:gap-4",
                isDone && "border-foreground/60"
              )}
            >
              <div className="relative flex shrink-0 flex-col items-center">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={isDone}
                  onChange={() => onToggle(step.id)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={inputId}
                  className={cn(
                    "flex size-10 cursor-pointer items-center justify-center rounded-full border text-sm font-semibold tabular-nums",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-foreground peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                    isDone
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/60 text-foreground hover:border-foreground"
                  )}
                >
                  {isDone ? <Check className="size-4" aria-hidden /> : index + 1}
                  <span className="sr-only">{inLocale(step.title, locale)}</span>
                </label>
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="font-medium leading-snug">
                  {inLocale(step.title, locale)}
                </p>
                <p className="text-sm leading-relaxed">{inLocale(step.detail, locale)}</p>
                {(step.deadline || step.portal) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-sm">
                    {step.deadline && (
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <CalendarClock className="size-4" aria-hidden />
                        {inLocale(step.deadline, locale)}
                      </span>
                    )}
                    {step.portal && (
                      <a
                        href={step.portal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 underline decoration-foreground/50 underline-offset-4 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground rounded-sm"
                      >
                        {step.portal.name}
                        <ExternalLink className="size-3.5" aria-hidden />
                        <span className="sr-only">({inLocale(COPY.opensInNewTab, locale)})</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-xs">{inLocale(COPY.savedHere, locale)}</p>
    </div>
  );
}
