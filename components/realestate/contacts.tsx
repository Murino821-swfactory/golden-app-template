"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useCopy, useCurrentAgent, useLookups, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { useSelected } from "@/hooks/use-selected";
import { addContact, setAml, setConsent, updateContact, type ContactInput } from "@/lib/realestate/actions";
import { contactExport, downloadText } from "@/lib/realestate/export";
import { formatDate } from "@/lib/realestate/format";
import { CONTACT_ROLES, SOURCES, addMonths, daysBetween, fullName, isoDate, type AmlMethod, type AmlStatus, type ConsentStatus, type Contact, type ContactKind, type ContactRole, type IdDocument, type Source } from "@/lib/realestate/model";
import { DemandForm } from "./demand-form";
import { AmlPill, ConsentPill, DemandStatusPill, Money, PropertyStatusPill, RecordLink, StagePill, Timeline, useActionLabels, useAgentName, useNow } from "./shared";
import { Avatar, Checkbox, DataList, Definition, Drawer, EmptyState, Field, FormRow, PageHeader, Panel, Pill, PrimaryButton, SecondaryButton, Select, TextArea, TextButton, TextInput, ToggleGroup, type Column } from "./ui";

// ── Form ─────────────────────────────────────────────────────────────────────────────

function ContactForm({ existing, onDone }: { existing: Contact | null; onDone: (id: string | null) => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const agent = useCurrentAgent(ws);
  const [kind, setKind] = useState<ContactKind>(existing?.kind ?? "person");
  const [firstName, setFirstName] = useState(existing?.firstName ?? "");
  const [lastName, setLastName] = useState(existing?.lastName ?? "");
  const [company, setCompany] = useState(existing?.company ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [roles, setRoles] = useState<ContactRole[]>(existing?.roles ?? ["buyer"]);
  const [source, setSource] = useState<Source>(existing?.source ?? "portal");
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [agentId, setAgentId] = useState(existing?.agentId ?? agent?.id ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [consentNow, setConsentNow] = useState(existing ? existing.consent.status === "granted" : true);
  const [marketing, setMarketing] = useState(existing?.consent.marketing ?? false);
  if (!ws) return null;
  const f = c.contacts.form;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!lastName.trim() && !company.trim()) return;
        const today = new Date();
        const consent = existing
          ? { ...existing.consent, marketing }
          : consentNow
            ? { status: "granted" as const, grantedAt: isoDate(today), expiresAt: isoDate(addMonths(today, ws.settings.consentMonths)), marketing }
            : { status: "pending" as const, grantedAt: null, expiresAt: null, marketing: false };
        const input: ContactInput = {
          kind, firstName: firstName.trim(), lastName: lastName.trim(), company: company.trim(), email: email.trim(), phone: phone.trim(), roles, source,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean), agentId: agentId || agent?.id || "", consent, aml: existing?.aml ?? { status: "none", method: null, document: null, identifiedAt: null, pep: false }, city: city.trim(), notes: notes.trim(),
        };
        if (existing) {
          updateContact(existing.id, input);
          onDone(existing.id);
        } else onDone(addContact(input));
      }}
    >
      <Field label={f.kind}>{(id) => <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as ContactKind)}><option value="person">{c.contactKind.person}</option><option value="company">{c.contactKind.company}</option></Select>}</Field>
      {kind === "company" && <Field label={f.company} required>{(id) => <TextInput id={id} value={company} onChange={(e) => setCompany(e.target.value)} />}</Field>}
      <FormRow>
        <Field label={f.firstName}>{(id) => <TextInput id={id} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}</Field>
        <Field label={f.lastName} required={kind === "person"}>{(id) => <TextInput id={id} value={lastName} onChange={(e) => setLastName(e.target.value)} />}</Field>
        <Field label={f.email}>{(id) => <TextInput id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label={f.phone}>{(id) => <TextInput id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}</Field>
        <Field label={f.city}>{(id) => <TextInput id={id} value={city} onChange={(e) => setCity(e.target.value)} />}</Field>
        <Field label={f.source}>{(id) => <Select id={id} value={source} onChange={(e) => setSource(e.target.value as Source)}>{SOURCES.map((s) => <option key={s} value={s}>{c.source[s]}</option>)}</Select>}</Field>
        <Field label={f.agent}>{(id) => <Select id={id} value={agentId} onChange={(e) => setAgentId(e.target.value)}>{ws.agents.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}</Select>}</Field>
        <Field label={f.tags}>{(id) => <TextInput id={id} value={tags} onChange={(e) => setTags(e.target.value)} />}</Field>
      </FormRow>
      <ToggleGroup label={f.roles} options={CONTACT_ROLES.map((r) => ({ value: r, label: c.contactRole[r] }))} value={roles} onChange={setRoles} />
      {!existing && <Checkbox label={f.consentNow} checked={consentNow} onChange={setConsentNow} />}
      <Checkbox label={f.marketing} checked={marketing} onChange={setMarketing} />
      <Field label={f.notes}>{(id) => <TextArea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" />}</Field>
      <div className="flex justify-end gap-2">
        <SecondaryButton onClick={() => onDone(existing?.id ?? null)}>{c.common.cancel}</SecondaryButton>
        <PrimaryButton type="submit">{c.common.save}</PrimaryButton>
      </div>
    </form>
  );
}

// ── Detail ───────────────────────────────────────────────────────────────────────────

function ContactDetail({ contact, onEdit }: { contact: Contact; onEdit: () => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const agentName = useAgentName();
  const now = useNow();
  const [demandOpen, setDemandOpen] = useState(false);
  const [method, setMethod] = useState<AmlMethod>(contact.aml.method ?? "inPerson");
  const [document, setDocument] = useState<IdDocument>(contact.aml.document ?? "idCard");
  if (!ws) return null;
  const t = c.contacts.detail;
  const expiresIn = contact.consent.expiresAt ? daysBetween(isoDate(now), contact.consent.expiresAt) : null;
  const properties = ws.properties.filter((p) => p.ownerId === contact.id);
  const demands = ws.demands.filter((d) => d.contactId === contact.id);
  const deals = ws.deals.filter((d) => d.buyerId === contact.id || d.sellerId === contact.id);
  const leases = ws.leases.filter((l) => l.tenantId === contact.id || l.landlordId === contact.id);
  const activities = ws.activities.filter((a) => (a.link?.kind === "contact" && a.link.id === contact.id) || (a.link?.kind === "demand" && demands.some((d) => d.id === a.link!.id)));
  const nothing = properties.length + demands.length + deals.length + leases.length === 0;
  const setStatus = (status: AmlStatus) => setAml(contact.id, { status, method: status === "none" ? null : method, document: status === "none" ? null : document }, labels);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={fullName(contact)} className="size-12 text-sm" />
          <div>
            <p className="text-sm">{contact.email}</p>
            <p className="text-sm">{contact.phone}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{contact.roles.map((r) => <Pill key={r}>{c.contactRole[r]}</Pill>)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={onEdit}>{c.common.edit}</SecondaryButton>
          <PrimaryButton onClick={() => setDemandOpen(true)}>{t.addDemand}</PrimaryButton>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Definition label={t.source}>{c.source[contact.source]}</Definition>
        <Definition label={c.common.agent}>{agentName(contact.agentId)}</Definition>
        <Definition label={t.city}>{contact.city || c.common.none}</Definition>
        {contact.tags.length > 0 && <Definition label={t.tags}>{contact.tags.join(", ")}</Definition>}
        {contact.notes && <Definition label={c.common.notes}>{contact.notes}</Definition>}
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t.gdpr} hint={t.gdprHint} testId="consent-panel">
          <ConsentPill status={contact.consent.status} expiresIn={expiresIn} />
          <p className="mt-2 text-xs text-muted-foreground">
            {contact.consent.grantedAt ? `${formatDate(contact.consent.grantedAt, locale)} → ${contact.consent.expiresAt ? formatDate(contact.consent.expiresAt, locale) : "—"} · ` : ""}
            {t.marketing}: {contact.consent.marketing ? t.marketingOn : t.marketingOff}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {contact.consent.status !== "granted" && <PrimaryButton className="min-h-9 px-3 text-xs" onClick={() => setConsent(contact.id, "granted", labels)}>{t.grant}</PrimaryButton>}
            {contact.consent.status === "granted" && <SecondaryButton className="min-h-9 px-3 text-xs" onClick={() => setConsent(contact.id, "granted", labels)}>{t.renew}</SecondaryButton>}
            {contact.consent.status !== "withdrawn" && <SecondaryButton className="min-h-9 px-3 text-xs" onClick={() => setConsent(contact.id, "withdrawn", labels)}>{t.withdraw}</SecondaryButton>}
            <TextButton onClick={() => downloadText(`${contact.lastName || contact.company || "contact"}-gdpr.json`, contactExport(ws, contact), "application/json")}>{t.exportData}</TextButton>
          </div>
        </Panel>
        <Panel title={t.aml} hint={t.amlHint} testId="aml-panel">
          <AmlPill status={contact.aml.status} />
          {contact.aml.identifiedAt && <p className="mt-2 text-xs text-muted-foreground">{t.identifiedOn} {formatDate(contact.aml.identifiedAt, locale)} · {contact.aml.method ? c.amlMethod[contact.aml.method] : ""} · {contact.aml.document ? c.idDocument[contact.aml.document] : ""}</p>}
          {contact.aml.status === "none" && (
            <FormRow className="mt-3">
              <Field label={t.method}>{(id) => <Select id={id} value={method} onChange={(e) => setMethod(e.target.value as AmlMethod)}><option value="inPerson">{c.amlMethod.inPerson}</option><option value="remote">{c.amlMethod.remote}</option></Select>}</Field>
              <Field label={t.document}>{(id) => <Select id={id} value={document} onChange={(e) => setDocument(e.target.value as IdDocument)}><option value="idCard">{c.idDocument.idCard}</option><option value="passport">{c.idDocument.passport}</option></Select>}</Field>
            </FormRow>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {contact.aml.status === "none" && <PrimaryButton className="min-h-9 px-3 text-xs" onClick={() => setStatus("identified")}>{t.identify}</PrimaryButton>}
            {contact.aml.status === "identified" && <PrimaryButton className="min-h-9 px-3 text-xs" onClick={() => setStatus("verified")}>{t.verify}</PrimaryButton>}
            {contact.aml.status !== "none" && <TextButton onClick={() => setStatus("none")}>{t.resetAml}</TextButton>}
          </div>
          <div className="mt-3">
            <Checkbox label={t.pep} hint={t.pepHint} checked={contact.aml.pep} onChange={(pep) => setAml(contact.id, { pep }, labels)} />
          </div>
        </Panel>
      </div>

      {nothing ? (
        <p className="text-sm text-muted-foreground">{t.noLinks}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {properties.length > 0 && (
            <Panel title={t.properties}>
              <ul className="space-y-2 text-sm">{properties.map((p) => <li key={p.id} className="flex justify-between gap-2"><RecordLink link={{ kind: "property", id: p.id }}>{p.title}</RecordLink><PropertyStatusPill status={p.status} /></li>)}</ul>
            </Panel>
          )}
          {demands.length > 0 && (
            <Panel title={t.demands}>
              <ul className="space-y-2 text-sm">{demands.map((d) => <li key={d.id} className="flex justify-between gap-2"><RecordLink link={{ kind: "demand", id: d.id }}>{c.transaction[d.transaction]} · {d.types.map((x) => c.propertyType[x]).join(", ")} · {d.locations.slice(0, 2).join(", ")}</RecordLink><DemandStatusPill status={d.status} /></li>)}</ul>
            </Panel>
          )}
          {deals.length > 0 && (
            <Panel title={t.deals}>
              <ul className="space-y-2 text-sm">{deals.map((d) => <li key={d.id} className="flex justify-between gap-2"><RecordLink link={{ kind: "deal", id: d.id }}>{lookups.property(d.propertyId)?.title}</RecordLink>{d.status === "open" ? <StagePill stage={d.stage} /> : <Pill tone={d.status === "won" ? "good" : "bad"}>{c.dealStatus[d.status]}</Pill>}</li>)}</ul>
            </Panel>
          )}
          {leases.length > 0 && (
            <Panel title={t.leases}>
              <ul className="space-y-2 text-sm">{leases.map((l) => <li key={l.id} className="flex justify-between gap-2"><RecordLink link={{ kind: "lease", id: l.id }}>{lookups.property(l.propertyId)?.title}</RecordLink><Money amount={l.rent} period="rent" /></li>)}</ul>
            </Panel>
          )}
        </div>
      )}

      <Panel title={c.common.timeline}>
        <Timeline activities={activities} link={{ kind: "contact", id: contact.id }} />
      </Panel>

      <Drawer open={demandOpen} onOpenChange={setDemandOpen} title={c.demands.add} closeLabel={c.common.close}>
        <DemandForm existing={null} contactId={contact.id} onDone={() => setDemandOpen(false)} />
      </Drawer>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────────

export function Contacts() {
  const ws = useWorkspace();
  const c = useCopy();
  const agentName = useAgentName();
  const now = useNow();
  const [selected, setSelected] = useSelected();
  const [editing, setEditing] = useState<"new" | "edit" | null>(null);
  const [role, setRole] = useState<ContactRole | "all">("all");
  const [consent, setConsentFilter] = useState<ConsentStatus | "all">("all");
  const [aml, setAmlFilter] = useState<AmlStatus | "all">("all");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    if (!ws) return [];
    const q = query.trim().toLocaleLowerCase();
    return ws.contacts.filter((x) =>
      (role === "all" || x.roles.includes(role)) && (consent === "all" || x.consent.status === consent) && (aml === "all" || x.aml.status === aml) &&
      (!q || `${fullName(x)} ${x.company} ${x.email} ${x.phone}`.toLocaleLowerCase().includes(q))
    );
  }, [ws, role, consent, aml, query]);
  if (!ws) return null;
  const current = selected ? ws.contacts.find((x) => x.id === selected) ?? null : null;
  const expiresIn = (x: Contact) => (x.consent.expiresAt ? daysBetween(isoDate(now), x.consent.expiresAt) : null);
  const columns: Column<Contact>[] = [
    { key: "name", label: c.contacts.columns.name, render: (x) => <span className="flex items-center gap-2.5"><Avatar name={fullName(x)} className="size-8 text-[11px]" /><span className="min-w-0"><span className="block font-medium">{fullName(x)}</span><span className="block text-xs text-muted-foreground">{x.email}</span></span></span> },
    { key: "roles", label: c.contacts.columns.roles, render: (x) => <span className="flex flex-wrap gap-1">{x.roles.map((r) => <Pill key={r}>{c.contactRole[r]}</Pill>)}</span> },
    { key: "phone", label: c.contacts.columns.phone, render: (x) => <span className="tabular-nums text-muted-foreground">{x.phone}</span> },
    { key: "consent", label: c.contacts.columns.consent, render: (x) => <ConsentPill status={x.consent.status} expiresIn={expiresIn(x)} /> },
    { key: "aml", label: c.contacts.columns.aml, render: (x) => <AmlPill status={x.aml.status} /> },
    { key: "agent", label: c.contacts.columns.agent, render: (x) => <span className="text-muted-foreground">{agentName(x.agentId)}</span> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={c.contacts.title} intro={c.contacts.intro} actions={<PrimaryButton onClick={() => setEditing("new")}><Plus aria-hidden />{c.contacts.add}</PrimaryButton>} />
      <div className="flex flex-wrap items-end gap-3">
        <Field label={c.contacts.filters.search} className="min-w-56 flex-1">{(id) => <TextInput id={id} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.common.search} />}</Field>
        <Field label={c.contacts.filters.role}>{(id) => <Select id={id} value={role} onChange={(e) => setRole(e.target.value as ContactRole | "all")}><option value="all">{c.common.all}</option>{CONTACT_ROLES.map((r) => <option key={r} value={r}>{c.contactRole[r]}</option>)}</Select>}</Field>
        <Field label={c.contacts.filters.consent}>{(id) => <Select id={id} value={consent} onChange={(e) => setConsentFilter(e.target.value as ConsentStatus | "all")}><option value="all">{c.common.all}</option>{(["granted", "pending", "withdrawn"] as ConsentStatus[]).map((s) => <option key={s} value={s}>{c.consentStatus[s]}</option>)}</Select>}</Field>
        <Field label={c.contacts.filters.aml}>{(id) => <Select id={id} value={aml} onChange={(e) => setAmlFilter(e.target.value as AmlStatus | "all")}><option value="all">{c.common.all}</option>{(["none", "identified", "verified"] as AmlStatus[]).map((s) => <option key={s} value={s}>{c.amlStatus[s]}</option>)}</Select>}</Field>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={c.contacts.empty} />
      ) : (
        <DataList
          rows={rows}
          columns={columns}
          onOpen={(x) => setSelected(x.id)}
          openLabel={c.common.open}
          ariaLabel={c.contacts.title}
          testId="contacts-list"
          renderCard={(x) => (
            <span className="block space-y-1.5">
              <span className="flex items-center gap-2.5"><Avatar name={fullName(x)} className="size-8 text-[11px]" /><span className="font-medium">{fullName(x)}</span></span>
              <span className="block text-xs text-muted-foreground">{x.phone} · {x.roles.map((r) => c.contactRole[r]).join(", ")}</span>
              <span className="flex flex-wrap gap-1.5"><ConsentPill status={x.consent.status} expiresIn={expiresIn(x)} /><AmlPill status={x.aml.status} /></span>
            </span>
          )}
        />
      )}
      <Drawer open={current !== null && editing === null} onOpenChange={(o) => !o && setSelected(null)} title={current ? fullName(current) : ""} description={current ? c.contactKind[current.kind] : undefined} closeLabel={c.common.close} wide testId="contact-drawer">
        {current && <ContactDetail contact={current} onEdit={() => setEditing("edit")} />}
      </Drawer>
      <Drawer open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === "edit" ? c.contacts.edit : c.contacts.add} closeLabel={c.common.close}>
        {editing && <ContactForm existing={editing === "edit" ? current : null} onDone={(id) => { setEditing(null); if (id) setSelected(id); }} />}
      </Drawer>
    </div>
  );
}
