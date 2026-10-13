"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { appCopy, asLocale } from "@/lib/legal/copy";
import { todayIso } from "@/lib/legal/dates";
import { formatDate } from "@/lib/legal/format";
import { newId, useWorkspace } from "@/lib/legal/store";
import type { DocumentKind, MatterDocument } from "@/lib/legal/types";
import { localePath } from "@/lib/locale-routing";
import { NAV_ROUTES } from "../shell";
import { useQueryParam } from "../use-query-param";
import { Badge, Empty, Field, PageHeader, Panel, Select, TextInput } from "../ui";

const KINDS: DocumentKind[] = ["submission", "contract", "evidence", "decision", "memo", "correspondence", "template"];

function NewDocumentDialog({ open, onClose, template, initialMatter }: { open: boolean; onClose: () => void; template?: MatterDocument; initialMatter?: string }) {
  const copy = appCopy(useLocale());
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent closeLabel={copy.common.close}>
        <DialogTitle>{template ? copy.documents.useTemplate : copy.documents.newDocument}</DialogTitle>
        {template && <DialogDescription>{template.title}</DialogDescription>}
        {open && <NewDocumentForm key={template?.id ?? "new"} template={template} initialMatter={initialMatter} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function NewDocumentForm({ template, initialMatter, onClose }: { template?: MatterDocument; initialMatter?: string; onClose: () => void }) {
  const copy = appCopy(useLocale());
  const { ws, update } = useWorkspace();
  const [title, setTitle] = useState(template ? template.title.replace(/^(Šablóna|Template) — /u, "") : "");
  const [kind, setKind] = useState<DocumentKind>("submission");
  const [matterId, setMatterId] = useState(initialMatter ?? "");
  if (!ws) return null;
  const openMatters = ws.matters.filter((m) => m.stage !== "closed");
  const chosen = matterId || openMatters[0]?.id || "";
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !ws) return;
    const doc: MatterDocument = { id: newId("d"), matterId: kind === "template" ? undefined : chosen || undefined, title: title.trim(), kind, version: 1, updatedAt: todayIso(), authorId: ws.currentMemberId, status: "draft", sizeKb: template?.sizeKb ?? 24 };
    update((w) => ({ ...w, documents: [doc, ...w.documents] }));
    onClose();
  }
  return (
    <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3">
      <Field label={copy.common.title}><TextInput value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} /></Field>
      <Field label={copy.common.kind}><Select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>{KINDS.map((k) => <option key={k} value={k}>{copy.docKinds[k]}</option>)}</Select></Field>
      {kind !== "template" && <Field label={copy.common.matter}><Select value={chosen} onChange={(e) => setMatterId(e.target.value)}>{openMatters.map((m) => <option key={m.id} value={m.id}>{m.number} · {m.title}</option>)}</Select></Field>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" className="h-11" onClick={onClose}>{copy.common.cancel}</Button><Button type="submit" className="h-11" disabled={!title.trim()}>{copy.common.save}</Button></div>
    </form>
  );
}

export function DocumentsPage() {
  const locale = asLocale(useLocale());
  const copy = appCopy(locale);
  const { ws, update } = useWorkspace();
  const [matterParam] = useQueryParam("matter");
  const [kindParam] = useQueryParam("kind");
  const [q, setQ] = useState("");
  // A filter starts from the URL (`?matter=`, `?kind=`) until the person changes it.
  const [kindChoice, setKind] = useState<string | null>(null);
  const [matterChoice, setMatterId] = useState<string | null>(null);
  const kind = kindChoice ?? kindParam ?? "";
  const matterId = matterChoice ?? matterParam ?? "";
  const [dialog, setDialog] = useState<{ open: boolean; template?: MatterDocument }>({ open: false });
  if (!ws) return <p role="status" className="text-sm text-muted-foreground">{copy.common.loading}</p>;
  const matter = (id?: string) => (id ? ws.matters.find((m) => m.id === id) : undefined);
  const member = (id: string) => ws.members.find((m) => m.id === id);
  const needle = q.trim().toLowerCase();
  const docs = ws.documents
    .filter((d) => d.kind !== "template" && (!kind || d.kind === kind) && (!matterId || d.matterId === matterId))
    .filter((d) => !needle || `${d.title} ${matter(d.matterId)?.number ?? ""} ${matter(d.matterId)?.title ?? ""}`.toLowerCase().includes(needle))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const templates = ws.documents.filter((d) => d.kind === "template");
  const patch = (id: string, p: Partial<MatterDocument>) => update((w) => ({ ...w, documents: w.documents.map((d) => d.id === id ? { ...d, ...p, updatedAt: todayIso() } : d) }));
  const statusTone = (s: MatterDocument["status"]) => (s === "filed" ? "accent" : s === "draft" ? "muted" : "neutral");

  return (
    <div className="space-y-6">
      <PageHeader title={copy.documents.title} intro={copy.documents.intro} actions={<Button className="h-11" onClick={() => setDialog({ open: true })}><Plus className="size-4" aria-hidden />{copy.documents.newDocument}</Button>} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">
        <TextInput type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy.documents.searchPlaceholder} aria-label={copy.common.search} />
        <Select value={kind === "template" ? "" : kind} onChange={(e) => setKind(e.target.value)} aria-label={copy.common.kind}><option value="">{copy.documents.allKinds}</option>{KINDS.filter((k) => k !== "template").map((k) => <option key={k} value={k}>{copy.docKinds[k]}</option>)}</Select>
        <Select value={matterId} onChange={(e) => setMatterId(e.target.value)} aria-label={copy.common.matter}><option value="">{copy.documents.allMatters}</option>{ws.matters.map((m) => <option key={m.id} value={m.id}>{m.number} · {m.title}</option>)}</Select>
      </div>
      <Panel title={`${copy.documents.title} (${docs.length})`}>
        {docs.length === 0 ? <Empty>{copy.documents.empty}</Empty> : (
          <ul className="divide-y divide-border text-sm">{docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{d.title}</span>
                <span className="text-xs text-muted-foreground">{copy.docKinds[d.kind]} · v{d.version} · {member(d.authorId)?.name} · {formatDate(d.updatedAt, locale)} · {d.sizeKb} kB{d.matterId ? <> · <a className="hover:underline" href={`${localePath(locale, NAV_ROUTES.matters)}?id=${d.matterId}&tab=documents`}>{matter(d.matterId)?.number}</a></> : ` · ${copy.documents.general}`}</span>
              </span>
              <Badge tone={statusTone(d.status)}>{copy.docStatus[d.status]}</Badge>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => patch(d.id, { version: d.version + 1, status: "draft" })}>{copy.documents.newVersion}</Button>
                {d.status === "draft" && <Button size="sm" variant="ghost" onClick={() => patch(d.id, { status: "final" })}>{copy.documents.markFinal}</Button>}
                {d.status === "final" && (d.kind === "submission" || d.kind === "correspondence") && <Button size="sm" variant="ghost" onClick={() => patch(d.id, { status: "filed" })}>{copy.documents.markFiled}</Button>}
              </div>
            </li>
          ))}</ul>
        )}
      </Panel>
      <Panel title={copy.documents.templates} id="templates">
        <p className="mb-3 text-xs text-muted-foreground">{copy.documents.templatesHint}</p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">{templates.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
            <span className="min-w-0 flex-1"><span className="block font-medium">{t.title.replace(/^(Šablóna|Template) — /u, "")}</span><span className="text-xs text-muted-foreground">v{t.version} · {formatDate(t.updatedAt, locale)}</span></span>
            <Button size="sm" variant="outline" onClick={() => setDialog({ open: true, template: t })}>{copy.documents.useTemplate}</Button>
          </li>
        ))}</ul>
      </Panel>
      <NewDocumentDialog open={dialog.open} template={dialog.template} initialMatter={matterId || undefined} onClose={() => setDialog({ open: false })} />
    </div>
  );
}
