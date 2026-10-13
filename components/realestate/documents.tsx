"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { useCopy, useLookups, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { useSelected } from "@/hooks/use-selected";
import { addDocument, removeDocument, setDocumentStatus } from "@/lib/realestate/actions";
import { renderDocument } from "@/lib/realestate/documents";
import { formatDate } from "@/lib/realestate/format";
import { TEMPLATE_IDS, fullName, type DocumentItem, type EntityLink, type LinkKind, type TemplateId } from "@/lib/realestate/model";
import { RecordLink, useActionLabels, useLinkName } from "./shared";
import { DOC_TONE, DataList, Drawer, EmptyState, Field, FormRow, PageHeader, Panel, Pill, PrimaryButton, SecondaryButton, Select, TextButton, type Column } from "./ui";

const LINK_KINDS: LinkKind[] = ["deal", "property", "lease", "contact"];

function GenerateForm({ template, onDone }: { template: TemplateId | null; onDone: (id: string | null) => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const [templateId, setTemplateId] = useState<TemplateId>(template ?? "reservation");
  const [kind, setKind] = useState<LinkKind>(template === "gdprConsent" || template === "amlForm" ? "contact" : template === "lease" || template === "handover" ? "lease" : template === "brokerageExclusive" || template === "brokerageNonExclusive" || template === "powerOfAttorney" ? "property" : "deal");
  const [recordId, setRecordId] = useState("");
  if (!ws) return null;
  const options: { id: string; label: string }[] =
    kind === "deal" ? ws.deals.map((d) => ({ id: d.id, label: `${lookups.property(d.propertyId)?.title ?? ""} · ${fullName(lookups.contact(d.buyerId) ?? { firstName: "", lastName: "" })}` }))
    : kind === "property" ? ws.properties.map((p) => ({ id: p.id, label: p.title }))
    : kind === "lease" ? ws.leases.map((l) => ({ id: l.id, label: `${lookups.property(l.propertyId)?.title ?? ""} · ${fullName(lookups.contact(l.tenantId) ?? { firstName: "", lastName: "" })}` }))
    : ws.contacts.map((x) => ({ id: x.id, label: fullName(x) }));
  const chosen = recordId && options.some((o) => o.id === recordId) ? recordId : options[0]?.id ?? "";
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!chosen) return; onDone(addDocument(templateId, { kind, id: chosen }, labels)); }}>
      <Field label={c.documents.template}>{(id) => <Select id={id} value={templateId} onChange={(e) => setTemplateId(e.target.value as TemplateId)}>{TEMPLATE_IDS.map((t) => <option key={t} value={t}>{c.template[t]}</option>)}</Select>}</Field>
      <p className="text-xs text-muted-foreground">{c.templateHint[templateId]}</p>
      <FormRow>
        <Field label={c.documents.linkKind}>{(id) => <Select id={id} value={kind} onChange={(e) => { setKind(e.target.value as LinkKind); setRecordId(""); }}>{LINK_KINDS.map((k) => <option key={k} value={k}>{c.linkKind[k]}</option>)}</Select>}</Field>
        <Field label={c.documents.linkRecord}>{(id) => <Select id={id} value={chosen} onChange={(e) => setRecordId(e.target.value)}>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</Select>}</Field>
      </FormRow>
      <div className="flex justify-end gap-2"><SecondaryButton onClick={() => onDone(null)}>{c.common.cancel}</SecondaryButton><PrimaryButton type="submit">{c.documents.generate}</PrimaryButton></div>
    </form>
  );
}

function DocumentPreview({ doc }: { doc: DocumentItem }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const labels = useActionLabels();
  const linkName = useLinkName();
  const rendered = useMemo(() => (ws ? renderDocument(ws, doc, locale, c) : null), [ws, doc, locale, c]);
  if (!ws || !rendered) return null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <span className="flex flex-wrap items-center gap-2">
          <Pill tone={DOC_TONE[doc.status]}>{c.docStatus[doc.status]}</Pill>
          <RecordLink link={doc.link} className="text-sm text-muted-foreground">{c.linkKind[doc.link.kind]}: {linkName(doc.link)}</RecordLink>
        </span>
        <span className="flex flex-wrap gap-2">
          {doc.status === "draft" && <SecondaryButton className="min-h-9 px-3 text-xs" onClick={() => setDocumentStatus(doc.id, "sent", labels)}>{c.documents.markSent}</SecondaryButton>}
          {(doc.status === "draft" || doc.status === "sent") && <PrimaryButton className="min-h-9 px-3 text-xs" onClick={() => setDocumentStatus(doc.id, "signed", labels)}>{c.documents.markSigned}</PrimaryButton>}
          {doc.status === "signed" && <SecondaryButton className="min-h-9 px-3 text-xs" onClick={() => setDocumentStatus(doc.id, "archived", labels)}>{c.documents.archive}</SecondaryButton>}
          {doc.status !== "draft" && doc.status !== "signed" && <TextButton onClick={() => setDocumentStatus(doc.id, "draft", labels)}>{c.documents.reopen}</TextButton>}
          <SecondaryButton className="min-h-9 px-3 text-xs" onClick={() => window.print()}><Printer aria-hidden />{c.documents.print}</SecondaryButton>
        </span>
      </div>
      <article data-testid="document-preview" className="rounded-2xl bg-background p-5 ring-1 ring-foreground/10 sm:p-8 print:p-0 print:ring-0">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{ws.settings.agencyName}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{rendered.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{rendered.subtitle}</p>
        <section className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.documents.parties}</h3>
          <dl className="mt-2 grid gap-3 sm:grid-cols-2">
            {rendered.parties.map((p, i) => <div key={i}><dt className="text-xs text-muted-foreground">{p.role}</dt><dd className="text-sm font-medium">{p.name}</dd>{p.detail && <dd className="text-xs text-muted-foreground">{p.detail}</dd>}</div>)}
          </dl>
        </section>
        <ol className="mt-6 space-y-4">
          {rendered.clauses.map((cl, i) => <li key={i}><h3 className="text-sm font-semibold">{i + 1}. {cl.heading}</h3><p className="mt-1 text-sm leading-relaxed">{cl.body}</p></li>)}
        </ol>
        <p className="mt-6 text-sm">{c.documents.place} {formatDate(doc.signedAt ?? doc.createdAt, locale)}</p>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {rendered.signatures.map((s, i) => <div key={i} className="border-t border-foreground/40 pt-2 text-sm">{s}</div>)}
        </div>
        <p className="mt-8 text-xs text-muted-foreground">{c.documents.disclaimer}</p>
      </article>
      <div className="print:hidden"><TextButton onClick={() => removeDocument(doc.id)}>{c.common.delete}</TextButton></div>
    </div>
  );
}

export function Documents() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const linkName = useLinkName();
  const [selected, setSelected] = useSelected();
  const [generateFor, setGenerateFor] = useState<TemplateId | "any" | null>(null);
  if (!ws) return null;
  const current = selected ? ws.documents.find((d) => d.id === selected) ?? null : null;
  const columns: Column<DocumentItem>[] = [
    { key: "title", label: c.documents.template, render: (d) => <span className="font-medium">{c.template[d.templateId]}</span> },
    { key: "link", label: c.documents.linkKind, render: (d) => <span className="text-muted-foreground">{c.linkKind[d.link.kind]}: {linkName(d.link)}</span> },
    { key: "status", label: c.common.status, render: (d) => <Pill tone={DOC_TONE[d.status]}>{c.docStatus[d.status]}</Pill> },
    { key: "created", label: c.documents.created, render: (d) => <span className="text-muted-foreground">{formatDate(d.createdAt, locale)}</span> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={c.documents.title} intro={c.documents.intro} actions={<PrimaryButton onClick={() => setGenerateFor("any")}>{c.documents.generateTitle}</PrimaryButton>} />
      <Panel title={c.documents.templates} hint={c.documents.templatesHint} testId="document-templates">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATE_IDS.map((id) => (
            <li key={id} className="flex flex-col gap-2 rounded-xl bg-background/60 p-3 ring-1 ring-foreground/10">
              <span className="text-sm font-medium">{c.template[id]}</span>
              <span className="flex-1 text-xs text-muted-foreground">{c.templateHint[id]}</span>
              <TextButton className="self-start" onClick={() => setGenerateFor(id)}>{c.documents.useTemplate}</TextButton>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title={c.documents.generated} hint={c.documents.generatedHint}>
        {ws.documents.length === 0 ? <EmptyState title={c.documents.empty} /> : (
          <DataList rows={ws.documents} columns={columns} onOpen={(d) => setSelected(d.id)} openLabel={c.documents.preview} ariaLabel={c.documents.generated} testId="documents-list"
            renderCard={(d) => <span className="block space-y-1"><span className="block font-medium">{c.template[d.templateId]}</span><span className="block text-xs text-muted-foreground">{linkName(d.link)} · {formatDate(d.createdAt, locale)}</span><Pill tone={DOC_TONE[d.status]}>{c.docStatus[d.status]}</Pill></span>} />
        )}
      </Panel>
      <Drawer open={current !== null} onOpenChange={(o) => !o && setSelected(null)} title={current ? c.template[current.templateId] : ""} description={current ? c.documents.preview : undefined} closeLabel={c.common.close} wide testId="document-drawer">
        {current && <DocumentPreview doc={current} />}
      </Drawer>
      <Drawer open={generateFor !== null} onOpenChange={(o) => !o && setGenerateFor(null)} title={c.documents.generateTitle} closeLabel={c.common.close}>
        {generateFor && <GenerateForm template={generateFor === "any" ? null : generateFor} onDone={(id) => { setGenerateFor(null); if (id) setSelected(id); }} />}
      </Drawer>
    </div>
  );
}

export type { EntityLink };
