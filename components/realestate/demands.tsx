"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useCopy, useCurrentAgent, useLookups, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { useSelected } from "@/hooks/use-selected";
import { markDemandContacted, setDemandStatus } from "@/lib/realestate/actions";
import { formatDate, formatDateTime, formatMoney } from "@/lib/realestate/format";
import { hoursSince, isUnanswered, matchesForDemand } from "@/lib/realestate/metrics";
import { DEMAND_STATUSES, TRANSACTIONS, fullName, type Demand, type DemandStatus, type Transaction } from "@/lib/realestate/model";
import { DealForm } from "./deal-form";
import { DemandForm } from "./demand-form";
import { ViewingForm } from "./viewing-form";
import { DemandStatusPill, Money, PropertyFacts, PropertyStatusPill, RecordLink, ScorePill, Timeline, useActionLabels, useAgentName, useNow } from "./shared";
import { Checkbox, DataList, Definition, Drawer, EmptyState, Field, PageHeader, Panel, Pill, PrimaryButton, SecondaryButton, Select, TextArea, TextInput, type Column } from "./ui";

function DemandDetail({ demand, onEdit }: { demand: Demand; onEdit: () => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const agentName = useAgentName();
  const now = useNow();
  const [viewingProperty, setViewingProperty] = useState<string | null>(null);
  const [dealProperty, setDealProperty] = useState<string | null>(null);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const matches = useMemo(() => (ws ? matchesForDemand(ws, demand) : []), [ws, demand]);
  if (!ws) return null;
  const t = c.demands.detail;
  const contact = lookups.contact(demand.contactId);
  const about = demand.propertyId ? lookups.property(demand.propertyId) : undefined;
  const activities = ws.activities.filter((a) => (a.link?.kind === "demand" && a.link.id === demand.id) || (a.link?.kind === "contact" && a.link.id === demand.contactId));
  const unanswered = isUnanswered(demand, now, ws.settings.leadSlaHours);
  const open = demand.status !== "won" && demand.status !== "lost";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{contact ? <RecordLink link={{ kind: "contact", id: contact.id }}>{fullName(contact)}</RecordLink> : "—"}</p>
          <p className="text-sm text-muted-foreground">{contact?.phone} · {contact?.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <DemandStatusPill status={demand.status} />
            <Pill>{c.transaction[demand.transaction]}</Pill>
            <Pill>{c.source[demand.source]}</Pill>
            {demand.firstResponseAt ? <Pill tone="good">{t.responded(formatDateTime(demand.firstResponseAt, locale))}</Pill> : <Pill tone={unanswered ? "bad" : "warn"}>{t.unanswered(Math.floor(hoursSince(demand.receivedAt, now)))}</Pill>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={onEdit}>{c.common.edit}</SecondaryButton>
          {!demand.firstResponseAt && <PrimaryButton onClick={() => markDemandContacted(demand.id, labels)}>{t.markContacted}</PrimaryButton>}
          {open && <SecondaryButton onClick={() => setLostOpen(true)}>{t.markLost}</SecondaryButton>}
        </div>
      </div>

      <Field label={t.status}>{(id) => <Select id={id} value={demand.status} onChange={(e) => setDemandStatus(demand.id, e.target.value as DemandStatus, labels)}>{DEMAND_STATUSES.map((s) => <option key={s} value={s}>{c.demandStatus[s]}</option>)}</Select>}</Field>

      <Panel title={t.criteria}>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Definition label={t.types}>{demand.types.map((x) => c.propertyType[x]).join(", ") || c.common.all}</Definition>
          <Definition label={t.locations}>{demand.locations.join(", ") || c.common.all}</Definition>
          <Definition label={t.budget}>{demand.budgetMin ? t.budgetRange(formatMoney(demand.budgetMin, locale), formatMoney(demand.budgetMax, locale)) : t.budgetUpTo(formatMoney(demand.budgetMax, locale))}{demand.transaction === "rent" ? ` ${c.common.perMonth}` : ""}</Definition>
          <Definition label={t.roomsMin}>{demand.roomsMin ?? c.common.none}</Definition>
          <Definition label={t.areaMin}>{demand.areaMin ? `${demand.areaMin} ${c.common.sqm}` : c.common.none}</Definition>
          <Definition label={t.mustHaves}>{demand.mustHaves.map((f) => c.feature[f]).join(", ") || c.common.none}</Definition>
          <Definition label={c.common.agent}>{agentName(demand.agentId)}</Definition>
          <Definition label={c.demands.columns.received}>{formatDateTime(demand.receivedAt, locale)}</Definition>
          {about && <Definition label={t.aboutListing}><RecordLink link={{ kind: "property", id: about.id }}>{about.title}</RecordLink></Definition>}
          {demand.lostReason && <Definition label={t.lostReason}>{demand.lostReason}</Definition>}
        </dl>
        {demand.notes && <p className="mt-3 text-sm text-muted-foreground">{demand.notes}</p>}
      </Panel>

      <Panel title={t.matches} hint={t.matchesHint} testId="demand-matches">
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noMatches}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {matches.map(({ property, match }) => (
              <li key={property.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <RecordLink link={{ kind: "property", id: property.id }} className="font-medium">{property.title}</RecordLink>
                  <span className="block text-xs"><Money amount={property.price} period={property.transaction} /> · <PropertyFacts property={property} /></span>
                  <span className="mt-1 flex flex-wrap gap-1">{match.reasons.filter((r) => r.criterion !== "transaction").map((r) => <Pill key={r.criterion} tone={r.ok ? (r.partial ? "warn" : "good") : "neutral"} className="px-2 py-0 text-[10px]">{c.matchCriterion[r.criterion]}</Pill>)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <ScorePill score={match.score} />
                  <PropertyStatusPill status={property.status} />
                  {open && <SecondaryButton className="min-h-9 px-3 text-xs" onClick={() => setViewingProperty(property.id)}>{t.scheduleViewing}</SecondaryButton>}
                  {open && <SecondaryButton className="min-h-9 px-3 text-xs" onClick={() => setDealProperty(property.id)}>{t.createDeal}</SecondaryButton>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={c.common.timeline}>
        <Timeline activities={activities} link={{ kind: "demand", id: demand.id }} />
      </Panel>

      <Drawer open={viewingProperty !== null} onOpenChange={(o) => !o && setViewingProperty(null)} title={c.viewings.schedule} closeLabel={c.common.close}>
        {viewingProperty && <ViewingForm propertyId={viewingProperty} contactId={demand.contactId} demandId={demand.id} onDone={() => setViewingProperty(null)} />}
      </Drawer>
      <Drawer open={dealProperty !== null} onOpenChange={(o) => !o && setDealProperty(null)} title={c.deals.create} closeLabel={c.common.close}>
        {dealProperty && <DealForm propertyId={dealProperty} demandId={demand.id} onDone={() => setDealProperty(null)} />}
      </Drawer>
      <Drawer open={lostOpen} onOpenChange={setLostOpen} title={t.markLost} closeLabel={c.common.close}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setDemandStatus(demand.id, "lost", labels, lostReason.trim()); setLostOpen(false); }}>
          <Field label={t.lostReason}>{(id) => <TextArea id={id} value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder={t.lostReasonPlaceholder} className="min-h-20" />}</Field>
          <div className="flex justify-end gap-2"><SecondaryButton onClick={() => setLostOpen(false)}>{c.common.cancel}</SecondaryButton><PrimaryButton type="submit">{t.markLost}</PrimaryButton></div>
        </form>
      </Drawer>
    </div>
  );
}

export function Demands() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const agent = useCurrentAgent(ws);
  const agentName = useAgentName();
  const lookups = useLookups(ws);
  const now = useNow();
  const [selected, setSelected] = useSelected();
  const [editing, setEditing] = useState<"new" | "edit" | null>(null);
  const [status, setStatus] = useState<DemandStatus | "all" | "open">("open");
  const [transaction, setTransaction] = useState<Transaction | "all">("all");
  const [mine, setMine] = useState(false);
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    if (!ws) return [];
    const q = query.trim().toLocaleLowerCase();
    return ws.demands
      .filter((d) => (status === "all" || (status === "open" ? d.status !== "won" && d.status !== "lost" : d.status === status)) && (transaction === "all" || d.transaction === transaction) && (!mine || d.agentId === agent?.id))
      .filter((d) => !q || `${fullName(lookups.contact(d.contactId) ?? { firstName: "", lastName: "" })} ${d.locations.join(" ")}`.toLocaleLowerCase().includes(q))
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }, [ws, status, transaction, mine, query, agent, lookups]);
  if (!ws) return null;
  const current = selected ? ws.demands.find((d) => d.id === selected) ?? null : null;
  const looking = (d: Demand) => `${d.types.map((x) => c.propertyType[x]).join(", ")} · ${d.locations.slice(0, 2).join(", ")}`;
  const columns: Column<Demand>[] = [
    { key: "contact", label: c.demands.columns.contact, render: (d) => { const x = lookups.contact(d.contactId); return <span className="block"><span className="block font-medium">{x ? fullName(x) : "—"}</span><span className="block text-xs text-muted-foreground">{c.source[d.source]}</span></span>; } },
    { key: "looking", label: c.demands.columns.looking, render: (d) => <span className="text-muted-foreground">{c.transaction[d.transaction]} · {looking(d)}</span> },
    { key: "budget", label: c.demands.columns.budget, className: "text-right", render: (d) => <Money amount={d.budgetMax} period={d.transaction} /> },
    { key: "status", label: c.demands.columns.status, render: (d) => <span className="flex items-center gap-1.5"><DemandStatusPill status={d.status} />{isUnanswered(d, now, ws.settings.leadSlaHours) && <Pill tone="bad">!</Pill>}</span> },
    { key: "received", label: c.demands.columns.received, render: (d) => <span className="text-muted-foreground">{formatDate(d.receivedAt, locale)}</span> },
    { key: "agent", label: c.demands.columns.agent, render: (d) => <span className="text-muted-foreground">{agentName(d.agentId)}</span> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={c.demands.title} intro={c.demands.intro} actions={<PrimaryButton onClick={() => setEditing("new")}><Plus aria-hidden />{c.demands.add}</PrimaryButton>} />
      <div className="flex flex-wrap items-end gap-3">
        <Field label={c.demands.filters.search} className="min-w-56 flex-1">{(id) => <TextInput id={id} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.common.search} />}</Field>
        <Field label={c.demands.filters.status}>{(id) => <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as DemandStatus | "all" | "open")}><option value="open">{c.dealStatus.open}</option><option value="all">{c.common.all}</option>{DEMAND_STATUSES.map((s) => <option key={s} value={s}>{c.demandStatus[s]}</option>)}</Select>}</Field>
        <Field label={c.demands.filters.transaction}>{(id) => <Select id={id} value={transaction} onChange={(e) => setTransaction(e.target.value as Transaction | "all")}><option value="all">{c.common.all}</option>{TRANSACTIONS.map((t) => <option key={t} value={t}>{c.transaction[t]}</option>)}</Select>}</Field>
        {ws.settings.mode === "agency" && <div className="pb-2"><Checkbox label={c.demands.filters.mine} checked={mine} onChange={setMine} /></div>}
      </div>
      {rows.length === 0 ? (
        <EmptyState title={c.demands.empty} />
      ) : (
        <DataList rows={rows} columns={columns} onOpen={(d) => setSelected(d.id)} openLabel={c.common.open} ariaLabel={c.demands.title} testId="demands-list"
          renderCard={(d) => { const x = lookups.contact(d.contactId); return (
            <span className="block space-y-1.5">
              <span className="flex items-start justify-between gap-2"><span className="font-medium">{x ? fullName(x) : "—"}</span><Money amount={d.budgetMax} period={d.transaction} /></span>
              <span className="block text-xs text-muted-foreground">{c.transaction[d.transaction]} · {looking(d)}</span>
              <span className="flex flex-wrap gap-1.5"><DemandStatusPill status={d.status} /><Pill>{c.source[d.source]}</Pill></span>
            </span>
          ); }}
        />
      )}
      <Drawer open={current !== null && editing === null} onOpenChange={(o) => !o && setSelected(null)} title={current ? `${c.nav.demands}: ${fullName(lookups.contact(current.contactId) ?? { firstName: "", lastName: "" })}` : ""} description={current ? looking(current) : undefined} closeLabel={c.common.close} wide testId="demand-drawer">
        {current && <DemandDetail demand={current} onEdit={() => setEditing("edit")} />}
      </Drawer>
      <Drawer open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === "edit" ? c.demands.edit : c.demands.add} closeLabel={c.common.close}>
        {editing && <DemandForm existing={editing === "edit" ? current : null} contactId={null} onDone={(id) => { setEditing(null); if (id) setSelected(id); }} />}
      </Drawer>
    </div>
  );
}
