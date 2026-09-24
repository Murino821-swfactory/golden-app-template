"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Brain, Briefcase, CalendarDays, Check, Dumbbell, HeartHandshake, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCheckinLog } from "@/hooks/use-checkin-log";
import {
  NOTE_MAX,
  PILLARS,
  addDays,
  consistency,
  isValidDay,
  monthHeat,
  streak,
  weekBalance,
  type DayKey,
  type PillarId,
} from "@/lib/checkin-engine";
import { COPY, checkinLocale } from "@/lib/checkin-copy";
import { BalanceRadar, MonthHeatmap } from "./checkin-charts";

/**
 * Daily five-pillar check-in (OTH-84): one tap per pillar, a note per day, streaks per
 * pillar and overall, 7/30-day consistency, the week as a pentagon and the month as a grid.
 * Saved in this browser only — no sign-in needed, nothing sent anywhere.
 */

const ICON: Record<PillarId, LucideIcon> = {
  work: Briefcase,
  fitness: Dumbbell,
  mind: Brain,
  relationships: HeartHandshake,
  habits: Repeat,
};

function dayDate(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function NoteField({
  initial,
  label,
  placeholder,
  saved,
  onSave,
}: {
  initial: string;
  label: string;
  placeholder: string;
  saved: string;
  onSave: (note: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const latest = useRef({ draft, initial, onSave });
  useEffect(() => {
    latest.current = { draft, initial, onSave };
  });

  // Save a moment after typing stops, on blur, and when the day changes (unmount) —
  // never on each keystroke, which would trim the space you just typed.
  useEffect(() => {
    if (draft.trim() === initial) return;
    const t = setTimeout(() => latest.current.onSave(draft), 600);
    return () => clearTimeout(t);
  }, [draft, initial]);
  useEffect(
    () => () => {
      const { draft: d, initial: i, onSave: save } = latest.current;
      if (d.trim() !== i) save(d);
    },
    []
  );

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        value={draft}
        maxLength={NOTE_MAX}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() !== initial && onSave(draft)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-sm leading-relaxed text-card-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p className="flex justify-between text-xs text-muted-foreground">
        <span>{saved}</span>
        <span className="tabular-nums">
          {draft.length}/{NOTE_MAX}
        </span>
      </p>
    </div>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10", className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function DailyCheckin({ className }: { className?: string }) {
  const locale = checkinLocale(useLocale());
  const c = COPY[locale];
  const { log, today, ready, persistent, toggle, setNote } = useCheckinLog();
  const [picked, setPicked] = useState<DayKey | null>(null);
  const dateInputId = useId();
  const baseId = useId();

  if (!ready || today === null) {
    return (
      <div className={cn("space-y-3", className)} aria-busy="true">
        {PILLARS.map((p) => (
          <Skeleton key={p.id} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const selected = picked ?? today;
  const yesterday = addDays(today, -1);
  const entry = log[selected];
  const done = entry?.done ?? [];

  const fmt = (key: DayKey, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(c.intl, opts).format(dayDate(key));
  const sameYear = selected.slice(0, 4) === today.slice(0, 4);
  const selectedLabel = fmt(selected, {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });

  const overall = streak(log, today, "all");
  const week = weekBalance(log, selected, today);
  const weekRange = `${fmt(week.start, { month: "short", day: "numeric" })} – ${fmt(week.end, { month: "short", day: "numeric" })}`;
  const heat = monthHeat(log, selected, today);

  const pick = (key: DayKey) => {
    if (isValidDay(key) && key <= today) setPicked(key === today ? null : key);
  };

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start", className)}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: today, label: c.today },
            { key: yesterday, label: c.yesterday },
          ].map(({ key, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={selected === key}
              onClick={() => pick(key)}
              className={cn(
                "h-11 rounded-full px-4 text-sm font-medium ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected === key ? "bg-foreground text-background ring-foreground" : "ring-border hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
          <label
            htmlFor={dateInputId}
            className="flex h-11 items-center gap-2 rounded-full px-3 text-sm ring-1 ring-inset ring-border focus-within:ring-2 focus-within:ring-ring"
          >
            <CalendarDays aria-hidden className="size-4 text-muted-foreground" />
            <span className="sr-only">{c.pickDate}</span>
            <input
              id={dateInputId}
              type="date"
              value={selected}
              max={today}
              onChange={(e) => pick(e.target.value)}
              className="bg-transparent text-sm text-foreground [color-scheme:dark] focus:outline-none"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <p data-testid="selected-day" className="text-2xl font-semibold tracking-tight">
            {selectedLabel}
          </p>
          <p data-testid="day-progress" className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {c.dayProgress(done.length)}
          </p>
        </div>

        <ul className="space-y-2.5">
          {PILLARS.map(({ id }) => {
            const Icon = ICON[id];
            const isDone = done.includes(id);
            const s = streak(log, today, id);
            const streakId = `${baseId}-streak-${id}`;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={isDone}
                  aria-label={c.pillars[id]}
                  aria-describedby={streakId}
                  onClick={() => toggle(selected, id)}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-4 rounded-xl px-4 py-3 text-left ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isDone ? "bg-primary/15 ring-primary/60" : "bg-card ring-border hover:bg-muted"
                  )}
                >
                  <Icon aria-hidden className={cn("size-6 shrink-0", isDone ? "text-primary" : "text-muted-foreground")} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold leading-tight">{c.pillars[id]}</span>
                    <span id={streakId} data-testid={`streak-${id}`} className="block text-sm text-muted-foreground">
                      {c.streak(s.current, s.best)}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full ring-2 ring-inset transition-colors",
                      isDone ? "bg-primary text-background ring-primary" : "ring-muted-foreground/40"
                    )}
                  >
                    {isDone && <Check className="size-5" strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <NoteField
          key={selected}
          initial={entry?.note ?? ""}
          label={c.noteLabel}
          placeholder={c.notePlaceholder}
          saved={persistent ? c.saved : c.storageBlocked}
          onSave={(note) => setNote(selected, note)}
        />
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel title={c.overallTitle}>
            <p className="text-4xl font-semibold tabular-nums">{overall.current}</p>
            <p className="text-sm text-muted-foreground">{c.overallBody(overall.current, overall.best)}</p>
          </Panel>
          <Panel title={c.consistencyTitle}>
            {[
              { days: 7, label: c.last7 },
              { days: 30, label: c.last30 },
            ].map(({ days, label }) => {
              const pct = consistency(log, today, days);
              return (
                <div key={days} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span data-testid={`consistency-${days}`} className="font-semibold tabular-nums">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted-foreground/15">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </Panel>
        </div>

        <Panel title={`${c.balanceTitle}, ${weekRange}`}>
          <BalanceRadar
            values={week.values}
            labels={c.pillars}
            ariaLabel={c.balanceAria(
              weekRange,
              PILLARS.map(({ id }) => `${c.pillars[id]} ${Math.round(week.values[id] * 100)}%`).join(", ")
            )}
          />
        </Panel>

        <Panel title={fmt(heat.month, { month: "long", year: "numeric" })}>
          <MonthHeatmap
            weeks={heat.weeks}
            today={today}
            selected={selected}
            onSelect={pick}
            cellLabel={(cell) => c.heatCell(fmt(cell.key, { month: "long", day: "numeric" }), cell.count)}
            weekdayLabels={c.weekdays}
            less={c.monthLess}
            more={c.monthMore}
          />
        </Panel>
      </div>
    </div>
  );
}
