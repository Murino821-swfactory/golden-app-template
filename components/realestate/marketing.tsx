"use client";

import { useMemo, useState } from "react";
import { useCopy, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { setPortal } from "@/lib/realestate/actions";
import { formatMoney, formatNumber } from "@/lib/realestate/format";
import { PORTALS, SYNDICATION_CYCLE, type Property, type WorkspaceLocale } from "@/lib/realestate/model";
import type { WorkspaceCopy } from "@/lib/realestate/copy";
import { cn } from "@/lib/utils";
import { RecordLink, useActionLabels } from "./shared";
import { EmptyState, Field, KpiTile, PageHeader, Panel, Pill, SYNDICATION_TONE, SecondaryButton, Select, TextArea } from "./ui";

/** A portal-ready description from the listing's facts — a starting text, never a claim. */
export function listingText(p: Property, c: WorkspaceCopy, locale: WorkspaceLocale): string {
  const sk = locale === "sk";
  const price = `${formatMoney(p.price, locale)}${p.transaction === "rent" ? ` ${c.common.perMonth}` : ""}`;
  const facts = [`${p.area} m²`, p.rooms > 0 ? `${p.rooms} ${c.common.rooms}` : null, p.floor !== null ? `${sk ? "poschodie" : "floor"} ${p.floor}${p.totalFloors ? `/${p.totalFloors}` : ""}` : null, p.yearBuilt ? `${sk ? "rok" : "built"} ${p.yearBuilt}` : null, c.condition[p.condition].toLowerCase()].filter(Boolean).join(" · ");
  const features = p.features.map((f) => c.feature[f].toLowerCase()).join(", ");
  const lines = [
    `${p.title} — ${c.transactionVerb[p.transaction].toLowerCase()}, ${price}`,
    `${[p.street, p.district, p.city].filter(Boolean).join(", ")}`,
    facts,
    p.description,
    features ? `${sk ? "Vybavenie" : "Features"}: ${features}.` : "",
    `${sk ? "Energetická trieda" : "Energy class"}: ${c.energyClass[p.energyClass]}.`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function socialText(p: Property, c: WorkspaceCopy, locale: WorkspaceLocale): string {
  const sk = locale === "sk";
  const hook = sk ? (p.transaction === "rent" ? "Nový prenájom v ponuke" : "Nová ponuka") : p.transaction === "rent" ? "New to rent" : "New listing";
  const top = p.features.slice(0, 3).map((f) => c.feature[f]).join(" · ");
  return [`${hook}: ${p.title}`, `${p.area} m²${p.rooms ? ` · ${p.rooms} ${c.common.rooms}` : ""} · ${formatMoney(p.price, locale)}${p.transaction === "rent" ? ` ${c.common.perMonth}` : ""}`, top, sk ? "Obhliadky dohodneme v správe." : "Message us for a viewing.", `#${p.city.replace(/\s/g, "")} #${c.propertyType[p.type].replace(/\s/g, "")} #reality`].filter(Boolean).join("\n");
}

export function Marketing() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const labels = useActionLabels();
  const [chosen, setChosen] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const active = useMemo(() => (ws ? ws.properties.filter((p) => p.status === "active" || p.status === "reserved") : []), [ws]);
  if (!ws) return null;
  const portals = PORTALS.filter((p) => ws.settings.portals.includes(p));
  const property = ws.properties.find((p) => p.id === chosen) ?? active[0];
  const stats = portals.map((portal) => ({ portal, live: active.filter((p) => p.portals[portal] === "live").length }));
  const views = active.reduce((s, p) => s + p.stats.views, 0);
  const inquiries = active.reduce((s, p) => s + p.stats.inquiries, 0);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      setCopied(null);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader title={c.marketing.title} intro={c.marketing.intro} />
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiTile label={c.marketing.portalStats} value={stats.reduce((s, x) => s + x.live, 0)} hint={c.marketing.live} />
        <KpiTile label={c.marketing.views} value={formatNumber(views, locale)} hint={c.marketing.live} />
        <KpiTile label={c.marketing.inquiries} value={formatNumber(inquiries, locale)} hint={c.marketing.live} tone="good" />
      </div>
      <Panel title={c.marketing.matrix} hint={c.marketing.matrixHint} testId="portal-matrix">
        {active.length === 0 ? <EmptyState title={c.marketing.noActive} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th scope="col" className="py-2 pr-3 font-medium">{c.nav.properties}</th>{portals.map((p) => <th key={p} scope="col" className="px-2 py-2 text-center font-medium">{c.portal[p]}</th>)}<th scope="col" className="px-2 py-2 text-right font-medium">{c.marketing.views}</th></tr>
              </thead>
              <tbody>
                {active.map((p) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="py-2 pr-3"><RecordLink link={{ kind: "property", id: p.id }} className="font-medium">{p.title}</RecordLink></td>
                    {portals.map((portal) => {
                      const state = p.portals[portal];
                      const next = SYNDICATION_CYCLE[(SYNDICATION_CYCLE.indexOf(state === "error" ? "off" : state) + 1) % SYNDICATION_CYCLE.length]!;
                      return (
                        <td key={portal} className="px-2 py-1.5 text-center">
                          <button type="button" onClick={() => setPortal(p.id, portal, next, labels)} aria-label={`${c.portal[portal]}: ${c.syndication[state]}`} className={cn("inline-flex min-h-8 min-w-20 items-center justify-center rounded-full px-2 text-xs font-medium ring-1 ring-inset", state === "live" ? "bg-emerald-400/10 text-emerald-200 ring-emerald-400/35" : state === "queued" ? "bg-amber-400/10 text-amber-200 ring-amber-400/35" : "bg-muted text-muted-foreground ring-foreground/10")}>{c.syndication[state]}</button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{formatNumber(p.stats.views, locale)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/60 text-xs text-muted-foreground"><td className="py-2 pr-3">{c.marketing.portalStats}</td>{stats.map((s) => <td key={s.portal} className="px-2 py-2 text-center tabular-nums">{c.marketing.perPortal(s.live)}</td>)}<td /></tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={c.marketing.generator} hint={c.marketing.generatorHint} testId="listing-generator">
          <Field label={c.marketing.pickProperty}>{(id) => <Select id={id} value={property?.id ?? ""} onChange={(e) => setChosen(e.target.value)}>{active.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>}</Field>
          {property && (
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between"><span className="text-sm font-medium">{c.marketing.listingText}</span><SecondaryButton className="min-h-8 px-3 text-xs" onClick={() => copy("listing", listingText(property, c, locale))}>{copied === "listing" ? c.common.copied : c.marketing.copyText}</SecondaryButton></div>
                <TextArea readOnly value={listingText(property, c, locale)} className="min-h-40 text-xs" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between"><span className="text-sm font-medium">{c.marketing.socialText}</span><SecondaryButton className="min-h-8 px-3 text-xs" onClick={() => copy("social", socialText(property, c, locale))}>{copied === "social" ? c.common.copied : c.marketing.copyText}</SecondaryButton></div>
                <TextArea readOnly value={socialText(property, c, locale)} className="min-h-28 text-xs" />
              </div>
            </div>
          )}
        </Panel>
        <Panel title={c.marketing.feeds} hint={c.marketing.feedsHint}>
          <ul className="space-y-2">
            {stats.map((s) => <li key={s.portal} className="flex items-center justify-between gap-2 text-sm"><span>{c.portal[s.portal]}</span><Pill tone={s.live > 0 ? SYNDICATION_TONE.live : SYNDICATION_TONE.off}>{c.marketing.perPortal(s.live)}</Pill></li>)}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
