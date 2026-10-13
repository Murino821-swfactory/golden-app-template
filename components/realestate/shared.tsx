"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ArrowRightLeft, Mail, MessageSquare, Phone, Sparkles, Users } from "lucide-react";
import { useCopy, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import type { ActionLabels } from "@/lib/realestate/actions";
import { addNote } from "@/lib/realestate/actions";
import { formatDateTime, formatMoney } from "@/lib/realestate/format";
import type { Activity, ActivityType, AmlStatus, ConsentStatus, DealStage, DemandStatus, EntityLink, LinkKind, Property, PropertyStatus, Transaction } from "@/lib/realestate/model";
import { localePath } from "@/lib/locale-routing";
import { cn } from "@/lib/utils";
import { AML_TONE, CONSENT_TONE, DEMAND_TONE, Pill, PrimaryButton, PROPERTY_TONE, STAGE_TONE, Select, TextArea, scoreTone, type Tone } from "./ui";

/** One `Date` per mount — every "days ago" on a page agrees, and re-renders stay pure. */
export function useNow(): Date {
  return useMemo(() => new Date(), []);
}

/** The words the actions write into the timeline, in the language on screen. */
export function useActionLabels(): ActionLabels {
  const c = useCopy();
  const locale = useWorkspaceLocale();
  return useMemo<ActionLabels>(
    () => ({
      stageChanged: (stage) => `${c.activityType.stage}: ${c.stage[stage]}`,
      propertyStatus: (status) => `${c.common.status}: ${c.propertyStatus[status]}`,
      priceChanged: (from, to) => `${c.common.price}: ${formatMoney(from, locale)} → ${formatMoney(to, locale)}`,
      portalChanged: (portal, state) => `${c.portal[portal]}: ${c.syndication[state]}`,
      viewingScheduled: (property) => `${c.viewings.schedule}: ${property}`,
      viewingOutcome: (outcome) => `${c.viewings.outcome}: ${c.viewingOutcome[outcome]}`,
      viewingStatus: (status) => `${c.nav.viewings}: ${c.viewingStatus[status]}`,
      dealCreated: (property) => `${c.deals.create}: ${property}`,
      dealLost: (reason) => `${c.deals.lost}: ${reason}`,
      dealClosed: (property) => `${c.deals.won}: ${property}`,
      demandStatus: (status) => `${c.nav.demands}: ${c.demandStatus[status]}`,
      demandContacted: c.demands.detail.markContacted,
      consent: (status) => c.consentStatus[status],
      amlIdentified: `AML: ${c.amlStatus.identified}`,
      amlVerified: `AML: ${c.amlStatus.verified}`,
      documentCreated: (title) => `${c.documents.generate}: ${title}`,
      documentStatus: (title, status) => `${title}: ${c.docStatus[status]}`,
      templateTitle: (id) => c.template[id],
      leaseCreated: (property) => `${c.rentals.add}: ${property}`,
      paymentMarked: (month) => `${c.rentals.detail.paid}: ${month}`,
      protocolAdded: (kind) => c.protocolKind[kind],
    }),
    [c, locale]
  );
}

export function Money({ amount, period }: { amount: number; period?: Transaction }) {
  const locale = useWorkspaceLocale();
  const c = useCopy();
  return (
    <span className="tabular-nums">
      {formatMoney(amount, locale)}
      {period === "rent" && <span className="text-muted-foreground"> {c.common.perMonth}</span>}
    </span>
  );
}

export function StagePill({ stage }: { stage: DealStage }) {
  const c = useCopy();
  return <Pill tone={STAGE_TONE[stage]}>{c.stage[stage]}</Pill>;
}

export function PropertyStatusPill({ status }: { status: PropertyStatus }) {
  const c = useCopy();
  return <Pill tone={PROPERTY_TONE[status]}>{c.propertyStatus[status]}</Pill>;
}

export function DemandStatusPill({ status }: { status: DemandStatus }) {
  const c = useCopy();
  return <Pill tone={DEMAND_TONE[status]}>{c.demandStatus[status]}</Pill>;
}

export function ConsentPill({ status, expiresIn }: { status: ConsentStatus; expiresIn: number | null }) {
  const c = useCopy();
  const soon = status === "granted" && expiresIn !== null && expiresIn <= 30;
  const tone: Tone = soon ? (expiresIn! < 0 ? "bad" : "warn") : CONSENT_TONE[status];
  const detail = soon ? ` · ${expiresIn! < 0 ? c.contacts.detail.expired : c.contacts.detail.expiresIn(expiresIn!)}` : "";
  return (
    <Pill tone={tone}>
      {c.consentStatus[status]}
      {detail}
    </Pill>
  );
}

export function AmlPill({ status }: { status: AmlStatus }) {
  const c = useCopy();
  return <Pill tone={AML_TONE[status]}>AML · {c.amlStatus[status]}</Pill>;
}

export function ScorePill({ score }: { score: number }) {
  const c = useCopy();
  return <Pill tone={scoreTone(score)}>{c.demands.detail.score(score)}</Pill>;
}

export const ROUTE_FOR: Record<LinkKind, string> = { property: "/workspace/properties", contact: "/workspace/contacts", demand: "/workspace/demands", deal: "/workspace/deals", lease: "/workspace/rentals" };

export function linkHref(locale: string, link: EntityLink): string {
  return `${localePath(locale, ROUTE_FOR[link.kind])}?id=${link.id}`;
}

export function RecordLink({ link, children, className }: { link: EntityLink; children: ReactNode; className?: string }) {
  const locale = useLocale();
  return (
    <Link href={linkHref(locale, link)} className={cn("underline-offset-4 hover:underline", className)}>
      {children}
    </Link>
  );
}

const displayName = (x: { kind: string; company: string; firstName: string; lastName: string }) => (x.kind === "company" && x.company ? x.company : `${x.firstName} ${x.lastName}`);

/** The name a link points at, for lists that mix kinds. */
export function useLinkName(): (link: EntityLink | null) => string {
  const ws = useWorkspace();
  const c = useCopy();
  return useMemo(
    () => (link: EntityLink | null) => {
      if (!ws || !link) return "";
      switch (link.kind) {
        case "property":
          return ws.properties.find((p) => p.id === link.id)?.title ?? "";
        case "contact": {
          const x = ws.contacts.find((p) => p.id === link.id);
          return x ? displayName(x) : "";
        }
        case "demand": {
          const d = ws.demands.find((p) => p.id === link.id);
          const x = d ? ws.contacts.find((p) => p.id === d.contactId) : undefined;
          return x ? `${c.nav.demands}: ${displayName(x)}` : "";
        }
        case "deal": {
          const d = ws.deals.find((p) => p.id === link.id);
          return d ? `${c.linkKind.deal}: ${ws.properties.find((p) => p.id === d.propertyId)?.title ?? ""}` : "";
        }
        case "lease": {
          const l = ws.leases.find((p) => p.id === link.id);
          return l ? `${c.linkKind.lease}: ${ws.properties.find((p) => p.id === l.propertyId)?.title ?? ""}` : "";
        }
      }
    },
    [ws, c]
  );
}

const ACTIVITY_ICON: Record<ActivityType, typeof Mail> = { note: MessageSquare, call: Phone, email: Mail, meeting: Users, stage: ArrowRightLeft, system: Sparkles };

/** The timeline of one record, newest first, with a quick note form. */
export function Timeline({ activities, link, compact }: { activities: Activity[]; link: EntityLink | null; compact?: boolean }) {
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const ws = useWorkspace();
  const [type, setType] = useState<ActivityType>("note");
  const [text, setText] = useState("");
  const kinds: ActivityType[] = ["note", "call", "email", "meeting"];
  const agentName = (id: string) => {
    const a = ws?.agents.find((x) => x.id === id);
    return a ? `${a.firstName} ${a.lastName}` : "";
  };
  return (
    <div className="space-y-4">
      {!compact && (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-start"
          onSubmit={(e) => {
            e.preventDefault();
            addNote(type, text, link);
            setText("");
          }}
        >
          <Select aria-label={c.activityType.note} value={type} onChange={(e) => setType(e.target.value as ActivityType)} className="sm:w-40">
            {kinds.map((k) => (
              <option key={k} value={k}>{c.activityType[k]}</option>
            ))}
          </Select>
          <TextArea aria-label={c.timeline.addNote} value={text} onChange={(e) => setText(e.target.value)} placeholder={c.timeline.placeholder} className="min-h-11 flex-1 sm:min-h-11" rows={1} />
          <PrimaryButton type="submit" disabled={!text.trim()}>{c.timeline.addNote}</PrimaryButton>
        </form>
      )}
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">{c.timeline.empty}</p>
      ) : (
        <ol className="space-y-3">
          {activities.map((a) => {
            const Icon = ACTIVITY_ICON[a.type];
            const who = agentName(a.agentId);
            return (
              <li key={a.id} className="flex gap-3">
                <span aria-hidden className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/10">
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">{a.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.activityType[a.type]} · {formatDateTime(a.at, locale)}
                    {who ? ` · ${who}` : ""}
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

/** "65 m² · 2 rooms · Ružinov" — the one-line summary of a listing. */
export function PropertyFacts({ property }: { property: Property }) {
  const c = useCopy();
  const parts = [`${property.area} ${c.common.sqm}`];
  if (property.rooms > 0) parts.push(`${property.rooms} ${c.common.rooms}`);
  parts.push([property.district, property.city].filter(Boolean).join(", "));
  return <span className="text-muted-foreground">{parts.join(" · ")}</span>;
}

export function useAgentName(): (id: string | null | undefined) => string {
  const ws = useWorkspace();
  return useMemo(
    () => (id) => {
      const a = ws?.agents.find((x) => x.id === id);
      return a ? `${a.firstName} ${a.lastName}` : "—";
    },
    [ws]
  );
}

export function useContactName(): (id: string | null | undefined) => string {
  const ws = useWorkspace();
  return useMemo(
    () => (id) => {
      const x = ws?.contacts.find((p) => p.id === id);
      return x ? displayName(x) : "—";
    },
    [ws]
  );
}
