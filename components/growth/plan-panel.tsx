"use client";

import { Button } from "@/components/ui/button";
import { Figure } from "@/components/studio/ui";
import type { GrowthCopy, Pillar } from "@/lib/growth/copy";
import { IDEAS, ideaContent, planProgress, slotDone, weekPlan, type Idea } from "@/lib/growth/plan";
import type { ScenarioContent } from "@/lib/studio/channels";
import type { PublishLogEntry } from "@/lib/studio/publish";
import { cn } from "@/lib/utils";

const PILLARS: Pillar[] = ["educational", "brand", "value", "proof"];

interface Props {
  copy: GrowthCopy;
  /** The Monday on screen, or "" before the browser's clock is known. */
  week: string;
  thisWeek: string;
  onWeek: (offset: number) => void;
  log: readonly PublishLogEntry[];
  coupon: string;
  pickedRef: string | null;
  onPick: (content: ScenarioContent) => void;
}

/** The week's seven slots, then the whole idea bank by pillar. */
export function PlanPanel({ copy, week, thisWeek, onWeek, log, coupon, pickedRef, onPick }: Props) {
  const c = copy.plan;
  const plan = week ? weekPlan(week) : [];
  const progress = week ? planProgress(week, log, plan) : { done: 0, total: 0 };
  const offset = week && thisWeek ? Math.round((new Date(`${week}T00:00:00Z`).getTime() - new Date(`${thisWeek}T00:00:00Z`).getTime()) / (7 * 86_400_000)) : 0;

  const pick = (idea: Idea) => onPick(ideaContent(idea, copy, { coupon }));

  return (
    <div className="space-y-8" data-testid="plan-panel">
      <div>
        <h2 className="text-lg font-semibold">{c.heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{c.intro}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="h-9" onClick={() => onWeek(offset - 1)} disabled={!week}>
          ← {c.prevWeek}
        </Button>
        <span className="text-sm font-medium tabular-nums" data-testid="plan-week">
          {week ? c.week(week) : "…"}
        </span>
        <Button type="button" variant="outline" className="h-9" onClick={() => onWeek(offset + 1)} disabled={!week}>
          {c.nextWeek} →
        </Button>
        {offset !== 0 && (
          <Button type="button" variant="ghost" className="h-9" onClick={() => onWeek(0)}>
            {c.thisWeek}
          </Button>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Figure label={c.done} value={String(progress.done)} accent />
        <Figure label={c.todo} value={String(Math.max(0, progress.total - progress.done))} />
        <Figure label={c.heading} value={week ? `${progress.done} / ${progress.total}` : "…"} />
      </dl>
      {week && (
        <p className="text-sm text-muted-foreground" data-testid="plan-progress">
          {c.progress(progress.done, progress.total)}
        </p>
      )}

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={c.heading}>
        {plan.map(({ slot, idea, date }) => {
          const words = c.ideas[idea.id];
          const done = slotDone(idea.id, week, log);
          const picked = pickedRef === idea.id;
          return (
            <li key={idea.id} data-testid="plan-slot" data-idea={idea.id} data-done={done} className={cn("flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4", done ? "border-primary/50" : "border-border/60")}>
              <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{copy.days[slot.day]}</span>
                <span className="tabular-nums">{date}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px] uppercase tracking-wide">
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{copy.kinds[idea.kind]}</span>
                <span className="rounded-full border border-border/60 px-2 py-0.5 text-muted-foreground">{copy.pillars[idea.pillar]}</span>
                {done && <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">{c.done}</span>}
              </div>
              <p className="font-medium leading-snug">{words?.hook ?? idea.id}</p>
              <p className="text-xs text-muted-foreground">
                {c.recommended}: {idea.channels.map((ch) => copy.channels[ch]).join(" · ")}
              </p>
              <Button type="button" variant={picked ? "secondary" : "outline"} className="mt-auto h-9" onClick={() => pick(idea)} aria-pressed={picked}>
                {picked ? c.picked : c.pick}
              </Button>
            </li>
          );
        })}
      </ol>

      <p className="text-sm text-muted-foreground">
        {c.daily} {c.captionRule}
      </p>

      <div>
        <h3 className="text-base font-semibold">{c.ideaBank}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{c.ideaBankIntro}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <section key={pillar} aria-label={copy.pillars[pillar]} className="min-w-0 rounded-xl border border-border/60 bg-card p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{copy.pillars[pillar]}</h4>
              <ul className="mt-2 divide-y divide-border/60">
                {IDEAS.filter((i) => i.pillar === pillar).map((idea) => (
                  <li key={idea.id} className="flex items-center justify-between gap-3 py-2" data-testid="idea" data-idea={idea.id}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.ideas[idea.id]?.hook ?? idea.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {copy.kinds[idea.kind]} · {idea.channels.map((ch) => copy.channels[ch]).join(", ")}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => pick(idea)} aria-pressed={pickedRef === idea.id}>
                      {pickedRef === idea.id ? c.picked : c.pick}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
