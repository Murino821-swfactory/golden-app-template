"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { useCopy, useCurrentAgent, useLookups, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { useSelected } from "@/hooks/use-selected";
import { addDocument, markDealLost, moveDeal, setDealTerms, toggleChecklist } from "@/lib/realestate/actions";
import { formatDate, formatMoney } from "@/lib/realestate/format";
import { blockingItems, commissionAmount, commissionBreakdown, daysInStage, isStaleDeal, nextStage, openChecklist, previousStage, weightedCommission } from "@/lib/realestate/metrics";
import { TEMPLATE_IDS, fullName, stagesFor, type CommissionBasis, type CommissionPayer, type Deal, type DealStage, type TemplateId, type Transaction } from "@/lib/realestate/model";
import { cn } from "@/lib/utils";
import { DealForm } from "./deal-form";
import { DealRail } from "./rail";
import { AmlPill, Money, PropertyFacts, RecordLink, StagePill, Timeline, useActionLabels, useAgentName, useNow } from "./shared";
import { ActionMenu, Checkbox, ConfirmDialog, DOC_TONE, Definition, Dot, Drawer, EmptyState, Field, FormRow, PageHeader, Panel, Pill, PrimaryButton, STAGE_TONE, SecondaryButton, Segmented, Select, TextArea, TextInput, type Tone } from "./ui";

// ── Card ─────────────────────────────────────────────────────────────────────────────

function DealCard({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const now = useNow();
  const property = lookups.property(deal.propertyId);
  const buyer = lookups.contact(deal.buyerId);
  if (!ws || !property) return null;
  const next = nextStage(deal);
  const prev = previousStage(deal);
  const open = openChecklist(deal).length;
  const stale = isStaleDeal(deal, now, ws.settings.staleDealDays);
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", deal.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      data-testid="deal-card"
      className="rounded-xl bg-card p-3 ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/30 motion-reduce:transition-none"
    >
      <div className="flex items-start gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-ring">
          <span className="block truncate text-sm font-medium">{property.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{buyer ? fullName(buyer) : "—"}</span>
        </button>
        <ActionMenu
          label={c.deals.menu}
          trigger={<button type="button" className="-mr-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal aria-hidden className="size-4" /></button>}
          items={[
            { label: c.common.open, onSelect: onOpen },
            { label: `${c.deals.moveForward}${next ? `: ${c.stage[next]}` : ""}`, onSelect: () => next && moveDeal(deal.id, next, labels), disabled: !next },
            { label: `${c.deals.moveBack}${prev ? `: ${c.stage[prev]}` : ""}`, onSelect: () => prev && moveDeal(deal.id, prev, labels), disabled: !prev },
          ]}
        />
      </div>
      <DealRail deal={deal} compact className="mt-2.5" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
        <span className="font-medium tabular-nums">{formatMoney(deal.agreedPrice, locale)}{deal.transaction === "rent" ? c.common.perMonth : ""}</span>
        <span className="tabular-nums text-muted-foreground">{formatMoney(commissionAmount(deal.commission, deal.agreedPrice), locale)}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">{stale && <Dot tone="warn" />}{c.deals.daysInStage(daysInStage(deal, now))}</span>
        {open > 0 && <span className="text-amber-300">{c.deals.openItems(open)}</span>}
      </div>
    </li>
  );
}

// ── Drawer ───────────────────────────────────────────────────────────────────────────

function DealDetail({ deal }: { deal: Deal }) {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const labels = useActionLabels();
  const lookups = useLookups(ws);
  const agentName = useAgentName();
  const now = useNow();
  const [closeOpen, setCloseOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [template, setTemplate] = useState<TemplateId>(deal.transaction === "rent" ? "lease" : "reservation");
  if (!ws) return null;
  const property = lookups.property(deal.propertyId);
  const buyer = lookups.contact(deal.buyerId);
  const seller = lookups.contact(deal.sellerId);
  const agent = lookups.agent(deal.agentId);
  const money = commissionBreakdown(deal, agent, ws.settings.vatPct);
  const stages = stagesFor(deal.transaction);
  const index = stages.indexOf(deal.stage);
  const next = nextStage(deal);
  const prev = previousStage(deal);
  const blocking = blockingItems(deal);
  const items = deal.checklist.filter((i) => stages.indexOf(i.stage) <= index);
  const docs = ws.documents.filter((d) => d.link.kind === "deal" && d.link.id === deal.id);
  const activities = ws.activities.filter((a) => a.link?.kind === "deal" && a.link.id === deal.id);
  const t = c.deals;
  const rent = deal.transaction === "rent";
  const ready = deal.stage === "handover" && blocking.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tabular-nums tracking-tight"><Money amount={deal.agreedPrice} period={deal.transaction} /></p>
          {property && <p className="mt-1 text-sm"><RecordLink link={{ kind: "property", id: property.id }}>{property.title}</RecordLink> · <PropertyFacts property={property} /></p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {deal.status === "open" ? <StagePill stage={deal.stage} /> : <Pill tone={deal.status === "won" ? "good" : "bad"}>{deal.status === "won" ? t.wonOn(formatDate(deal.closedAt ?? "", locale)) : t.lostOn(formatDate(deal.closedAt ?? "", locale))}</Pill>}
            <Pill>{c.transaction[deal.transaction]}</Pill>
            {deal.status === "open" && <Pill tone={isStaleDeal(deal, now, ws.settings.staleDealDays) ? "warn" : "neutral"}>{t.daysInStage(daysInStage(deal, now))}</Pill>}
            <Pill>{t.stageOf(index + 1, stages.length)}</Pill>
          </div>
        </div>
        {deal.status === "open" && (
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => prev && moveDeal(deal.id, prev, labels)} disabled={!prev}>{t.moveBack}</SecondaryButton>
            {next === "closed" ? (
              <PrimaryButton onClick={() => setCloseOpen(true)} data-testid="deal-close">{t.close}</PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => next && moveDeal(deal.id, next, labels)} disabled={!next} data-testid="deal-forward">{t.moveForward}{next ? `: ${c.stage[next]}` : ""}</PrimaryButton>
            )}
            <SecondaryButton onClick={() => setLostOpen(true)}>{t.markLost}</SecondaryButton>
          </div>
        )}
      </div>

      <Panel title={t.rail} hint={t.railHint} testId="deal-rail">
        <DealRail deal={deal} onJump={deal.status === "open" ? (stage) => moveDeal(deal.id, stage, labels) : undefined} className="py-2" />
      </Panel>

      <Panel title={t.checklist} hint={t.checklistHint} testId="deal-checklist" actions={blocking.length > 0 ? <Pill tone="warn">{t.blocking(blocking.length)}</Pill> : <Pill tone="good">{t.allDone}</Pill>}>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key} className={cn("flex items-start justify-between gap-3 rounded-lg px-2 py-1", item.stage === deal.stage ? "bg-background/60" : "")}>
              <Checkbox label={c.checklist[item.key]} checked={item.done} onChange={() => toggleChecklist(deal.id, item.key)} hint={item.stage !== deal.stage ? c.stage[item.stage] : undefined} />
              {item.doneAt && <span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.doneAt, locale)}</span>}
            </li>
          ))}
        </ul>
        {ready && <p className="mt-3 text-sm text-emerald-300">{t.allDone} — {t.close}.</p>}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t.parties}>
          <dl className="grid gap-3">
            <Definition label={rent ? t.tenant : t.buyer}>
              {buyer ? <span className="flex flex-wrap items-center gap-2"><RecordLink link={{ kind: "contact", id: buyer.id }}>{fullName(buyer)}</RecordLink><AmlPill status={buyer.aml.status} /></span> : "—"}
            </Definition>
            <Definition label={rent ? t.landlord : t.seller}>
              {seller ? <span className="flex flex-wrap items-center gap-2"><RecordLink link={{ kind: "contact", id: seller.id }}>{fullName(seller)}</RecordLink><AmlPill status={seller.aml.status} /></span> : "—"}
            </Definition>
            <Definition label={c.common.agent}>{agentName(deal.agentId)}</Definition>
            <Definition label={t.expectedClose}>{formatDate(deal.expectedClose, locale)}</Definition>
          </dl>
        </Panel>
        <Panel title={t.commission} hint={t.commissionHint} testId="deal-commission">
          <FormRow className="mb-3 sm:grid-cols-3">
            <Field label={t.form.commissionBasis}>{(id) => <Select id={id} value={deal.commission.basis} onChange={(e) => setDealTerms(deal.id, { commission: { ...deal.commission, basis: e.target.value as CommissionBasis } })} disabled={deal.status !== "open"}><option value="percent">{c.commissionBasis.percent}</option><option value="fixed">{c.commissionBasis.fixed}</option><option value="months">{c.commissionBasis.months}</option></Select>}</Field>
            <Field label={t.form.commissionValue}>{(id) => <TextInput id={id} type="number" min={0} step="0.1" value={deal.commission.value} onChange={(e) => setDealTerms(deal.id, { commission: { ...deal.commission, value: Number(e.target.value) } })} disabled={deal.status !== "open"} />}</Field>
            <Field label={t.payer}>{(id) => <Select id={id} value={deal.commission.payer} onChange={(e) => setDealTerms(deal.id, { commission: { ...deal.commission, payer: e.target.value as CommissionPayer } })} disabled={deal.status !== "open"}>{(["seller", "buyer", "both", "landlord", "tenant"] as CommissionPayer[]).map((p) => <option key={p} value={p}>{c.payer[p]}</option>)}</Select>}</Field>
          </FormRow>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t.gross}</dt><dd className="text-right font-semibold tabular-nums">{formatMoney(money.gross, locale)}</dd>
            <dt className="text-muted-foreground">{t.vat(ws.settings.vatPct)}</dt><dd className="text-right tabular-nums">{formatMoney(money.vat, locale)}</dd>
            <dt className="text-muted-foreground">{t.total}</dt><dd className="text-right tabular-nums">{formatMoney(money.total, locale)}</dd>
            <dt className="text-muted-foreground">{t.agentShare} ({agent?.split ?? 0} %)</dt><dd className="text-right tabular-nums">{formatMoney(money.agentShare, locale)}</dd>
            <dt className="text-muted-foreground">{t.agencyShare}</dt><dd className="text-right tabular-nums">{formatMoney(money.agencyShare, locale)}</dd>
            {deal.status === "open" && <><dt className="text-muted-foreground">{c.overview.kpi.pipelineCommission} ({t.weighted})</dt><dd className="text-right tabular-nums">{formatMoney(weightedCommission(deal), locale)}</dd></>}
          </dl>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t.reservation}>
          <FormRow>
            <Field label={t.deposit}>{(id) => <TextInput id={id} type="number" min={0} value={deal.reservation?.deposit ?? ""} onChange={(e) => setDealTerms(deal.id, { reservation: { deposit: Number(e.target.value), until: deal.reservation?.until ?? deal.expectedClose } })} disabled={deal.status !== "open"} />}</Field>
            <Field label={t.until}>{(id) => <TextInput id={id} type="date" value={deal.reservation?.until ?? ""} onChange={(e) => setDealTerms(deal.id, { reservation: { deposit: deal.reservation?.deposit ?? 0, until: e.target.value } })} disabled={deal.status !== "open"} />}</Field>
          </FormRow>
        </Panel>
        {!rent && (
          <Panel title={t.financing}>
            <FormRow>
              <Field label={t.bank}>{(id) => <TextInput id={id} value={deal.financing?.bank ?? ""} onChange={(e) => setDealTerms(deal.id, { financing: { bank: e.target.value, approved: deal.financing?.approved ?? false } })} disabled={deal.status !== "open"} />}</Field>
              <div className="pt-7"><Checkbox label={deal.financing?.approved ? t.approved : t.notApproved} checked={deal.financing?.approved ?? false} onChange={(approved) => setDealTerms(deal.id, { financing: { bank: deal.financing?.bank ?? "", approved } })} /></div>
            </FormRow>
          </Panel>
        )}
      </div>

      <Panel title={t.documents} testId="deal-documents" actions={deal.status === "open" ? (
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); addDocument(template, { kind: "deal", id: deal.id }, labels); }}>
          <Select aria-label={c.documents.template} value={template} onChange={(e) => setTemplate(e.target.value as TemplateId)} className="min-h-9 py-1 text-xs sm:text-xs">{TEMPLATE_IDS.map((id) => <option key={id} value={id}>{c.template[id]}</option>)}</Select>
          <SecondaryButton type="submit" className="min-h-9 px-3 text-xs">{t.generate}</SecondaryButton>
        </form>
      ) : undefined}>
        {docs.length === 0 ? <p className="text-sm text-muted-foreground">{c.documents.empty}</p> : (
          <ul className="space-y-2 text-sm">
            {docs.map((d) => <li key={d.id} className="flex items-center justify-between gap-2"><span>{c.template[d.templateId]} <span className="text-xs text-muted-foreground">· {formatDate(d.createdAt, locale)}</span></span><Pill tone={DOC_TONE[d.status]}>{c.docStatus[d.status]}</Pill></li>)}
          </ul>
        )}
      </Panel>

      <Panel title={c.common.notes}>
        <TextArea aria-label={c.common.notes} value={deal.notes} onChange={(e) => setDealTerms(deal.id, { notes: e.target.value })} className="min-h-20" />
      </Panel>

      <Panel title={c.common.timeline}>
        <Timeline activities={activities} link={{ kind: "deal", id: deal.id }} />
      </Panel>

      <ConfirmDialog open={closeOpen} onOpenChange={setCloseOpen} title={t.closeConfirm} text={t.closeText} confirmLabel={t.close} cancelLabel={c.common.cancel} onConfirm={() => moveDeal(deal.id, "closed", labels)} />
      <Drawer open={lostOpen} onOpenChange={setLostOpen} title={t.markLost} closeLabel={c.common.close}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); markDealLost(deal.id, lostReason.trim() || c.dealStatus.lost, labels); setLostOpen(false); }}>
          <Field label={t.lostReasonLabel}>{(id) => <TextArea id={id} value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder={t.lostReasonPlaceholder} className="min-h-20" />}</Field>
          <div className="flex justify-end gap-2"><SecondaryButton onClick={() => setLostOpen(false)}>{c.common.cancel}</SecondaryButton><PrimaryButton type="submit">{t.markLost}</PrimaryButton></div>
        </form>
      </Drawer>
    </div>
  );
}

// ── Board ────────────────────────────────────────────────────────────────────────────

export function Deals() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const labels = useActionLabels();
  const agent = useCurrentAgent(ws);
  const lookups = useLookups(ws);
  const [selected, setSelected] = useSelected();
  const [createOpen, setCreateOpen] = useState(false);
  const [transaction, setTransaction] = useState<Transaction>("sale");
  const [mine, setMine] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [dropTarget, setDropTarget] = useState<DealStage | null>(null);
  const deals = useMemo(() => (ws ? ws.deals.filter((d) => d.transaction === transaction && (!mine || d.agentId === agent?.id)) : []), [ws, transaction, mine, agent]);
  if (!ws) return null;
  const current = selected ? ws.deals.find((d) => d.id === selected) ?? null : null;
  const stages = stagesFor(transaction).filter((s) => s !== "closed");
  const closed = deals.filter((d) => d.status !== "open");
  const toneClass: Record<Tone, string> = { neutral: "border-foreground/15", good: "border-emerald-400/50", warn: "border-amber-400/50", bad: "border-rose-400/50", info: "border-sky-400/50", accent: "border-foreground" };
  return (
    <div className="space-y-6">
      <PageHeader title={c.deals.title} intro={c.deals.intro} actions={<PrimaryButton onClick={() => setCreateOpen(true)}><Plus aria-hidden />{c.deals.create}</PrimaryButton>} />
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label={c.deals.filters.transaction} value={transaction} onChange={setTransaction} options={[{ value: "sale", label: c.transaction.sale }, { value: "rent", label: c.transaction.rent }]} />
        {ws.settings.mode === "agency" && <Checkbox label={c.deals.filters.mine} checked={mine} onChange={setMine} />}
        <Checkbox label={c.deals.filters.showClosed} checked={showClosed} onChange={setShowClosed} />
      </div>
      <div data-testid="deals-board" className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const column = deals.filter((d) => d.status === "open" && d.stage === stage);
          const weighted = column.reduce((s, d) => s + weightedCommission(d), 0);
          return (
            <section
              key={stage}
              data-stage={stage}
              aria-label={c.stage[stage]}
              onDragOver={(e) => { e.preventDefault(); setDropTarget(stage); }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); setDropTarget(null); if (id) moveDeal(id, stage, labels); }}
              className={cn("flex w-64 shrink-0 flex-col rounded-2xl border-t-2 bg-background/40 p-2 ring-1 ring-foreground/10", toneClass[STAGE_TONE[stage]], dropTarget === stage && "ring-foreground/40")}
            >
              <header className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold">{c.stage[stage]}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">{column.length} · {formatMoney(weighted, locale)}</span>
              </header>
              <ul className="flex min-h-24 flex-col gap-2">
                {column.map((d) => <DealCard key={d.id} deal={d} onOpen={() => setSelected(d.id)} />)}
              </ul>
            </section>
          );
        })}
      </div>
      {deals.filter((d) => d.status === "open").length === 0 && <EmptyState title={c.deals.noneForTransaction} />}
      {showClosed && closed.length > 0 && (
        <Panel title={c.deals.filters.showClosed}>
          <ul className="divide-y divide-border/60 text-sm">
            {closed.map((d) => {
              const p = lookups.property(d.propertyId);
              const b = lookups.contact(d.buyerId);
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <button type="button" onClick={() => setSelected(d.id)} className="min-w-0 text-left hover:underline underline-offset-4"><span className="block font-medium">{p?.title}</span><span className="block text-xs text-muted-foreground">{b ? fullName(b) : ""} · {formatDate(d.closedAt ?? d.createdAt, locale)}</span></button>
                  <span className="flex items-center gap-2"><Money amount={d.agreedPrice} period={d.transaction} /><Pill tone={d.status === "won" ? "good" : "bad"}>{c.dealStatus[d.status]}</Pill></span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
      <Drawer open={current !== null} onOpenChange={(o) => !o && setSelected(null)} title={current ? lookups.property(current.propertyId)?.title ?? "" : ""} description={current ? `${lookups.contact(current.buyerId) ? fullName(lookups.contact(current.buyerId)!) : ""} · ${c.transaction[current.transaction]}` : undefined} closeLabel={c.common.close} wide testId="deal-drawer">
        {current && <DealDetail deal={current} />}
      </Drawer>
      <Drawer open={createOpen} onOpenChange={setCreateOpen} title={c.deals.create} closeLabel={c.common.close}>
        <DealForm propertyId={null} demandId={null} onDone={(id) => { setCreateOpen(false); if (id) setSelected(id); }} />
      </Drawer>
    </div>
  );
}
