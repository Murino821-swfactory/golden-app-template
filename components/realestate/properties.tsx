"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useCopy, useCurrentAgent, useLookups, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { useSelected } from "@/hooks/use-selected";
import { addProperty, setPortal, setPropertyStatus, togglePropertyDoc, updateProperty, type PropertyInput } from "@/lib/realestate/actions";
import { formatDate, formatMoney, formatNumber } from "@/lib/realestate/format";
import { daysOnMarket, demandsForProperty, livePortals } from "@/lib/realestate/metrics";
import {
  CONDITIONS, ENERGY_CLASSES, FEATURES, PORTALS, PROPERTY_STATUSES, PROPERTY_TYPES, SYNDICATION_CYCLE, TRANSACTIONS, emptyDocuments, emptyPortals, fullName,
  type Feature, type Property, type PropertyStatus, type PropertyType, type Transaction,
} from "@/lib/realestate/model";
import { DealForm } from "./deal-form";
import { ViewingForm } from "./viewing-form";
import { Money, PropertyFacts, PropertyStatusPill, RecordLink, ScorePill, StagePill, Timeline, useActionLabels, useAgentName, useNow } from "./shared";
import { Checkbox, DataList, Definition, Drawer, EmptyState, Field, FormRow, PageHeader, Panel, Pill, PrimaryButton, SYNDICATION_TONE, SecondaryButton, Select, TextArea, TextInput, ToggleGroup, type Column } from "./ui";

// ── Form ─────────────────────────────────────────────────────────────────────────────

type Draft = Omit<PropertyInput, "features" | "portals" | "documents" | "landArea" | "floor" | "totalFloors" | "yearBuilt" | "cadastre" | "exclusivity"> & {
  features: Feature[];
  landArea: string;
  floor: string;
  totalFloors: string;
  yearBuilt: string;
  exclusivityType: "exclusive" | "nonExclusive";
  exclusivityUntil: string;
  titleDeed: string;
  parcel: string;
  municipality: string;
};

function draftFrom(p: Property | null, agentId: string, ownerId: string): Draft {
  return {
    title: p?.title ?? "", transaction: p?.transaction ?? "sale", type: p?.type ?? "apartment", status: p?.status ?? "preparation", price: p?.price ?? 0,
    city: p?.city ?? "Bratislava", district: p?.district ?? "", street: p?.street ?? "", region: p?.region ?? "", area: p?.area ?? 0, rooms: p?.rooms ?? 0,
    condition: p?.condition ?? "good", energyClass: p?.energyClass ?? "missing", features: p?.features ?? [], description: p?.description ?? "", ownerId: p?.ownerId ?? ownerId, agentId: p?.agentId ?? agentId,
    commission: p?.commission ?? { basis: "percent", value: 3 }, listedAt: p?.listedAt ?? new Date().toISOString(), photos: p?.photos ?? 0, notes: p?.notes ?? "",
    landArea: p?.landArea?.toString() ?? "", floor: p?.floor?.toString() ?? "", totalFloors: p?.totalFloors?.toString() ?? "", yearBuilt: p?.yearBuilt?.toString() ?? "",
    exclusivityType: p?.exclusivity.type ?? "nonExclusive", exclusivityUntil: p?.exclusivity.until ?? "", titleDeed: p?.cadastre?.titleDeed ?? "", parcel: p?.cadastre?.parcel ?? "", municipality: p?.cadastre?.municipality ?? "",
  };
}

const num = (s: string): number | null => (s.trim() === "" ? null : Number(s));

function toInput(d: Draft, existing: Property | null): PropertyInput {
  return {
    title: d.title.trim(), transaction: d.transaction, type: d.type, status: d.status, price: Number(d.price) || 0, city: d.city.trim(), district: d.district.trim(), street: d.street.trim(), region: d.region.trim(),
    area: Number(d.area) || 0, landArea: num(d.landArea), rooms: Number(d.rooms) || 0, floor: num(d.floor), totalFloors: num(d.totalFloors), condition: d.condition, energyClass: d.energyClass, yearBuilt: num(d.yearBuilt),
    features: d.features, description: d.description.trim(), ownerId: d.ownerId, agentId: d.agentId, exclusivity: { type: d.exclusivityType, until: d.exclusivityType === "exclusive" && d.exclusivityUntil ? d.exclusivityUntil : null },
    commission: { basis: d.commission.basis, value: Number(d.commission.value) || 0 }, listedAt: d.listedAt, portals: existing?.portals ?? emptyPortals(), documents: existing?.documents ?? emptyDocuments(), photos: Number(d.photos) || 0,
    cadastre: d.titleDeed.trim() ? { titleDeed: d.titleDeed.trim(), parcel: d.parcel.trim(), municipality: d.municipality.trim() } : null, notes: d.notes.trim(),
  };
}

function PropertyForm({ existing, onDone }: { existing: Property | null; onDone: (id: string | null) => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const labels = useActionLabels();
  const agent = useCurrentAgent(ws);
  const [d, setD] = useState<Draft>(() => draftFrom(existing, agent?.id ?? "", ws?.contacts.find((x) => x.roles.includes("owner") || x.roles.includes("landlord"))?.id ?? ""));
  if (!ws) return null;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));
  const f = c.properties.form;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!d.title.trim()) return;
        const input = toInput(d, existing);
        if (existing) {
          updateProperty(existing.id, input, labels);
          onDone(existing.id);
        } else {
          onDone(addProperty(input));
        }
      }}
    >
      <Field label={f.title} required>{(id) => <TextInput id={id} value={d.title} onChange={(e) => set("title", e.target.value)} required />}</Field>
      <FormRow>
        <Field label={f.transaction}>{(id) => <Select id={id} value={d.transaction} onChange={(e) => set("transaction", e.target.value as Transaction)}>{TRANSACTIONS.map((t) => <option key={t} value={t}>{c.transaction[t]}</option>)}</Select>}</Field>
        <Field label={f.type}>{(id) => <Select id={id} value={d.type} onChange={(e) => set("type", e.target.value as PropertyType)}>{PROPERTY_TYPES.map((t) => <option key={t} value={t}>{c.propertyType[t]}</option>)}</Select>}</Field>
        <Field label={d.transaction === "rent" ? f.rent : f.price} required>{(id) => <TextInput id={id} type="number" min={0} value={d.price || ""} onChange={(e) => set("price", Number(e.target.value))} required />}</Field>
        <Field label={f.status}>{(id) => <Select id={id} value={d.status} onChange={(e) => set("status", e.target.value as PropertyStatus)}>{PROPERTY_STATUSES.map((s) => <option key={s} value={s}>{c.propertyStatus[s]}</option>)}</Select>}</Field>
      </FormRow>
      <FormRow>
        <Field label={f.city}>{(id) => <TextInput id={id} value={d.city} onChange={(e) => set("city", e.target.value)} />}</Field>
        <Field label={f.district}>{(id) => <TextInput id={id} value={d.district} onChange={(e) => set("district", e.target.value)} />}</Field>
        <Field label={f.street}>{(id) => <TextInput id={id} value={d.street} onChange={(e) => set("street", e.target.value)} />}</Field>
        <Field label={f.region}>{(id) => <TextInput id={id} value={d.region} onChange={(e) => set("region", e.target.value)} />}</Field>
      </FormRow>
      <FormRow className="sm:grid-cols-3">
        <Field label={f.area} required>{(id) => <TextInput id={id} type="number" min={0} value={d.area || ""} onChange={(e) => set("area", Number(e.target.value))} required />}</Field>
        <Field label={f.landArea}>{(id) => <TextInput id={id} type="number" min={0} value={d.landArea} onChange={(e) => set("landArea", e.target.value)} />}</Field>
        <Field label={f.rooms}>{(id) => <TextInput id={id} type="number" min={0} value={d.rooms} onChange={(e) => set("rooms", Number(e.target.value))} />}</Field>
        <Field label={f.floor}>{(id) => <TextInput id={id} type="number" value={d.floor} onChange={(e) => set("floor", e.target.value)} />}</Field>
        <Field label={f.totalFloors}>{(id) => <TextInput id={id} type="number" value={d.totalFloors} onChange={(e) => set("totalFloors", e.target.value)} />}</Field>
        <Field label={f.yearBuilt}>{(id) => <TextInput id={id} type="number" value={d.yearBuilt} onChange={(e) => set("yearBuilt", e.target.value)} />}</Field>
      </FormRow>
      <FormRow>
        <Field label={f.condition}>{(id) => <Select id={id} value={d.condition} onChange={(e) => set("condition", e.target.value as Draft["condition"])}>{CONDITIONS.map((x) => <option key={x} value={x}>{c.condition[x]}</option>)}</Select>}</Field>
        <Field label={f.energyClass}>{(id) => <Select id={id} value={d.energyClass} onChange={(e) => set("energyClass", e.target.value as Draft["energyClass"])}>{ENERGY_CLASSES.map((x) => <option key={x} value={x}>{c.energyClass[x]}</option>)}</Select>}</Field>
      </FormRow>
      <ToggleGroup label={f.features} options={FEATURES.map((x) => ({ value: x, label: c.feature[x] }))} value={d.features} onChange={(v) => set("features", v)} />
      <Field label={f.description}>{(id) => <TextArea id={id} value={d.description} onChange={(e) => set("description", e.target.value)} />}</Field>
      <FormRow>
        <Field label={f.owner}>{(id) => <Select id={id} value={d.ownerId} onChange={(e) => set("ownerId", e.target.value)}>{ws.contacts.map((x) => <option key={x.id} value={x.id}>{fullName(x)}</option>)}</Select>}</Field>
        <Field label={f.agent}>{(id) => <Select id={id} value={d.agentId} onChange={(e) => set("agentId", e.target.value)}>{ws.agents.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}</Select>}</Field>
        <Field label={f.exclusivity}>{(id) => <Select id={id} value={d.exclusivityType} onChange={(e) => set("exclusivityType", e.target.value as Draft["exclusivityType"])}><option value="exclusive">{c.exclusivity.exclusive}</option><option value="nonExclusive">{c.exclusivity.nonExclusive}</option></Select>}</Field>
        <Field label={f.exclusivityUntil}>{(id) => <TextInput id={id} type="date" value={d.exclusivityUntil} onChange={(e) => set("exclusivityUntil", e.target.value)} disabled={d.exclusivityType !== "exclusive"} />}</Field>
        <Field label={f.commissionBasis}>{(id) => <Select id={id} value={d.commission.basis} onChange={(e) => set("commission", { ...d.commission, basis: e.target.value as Draft["commission"]["basis"] })}><option value="percent">{c.commissionBasis.percent}</option><option value="fixed">{c.commissionBasis.fixed}</option><option value="months">{c.commissionBasis.months}</option></Select>}</Field>
        <Field label={f.commissionValue}>{(id) => <TextInput id={id} type="number" min={0} step="0.1" value={d.commission.value} onChange={(e) => set("commission", { ...d.commission, value: Number(e.target.value) })} />}</Field>
      </FormRow>
      <FormRow className="sm:grid-cols-3">
        <Field label={f.cadastreLv}>{(id) => <TextInput id={id} value={d.titleDeed} onChange={(e) => set("titleDeed", e.target.value)} placeholder="LV 1234" />}</Field>
        <Field label={f.cadastreParcel}>{(id) => <TextInput id={id} value={d.parcel} onChange={(e) => set("parcel", e.target.value)} />}</Field>
        <Field label={f.cadastreMunicipality}>{(id) => <TextInput id={id} value={d.municipality} onChange={(e) => set("municipality", e.target.value)} />}</Field>
      </FormRow>
      <FormRow>
        <Field label={f.photos}>{(id) => <TextInput id={id} type="number" min={0} value={d.photos} onChange={(e) => set("photos", Number(e.target.value))} />}</Field>
      </FormRow>
      <Field label={f.notes}>{(id) => <TextArea id={id} value={d.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-20" />}</Field>
      <div className="flex justify-end gap-2">
        <SecondaryButton onClick={() => onDone(existing?.id ?? null)}>{c.common.cancel}</SecondaryButton>
        <PrimaryButton type="submit">{c.common.save}</PrimaryButton>
      </div>
    </form>
  );
}

// ── Detail ───────────────────────────────────────────────────────────────────────────

function PropertyDetail({ property, onEdit }: { property: Property; onEdit: () => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const agentName = useAgentName();
  const now = useNow();
  const [viewingOpen, setViewingOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [dealDemand, setDealDemand] = useState<string | null>(null);
  const [viewingContact, setViewingContact] = useState<{ contactId: string; demandId: string | null } | null>(null);
  const matches = useMemo(() => (ws ? demandsForProperty(ws, property) : []), [ws, property]);
  if (!ws) return null;
  const owner = lookups.contact(property.ownerId);
  const viewings = ws.viewings.filter((v) => v.propertyId === property.id).sort((a, b) => b.start.localeCompare(a.start));
  const deals = ws.deals.filter((d) => d.propertyId === property.id);
  const activities = ws.activities.filter((a) => a.link?.kind === "property" && a.link.id === property.id);
  const t = c.properties.detail;
  const facts: [string, string][] = [
    [t.condition, c.condition[property.condition]],
    [t.energy, c.energyClass[property.energyClass]],
    ...(property.floor !== null ? [[t.floor, `${property.floor}${property.totalFloors ? ` / ${property.totalFloors}` : ""}`] as [string, string]] : []),
    ...(property.yearBuilt ? [[t.year, String(property.yearBuilt)] as [string, string]] : []),
    ...(property.landArea ? [[t.landArea, `${formatNumber(property.landArea, locale)} ${c.common.sqm}`] as [string, string]] : []),
    [t.exclusivity, `${c.exclusivity[property.exclusivity.type]}${property.exclusivity.until ? ` · ${t.until} ${formatDate(property.exclusivity.until, locale)}` : ""}`],
    [t.commission, property.commission.basis === "percent" ? `${property.commission.value} %` : property.commission.basis === "fixed" ? formatMoney(property.commission.value, locale) : `${property.commission.value} × ${c.common.rent.toLowerCase()}`],
    [t.listed, `${formatDate(property.listedAt, locale)} · ${daysOnMarket(property, now)} ${t.daysOnMarket}`],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tabular-nums tracking-tight"><Money amount={property.price} period={property.transaction} /></p>
          <p className="mt-1 text-sm"><PropertyFacts property={property} /></p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PropertyStatusPill status={property.status} />
            <Pill>{c.transactionVerb[property.transaction]}</Pill>
            <Pill>{c.propertyType[property.type]}</Pill>
            <Pill tone={livePortals(property) > 0 ? "good" : "neutral"}>{t.liveOn(livePortals(property))}</Pill>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={onEdit}>{c.common.edit}</SecondaryButton>
          <SecondaryButton onClick={() => { setViewingContact(null); setViewingOpen(true); }}>{t.scheduleViewing}</SecondaryButton>
          {property.status !== "sold" && property.status !== "rented" && <PrimaryButton onClick={() => { setDealDemand(null); setDealOpen(true); }}>{t.createDeal}</PrimaryButton>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.changeStatus}>{(id) => <Select id={id} value={property.status} onChange={(e) => setPropertyStatus(property.id, e.target.value as PropertyStatus, labels)}>{PROPERTY_STATUSES.map((s) => <option key={s} value={s}>{c.propertyStatus[s]}</option>)}</Select>}</Field>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          {[[property.stats.views, t.views], [property.stats.inquiries, t.inquiries], [property.photos, c.properties.form.photos]].map(([n, label]) => (
            <div key={String(label)} className="rounded-xl bg-background/60 p-2 ring-1 ring-foreground/10">
              <p className="text-lg font-semibold tabular-nums">{formatNumber(Number(n), locale)}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <Panel title={t.facts}>
        <dl className="grid gap-3 sm:grid-cols-2">
          {facts.map(([label, value]) => <Definition key={label} label={label}>{value}</Definition>)}
          <Definition label={t.ownerLabel}>{owner ? <RecordLink link={{ kind: "contact", id: owner.id }}>{fullName(owner)}</RecordLink> : "—"}</Definition>
          <Definition label={t.agentLabel}>{agentName(property.agentId)}</Definition>
          {property.cadastre && <Definition label={t.cadastre}>{property.cadastre.titleDeed} · {t.parcel} {property.cadastre.parcel} · {property.cadastre.municipality}</Definition>}
        </dl>
        {property.features.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">{property.features.map((f) => <li key={f}><Pill>{c.feature[f]}</Pill></li>)}</ul>
        )}
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{property.description || t.noDescription}</p>
        {property.priceHistory.length > 1 && (
          <p className="mt-3 text-xs text-muted-foreground">{t.priceHistory}: {property.priceHistory.map((h) => `${formatMoney(h.price, locale)} (${formatDate(h.at, locale)})`).join(" → ")}</p>
        )}
      </Panel>

      <Panel title={t.documents} hint={t.documentsHint} testId="property-documents">
        <ul className="grid gap-2 sm:grid-cols-2">
          {property.documents.map((doc) => (
            <li key={doc.kind}>
              <Checkbox label={c.propertyDoc[doc.kind]} checked={doc.done} onChange={() => togglePropertyDoc(property.id, doc.kind)} />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={t.portals} hint={t.portalsHint} testId="property-portals">
        <ul className="flex flex-wrap gap-2">
          {PORTALS.filter((p) => ws.settings.portals.includes(p)).map((portal) => {
            const state = property.portals[portal];
            const next = SYNDICATION_CYCLE[(SYNDICATION_CYCLE.indexOf(state === "error" ? "off" : state) + 1) % SYNDICATION_CYCLE.length]!;
            return (
              <li key={portal}>
                <button type="button" onClick={() => setPortal(property.id, portal, next, labels)} aria-pressed={state === "live"} className="rounded-full focus-visible:outline-2 focus-visible:outline-ring">
                  <Pill tone={SYNDICATION_TONE[state]}>{c.portal[portal]} · {c.syndication[state]}</Pill>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title={t.matches} hint={t.matchesHint} testId="property-matches">
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noMatches}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {matches.map(({ demand, match }) => {
              const x = lookups.contact(demand.contactId);
              return (
                <li key={demand.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="min-w-0">
                    <RecordLink link={{ kind: "demand", id: demand.id }} className="font-medium">{x ? fullName(x) : demand.id}</RecordLink>
                    <span className="block text-xs text-muted-foreground">{c.demands.detail.budgetUpTo(formatMoney(demand.budgetMax, locale))} · {demand.locations.join(", ")}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <ScorePill score={match.score} />
                    <SecondaryButton className="min-h-9 px-3 text-xs" onClick={() => { setViewingContact({ contactId: demand.contactId, demandId: demand.id }); setViewingOpen(true); }}>{t.scheduleViewing}</SecondaryButton>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title={t.viewings}>
          {viewings.length === 0 ? <p className="text-sm text-muted-foreground">{t.noViewings}</p> : (
            <ul className="space-y-2 text-sm">
              {viewings.slice(0, 6).map((v) => {
                const x = lookups.contact(v.contactId);
                return <li key={v.id} className="flex justify-between gap-2"><span>{formatDate(v.start, locale)} · {x ? fullName(x) : ""}</span><Pill tone={v.status === "done" ? "good" : v.status === "noShow" ? "bad" : "info"}>{v.outcome ? c.viewingOutcome[v.outcome] : c.viewingStatus[v.status]}</Pill></li>;
              })}
            </ul>
          )}
        </Panel>
        <Panel title={t.deals}>
          {deals.length === 0 ? <p className="text-sm text-muted-foreground">{t.noDeals}</p> : (
            <ul className="space-y-2 text-sm">
              {deals.map((d) => {
                const x = lookups.contact(d.buyerId);
                return <li key={d.id} className="flex justify-between gap-2"><RecordLink link={{ kind: "deal", id: d.id }}>{x ? fullName(x) : d.id}</RecordLink>{d.status === "open" ? <StagePill stage={d.stage} /> : <Pill tone={d.status === "won" ? "good" : "bad"}>{c.dealStatus[d.status]}</Pill>}</li>;
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title={c.common.timeline}>
        <Timeline activities={activities} link={{ kind: "property", id: property.id }} />
      </Panel>

      <Drawer open={viewingOpen} onOpenChange={setViewingOpen} title={c.viewings.schedule} closeLabel={c.common.close}>
        <ViewingForm propertyId={property.id} contactId={viewingContact?.contactId ?? null} demandId={viewingContact?.demandId ?? null} onDone={() => setViewingOpen(false)} />
      </Drawer>
      <Drawer open={dealOpen} onOpenChange={setDealOpen} title={c.deals.create} closeLabel={c.common.close}>
        <DealForm propertyId={property.id} demandId={dealDemand} onDone={() => setDealOpen(false)} />
      </Drawer>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────────

export function Properties() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const agent = useCurrentAgent(ws);
  const agentName = useAgentName();
  const now = useNow();
  const [selected, setSelected] = useSelected();
  const [editing, setEditing] = useState<"new" | "edit" | null>(null);
  const [transaction, setTransaction] = useState<Transaction | "all">("all");
  const [status, setStatus] = useState<PropertyStatus | "all">("all");
  const [type, setType] = useState<PropertyType | "all">("all");
  const [mine, setMine] = useState(false);
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    if (!ws) return [];
    const q = query.trim().toLocaleLowerCase();
    return ws.properties.filter((p) =>
      (transaction === "all" || p.transaction === transaction) && (status === "all" || p.status === status) && (type === "all" || p.type === type) && (!mine || p.agentId === agent?.id) &&
      (!q || `${p.title} ${p.street} ${p.district} ${p.city}`.toLocaleLowerCase().includes(q))
    );
  }, [ws, transaction, status, type, mine, query, agent]);
  if (!ws) return null;
  const current = selected ? ws.properties.find((p) => p.id === selected) ?? null : null;
  const columns: Column<Property>[] = [
    { key: "property", label: c.properties.columns.property, render: (p) => <span className="block min-w-0"><span className="block font-medium">{p.title}</span><span className="block text-xs"><PropertyFacts property={p} /></span></span> },
    { key: "price", label: c.properties.columns.price, className: "text-right", render: (p) => <Money amount={p.price} period={p.transaction} /> },
    { key: "status", label: c.properties.columns.status, render: (p) => <PropertyStatusPill status={p.status} /> },
    { key: "portals", label: c.properties.columns.portals, className: "text-center", render: (p) => <span className="tabular-nums">{livePortals(p)}</span> },
    { key: "agent", label: c.properties.columns.agent, render: (p) => <span className="text-muted-foreground">{agentName(p.agentId)}</span> },
    { key: "days", label: c.properties.columns.days, className: "text-right", render: (p) => <span className="tabular-nums text-muted-foreground">{daysOnMarket(p, now)}</span> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={c.properties.title} intro={c.properties.intro} actions={<PrimaryButton onClick={() => setEditing("new")}><Plus aria-hidden />{c.properties.add}</PrimaryButton>} />
      <div className="flex flex-wrap items-end gap-3">
        <Field label={c.properties.filters.search} className="min-w-56 flex-1">{(id) => <TextInput id={id} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.common.search} />}</Field>
        <Field label={c.properties.filters.transaction}>{(id) => <Select id={id} value={transaction} onChange={(e) => setTransaction(e.target.value as Transaction | "all")}><option value="all">{c.common.all}</option>{TRANSACTIONS.map((t) => <option key={t} value={t}>{c.transaction[t]}</option>)}</Select>}</Field>
        <Field label={c.properties.filters.status}>{(id) => <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as PropertyStatus | "all")}><option value="all">{c.common.all}</option>{PROPERTY_STATUSES.map((s) => <option key={s} value={s}>{c.propertyStatus[s]}</option>)}</Select>}</Field>
        <Field label={c.properties.filters.type}>{(id) => <Select id={id} value={type} onChange={(e) => setType(e.target.value as PropertyType | "all")}><option value="all">{c.common.all}</option>{PROPERTY_TYPES.map((t) => <option key={t} value={t}>{c.propertyType[t]}</option>)}</Select>}</Field>
        {ws.settings.mode === "agency" && <div className="pb-2"><Checkbox label={c.properties.filters.mine} checked={mine} onChange={setMine} /></div>}
      </div>
      {rows.length === 0 ? (
        <EmptyState title={c.properties.empty} />
      ) : (
        <DataList
          rows={rows}
          columns={columns}
          onOpen={(p) => setSelected(p.id)}
          openLabel={c.common.open}
          ariaLabel={c.properties.title}
          testId="properties-list"
          renderCard={(p) => (
            <span className="block space-y-1.5">
              <span className="flex items-start justify-between gap-2"><span className="font-medium">{p.title}</span><Money amount={p.price} period={p.transaction} /></span>
              <span className="block text-xs"><PropertyFacts property={p} /></span>
              <span className="flex flex-wrap gap-1.5"><PropertyStatusPill status={p.status} /><Pill>{c.properties.detail.liveOn(livePortals(p))}</Pill></span>
            </span>
          )}
        />
      )}
      <Drawer open={current !== null && editing === null} onOpenChange={(o) => !o && setSelected(null)} title={current?.title ?? ""} description={current ? `${c.propertyType[current.type]} · ${agentName(current.agentId)}` : undefined} closeLabel={c.common.close} wide testId="property-drawer">
        {current && <PropertyDetail property={current} onEdit={() => setEditing("edit")} />}
      </Drawer>
      <Drawer open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === "edit" ? c.properties.edit : c.properties.add} closeLabel={c.common.close} wide>
        {editing && <PropertyForm existing={editing === "edit" ? current : null} onDone={(id) => { setEditing(null); if (id) setSelected(id); }} />}
      </Drawer>
      <p className="sr-only">{formatMoney(0, locale)}</p>
    </div>
  );
}
