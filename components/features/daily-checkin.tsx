"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  Brain,
  Briefcase,
  CalendarDays,
  Check,
  Cloud,
  CloudOff,
  Dumbbell,
  Flame,
  HeartHandshake,
  Repeat,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCheckinLog, type CloudState } from "@/hooks/use-checkin-log";
import {
  NOTE_MAX,
  PILLARS,
  SCOPES,
  addDays,
  badges,
  consistency,
  focusPillar,
  isValidDay,
  level,
  monthHeat,
  streak,
  weekBalance,
  weekRecap,
  xp,
  xpOfDay,
  type DayKey,
  type PillarId,
  type StreakInfo,
} from "@/lib/checkin-engine";
import { COPY, checkinLocale } from "@/lib/checkin-copy";
import { config } from "@/lib/prototype-config";
import { localePath } from "@/lib/locale-routing";
import { publicUrl } from "@/lib/seo";
import { BalanceRadar, MonthHeatmap } from "./checkin-charts";
import { TrophyCase } from "./checkin-trophies";
import { ShareButton } from "./checkin-share";
import { ReminderButton } from "./checkin-reminder";
import { InstallHint } from "./checkin-install";

/**
 * Daily five-pillar check-in (OTH-84): one tap per pillar, a note per day, streaks per
 * pillar and overall, 7/30-day consistency, the week as a pentagon and the month as a grid.
 *
 * The motivation layer (2026-10-13, research in sw-factory
 * docs/decisions/2026-10-13-unbroken-gamification.md): shields that make "one missed day
 * won't break you" literally true, XP and levels, a trophy case, today's focus, a weekly
 * recap, a full-day celebration, a comeback banner, a share card, a calendar reminder and
 * an install hint. Saved in this browser, synced to the account once signed in.
 */

const ICON: Record<PillarId, LucideIcon> = {
  work: Briefcase,
  fitness: Dumbbell,
  mind: Brain,
  relationships: HeartHandshake,
  habits: Repeat,
};

const CELEBRATION_MS = 2600;

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

function Panel({
  title,
  children,
  className,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section data-testid={testId} className={cn("space-y-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10", className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Confetti for a full day: a few dozen falling flakes in the palette's colours, CSS only,
 * and nothing at all for visitors who asked for reduced motion. */
function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    left: (i * 37) % 100,
    delay: (i % 7) * 0.12,
    duration: 1.6 + (i % 5) * 0.25,
    size: 6 + (i % 3) * 3,
    tone: i % 3,
  }));
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden motion-reduce:hidden" data-testid="confetti">
      <style>{`@keyframes unbroken-confetti{0%{transform:translateY(-10vh) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(540deg);opacity:0}}`}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          className={cn("absolute top-0 rounded-sm", p.tone === 0 ? "bg-primary" : p.tone === 1 ? "bg-foreground" : "bg-primary/60")}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            animation: `unbroken-confetti ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

function ShieldRow({ info, label, hint }: { info: StreakInfo; label: string; hint?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground" title={hint}>
      {Array.from({ length: info.shields }, (_, i) => (
        <Shield key={i} aria-hidden className="size-4 fill-primary/30 text-primary" />
      ))}
      <span>{label}</span>
    </span>
  );
}

function cloudLine(state: CloudState, c: (typeof COPY)["en"]): string {
  switch (state) {
    case "syncing":
      return c.cloudSyncing;
    case "synced":
      return c.cloudSynced;
    case "unavailable":
      return c.cloudUnavailable;
    case "error":
      return c.cloudError;
    default:
      return c.cloudSignedOut;
  }
}

export function DailyCheckin({ className }: { className?: string }) {
  const rawLocale = useLocale();
  const locale = checkinLocale(rawLocale);
  const c = COPY[locale];
  const { log, today, ready, persistent, cloud, signedIn, toggle, setNote } = useCheckinLog();
  const [picked, setPicked] = useState<DayKey | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateInputId = useId();
  const baseId = useId();

  useEffect(
    () => () => {
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    },
    []
  );

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
  const empty = Object.keys(log).length === 0;

  const fmt = (key: DayKey, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(c.intl, opts).format(dayDate(key));
  const sameYear = selected.slice(0, 4) === today.slice(0, 4);
  const selectedLabel = fmt(selected, {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const shortDate = (key: DayKey) => fmt(key, { month: "short", day: "numeric" });

  const overall = streak(log, today, "all");
  const perPillar = Object.fromEntries(PILLARS.map(({ id }) => [id, streak(log, today, id)])) as Record<PillarId, StreakInfo>;
  const totalXp = xp(log, today);
  const lvl = level(totalXp);
  const focus = focusPillar(log, today);
  const earned = badges(log, today);
  const recap = weekRecap(log, today);
  const hasRecap = Object.keys(log).some((k) => k <= recap.end && log[k]!.done.length > 0);
  const week = weekBalance(log, selected, today);
  const weekRange = `${shortDate(week.start)} – ${shortDate(week.end)}`;
  const heat = monthHeat(log, selected, today);

  // Yesterday went by without a tap, and there is history before it: a comeback, not a reset.
  const missedYesterday = !empty && (log[yesterday]?.done.length ?? 0) === 0 && Object.keys(log).some((k) => k < yesterday && log[k]!.done.length > 0);
  const shieldedYesterday = SCOPES.some((scope) => streak(log, today, scope).protectedDays.includes(yesterday));
  const comeback = missedYesterday && (log[today]?.done.length ?? 0) < PILLARS.length;

  const pick = (key: DayKey) => {
    if (isValidDay(key) && key <= today) setPicked(key === today ? null : key);
  };

  const tap = (pillar: PillarId) => {
    const completes = selected === today && !done.includes(pillar) && done.length === PILLARS.length - 1;
    toggle(selected, pillar);
    if (completes) {
      setCelebrating(true);
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
      celebrationTimer.current = setTimeout(() => setCelebrating(false), CELEBRATION_MS);
    }
  };

  const liveStreak = overall.current > 0 ? overall.current : Math.max(...PILLARS.map(({ id }) => perPillar[id].current));
  const checkinUrl = publicUrl(rawLocale, "/checkin");
  const shareData = {
    appName: config.appName,
    streak: liveStreak,
    levelName: c.levelName[lvl.id],
    pillars: PILLARS.map(({ id }) => ({ id, label: c.pillars[id], streak: perPillar[id].current })),
    log,
    today,
    url: checkinUrl,
  };

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start", className)}>
      {celebrating && <Confetti />}

      <div className="space-y-5">
        {empty && (
          <section data-testid="first-run" className="space-y-3 rounded-xl bg-primary/10 p-5 ring-1 ring-primary/40">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Sparkles aria-hidden className="size-5 text-primary" />
              {c.firstRunTitle}
            </h2>
            <ol className="space-y-2 text-sm text-foreground/90">
              {c.firstRunSteps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {comeback && (
          <section data-testid="comeback" className="flex gap-3 rounded-xl bg-card p-5 ring-1 ring-primary/50">
            <Shield aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">{c.comebackTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{shieldedYesterday ? c.comebackShielded : c.comebackFresh}</p>
            </div>
          </section>
        )}

        {celebrating && (
          <section role="status" data-testid="celebration" className="flex gap-3 rounded-xl bg-primary/15 p-5 ring-1 ring-primary/60">
            <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">{c.celebrate}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.celebrateBody(xpOfDay(log[today]))}</p>
            </div>
          </section>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10" data-testid="hero-streak">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Flame aria-hidden className="size-4 text-primary" />
              {c.overallTitle}
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums">{overall.current}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.overallBody(overall.current, overall.best)}</p>
            <p className="mt-2" data-testid="shields-all">
              <ShieldRow info={overall} label={c.shields(overall.shields)} hint={c.shieldsHint} />
            </p>
          </section>
          <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10" data-testid="level">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {c.levelTitle} {lvl.number}
            </p>
            <p className="mt-1 text-2xl font-semibold" data-testid="level-name">
              {c.levelName[lvl.id]}
            </p>
            <div className="mt-2 h-2 rounded-full bg-muted-foreground/15">
              <div className="h-2 rounded-full bg-primary transition-all duration-500 motion-reduce:transition-none" style={{ width: `${Math.round(lvl.progress * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-xs tabular-nums text-muted-foreground" data-testid="xp">
              {lvl.span && lvl.next ? c.levelProgress(lvl.into, lvl.span, c.levelName[lvl.next]) : c.levelTop} · {c.xpTotal(totalXp)}
            </p>
          </section>
          <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10" data-testid="focus">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Target aria-hidden className="size-4 text-primary" />
              {c.focusTitle}
            </p>
            <p className="mt-1 text-sm leading-snug">{empty ? c.focusEmpty : focus ? c.focusBody(c.pillars[focus]) : c.focusBalanced}</p>
          </section>
        </div>

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
            const s = perPillar[id];
            const streakId = `${baseId}-streak-${id}`;
            const isFocus = focus === id && !empty;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={isDone}
                  aria-label={c.pillars[id]}
                  aria-describedby={streakId}
                  onClick={() => tap(id)}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-4 rounded-xl px-4 py-3 text-left ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isDone ? "bg-primary/15 ring-primary/60" : "bg-card ring-border hover:bg-muted"
                  )}
                >
                  <Icon aria-hidden className={cn("size-6 shrink-0", isDone ? "text-primary" : "text-muted-foreground")} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-lg font-semibold leading-tight">
                      {c.pillars[id]}
                      {isFocus && <Target aria-hidden className="size-4 text-primary" />}
                    </span>
                    <span id={streakId} className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                      <span data-testid={`streak-${id}`}>{c.streak(s.current, s.best)}</span>
                      {s.shields > 0 && (
                        <span data-testid={`shields-${id}`}>
                          <ShieldRow info={s} label={c.shields(s.shields)} hint={c.shieldsHint} />
                        </span>
                      )}
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
        <p className="text-xs text-muted-foreground">{c.xpHint}</p>

        <NoteField
          key={selected}
          initial={entry?.note ?? ""}
          label={c.noteLabel}
          placeholder={c.notePlaceholder}
          saved={persistent ? c.saved : c.storageBlocked}
          onSave={(note) => setNote(selected, note)}
        />

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <ShareButton data={shareData} locale={locale} />
            <ReminderButton today={today} url={checkinUrl} locale={locale} />
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground" data-testid="cloud-status" data-cloud={cloud}>
            {signedIn ? <Cloud aria-hidden className="size-4" /> : <CloudOff aria-hidden className="size-4" />}
            <span>{cloudLine(cloud, c)}</span>
            {!signedIn && config.patterns.authGoogle !== undefined && (
              <Link href={localePath(rawLocale, "/login")} className="font-medium text-primary underline-offset-4 hover:underline">
                {c.cloudSignIn}
              </Link>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-6">
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

        <Panel title={c.trophiesTitle} testId="trophies">
          <TrophyCase badges={earned} locale={locale} formatDate={shortDate} />
        </Panel>

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

        <Panel title={c.recapTitle(`${shortDate(recap.start)} – ${shortDate(recap.end)}`)} testId="recap">
          {hasRecap ? (
            <div className="space-y-2 text-sm">
              <p data-testid="recap-total">{c.recapTotal(recap.total, recap.previous)}</p>
              <p className="text-muted-foreground">{c.recapFullDays(recap.fullDays)}</p>
              {recap.strongest.length > 0 && <p className="text-muted-foreground">{c.recapStrongest(recap.strongest.map((id) => c.pillars[id]).join(", "))}</p>}
              {recap.weakest.length > 0 && <p className="text-muted-foreground">{c.recapWeakest(recap.weakest.map((id) => c.pillars[id]).join(", "))}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{c.recapNone}</p>
          )}
        </Panel>

        <InstallHint locale={locale} visible={!empty} />
      </div>
    </div>
  );
}
