"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ArrowRightLeft, Mail, MessageSquare, Phone, Sparkles, Users } from "lucide-react";
import { useCopy } from "@/hooks/use-workspace";
import { localePath } from "@/lib/locale-routing";
import { addNote } from "@/lib/recruiting/actions";
import type { Activity, ActivityType, ApplicationStage, Consent } from "@/lib/recruiting/model";
import { daysBetween, isoDate } from "@/lib/recruiting/model";
import { formatDateTime } from "@/lib/recruiting/metrics";
import { cn } from "@/lib/utils";
import { Pill, PrimaryButton, STAGE_TONE, Select, TextArea, scoreTone, type Tone } from "./ui";

/** One `Date` per mount — every "days ago" on a page agrees, and re-renders stay pure. */
export function useNow(): Date {
  return useMemo(() => new Date(), []);
}

export function ScorePill({ score }: { score: number | null }) {
  const c = useCopy();
  return <Pill tone={scoreTone(score)}>{score === null ? c.pipeline.noScore : c.pipeline.score(score)}</Pill>;
}

export function StagePill({ stage }: { stage: ApplicationStage }) {
  const c = useCopy();
  return <Pill tone={STAGE_TONE[stage]}>{c.stages[stage]}</Pill>;
}

export function consentView(consent: Consent, now: Date): { tone: Tone; expiresIn: number | null } {
  if (consent.status === "withdrawn") return { tone: "bad", expiresIn: null };
  if (consent.status === "pending") return { tone: "neutral", expiresIn: null };
  if (!consent.expiresAt) return { tone: "good", expiresIn: null };
  const expiresIn = daysBetween(isoDate(now), consent.expiresAt);
  return { tone: expiresIn < 0 ? "bad" : expiresIn <= 30 ? "warn" : "good", expiresIn };
}

export function ConsentPill({ consent, now }: { consent: Consent; now: Date }) {
  const c = useCopy();
  const { tone, expiresIn } = consentView(consent, now);
  const detail =
    consent.status === "granted" && expiresIn !== null
      ? expiresIn < 0
        ? ` · ${c.candidates.detail.expired}`
        : expiresIn <= 30
          ? ` · ${c.candidates.detail.expiresIn(expiresIn)}`
          : ""
      : "";
  return (
    <Pill tone={tone}>
      {c.consentStatus[consent.status]}
      {detail}
    </Pill>
  );
}

export function RecordLink({ route, id, children, className }: { route: string; id: string; children: ReactNode; className?: string }) {
  const locale = useLocale();
  return (
    <Link href={`${localePath(locale, route)}?id=${id}`} className={cn("underline-offset-4 hover:underline", className)}>
      {children}
    </Link>
  );
}

const ACTIVITY_ICON: Record<ActivityType, typeof Mail> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Users,
  stage: ArrowRightLeft,
  system: Sparkles,
};

/** The timeline of one candidate, job or client, newest first, with a quick note form. */
export function Timeline({ activities, refs, empty }: { activities: Activity[]; refs: { candidateId?: string | null; jobId?: string | null; clientId?: string | null }; empty: string }) {
  const c = useCopy();
  const locale = useLocale();
  const [type, setType] = useState<ActivityType>("note");
  const [text, setText] = useState("");
  const kinds: ActivityType[] = ["note", "call", "email", "meeting"];
  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-start"
        onSubmit={(e) => {
          e.preventDefault();
          addNote(type, text, refs);
          setText("");
        }}
      >
        <Select aria-label={c.activityType.note} value={type} onChange={(e) => setType(e.target.value as ActivityType)} className="sm:w-40">
          {kinds.map((k) => (
            <option key={k} value={k}>{c.activityType[k]}</option>
          ))}
        </Select>
        <TextArea aria-label={c.candidates.detail.addNote} value={text} onChange={(e) => setText(e.target.value)} placeholder={c.candidates.detail.notePlaceholder} className="min-h-11 flex-1 sm:min-h-11" rows={1} />
        <PrimaryButton type="submit" disabled={!text.trim()}>{c.candidates.detail.addNote}</PrimaryButton>
      </form>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ol className="space-y-3">
          {activities.map((a) => {
            const Icon = ACTIVITY_ICON[a.type];
            return (
              <li key={a.id} className="flex gap-3">
                <span aria-hidden className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/10">
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">{a.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.activityType[a.type]} · {formatDateTime(a.at, locale)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function Chips({ items, tone = "neutral", max }: { items: string[]; tone?: Tone; max?: number }) {
  const shown = max ? items.slice(0, max) : items;
  const rest = items.length - shown.length;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((item) => (
        <li key={item}>
          <Pill tone={tone}>{item}</Pill>
        </li>
      ))}
      {rest > 0 && (
        <li>
          <Pill tone="neutral">+{rest}</Pill>
        </li>
      )}
    </ul>
  );
}

export function Definition({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
