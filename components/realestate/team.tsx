"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useCopy, useCurrentAgent, useLookups, useWorkspace, useWorkspaceLocale } from "@/hooks/use-workspace";
import { addAgent, updateSettings } from "@/lib/realestate/actions";
import { formatDate, formatMoney, formatMonth } from "@/lib/realestate/format";
import { byAgent, statementFor } from "@/lib/realestate/metrics";
import { AGENT_ROLES, addMonths, fullName, monthKey, type Agent, type AgentRole } from "@/lib/realestate/model";
import { Money, useNow } from "./shared";
import { Avatar, DataList, Drawer, Field, FormRow, PageHeader, Panel, Pill, PrimaryButton, SecondaryButton, Select, TextButton, TextInput, type Column } from "./ui";

function AgentForm({ onDone }: { onDone: () => void }) {
  const c = useCopy();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<AgentRole>("agent");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [split, setSplit] = useState(60);
  const f = c.team.form;
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!lastName.trim()) return; addAgent({ firstName: firstName.trim(), lastName: lastName.trim(), role, email: email.trim(), phone: phone.trim(), split, since: new Date().toISOString().slice(0, 10) }); onDone(); }}>
      <FormRow>
        <Field label={f.firstName}>{(id) => <TextInput id={id} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}</Field>
        <Field label={f.lastName} required>{(id) => <TextInput id={id} value={lastName} onChange={(e) => setLastName(e.target.value)} required />}</Field>
        <Field label={f.role}>{(id) => <Select id={id} value={role} onChange={(e) => setRole(e.target.value as AgentRole)}>{AGENT_ROLES.map((r) => <option key={r} value={r}>{c.agentRole[r]}</option>)}</Select>}</Field>
        <Field label={f.split}>{(id) => <TextInput id={id} type="number" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} />}</Field>
        <Field label={f.email}>{(id) => <TextInput id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label={f.phone}>{(id) => <TextInput id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}</Field>
      </FormRow>
      <div className="flex justify-end gap-2"><SecondaryButton onClick={onDone}>{c.common.cancel}</SecondaryButton><PrimaryButton type="submit">{c.common.save}</PrimaryButton></div>
    </form>
  );
}

export function Team() {
  const ws = useWorkspace();
  const c = useCopy();
  const locale = useWorkspaceLocale();
  const now = useNow();
  const current = useCurrentAgent(ws);
  const lookups = useLookups(ws);
  const [addOpen, setAddOpen] = useState(false);
  const [statementAgent, setStatementAgent] = useState("");
  const [month, setMonth] = useState(monthKey(addMonths(now, -1)));
  const since = useMemo(() => new Date(now.getFullYear(), 0, 1), [now]);
  const rows = useMemo(() => (ws ? byAgent(ws, since) : []), [ws, since]);
  const months = useMemo(() => Array.from({ length: 6 }, (_, i) => monthKey(addMonths(now, -i))), [now]);
  if (!ws) return null;
  const chosenAgent = statementAgent || current?.id || ws.agents[0]?.id || "";
  const statement = statementFor(ws, chosenAgent, month, ws.settings.vatPct);
  type Row = (typeof rows)[number] & { id: string };
  const data: Row[] = rows.map((r) => ({ ...r, id: r.agent.id }));
  const columns: Column<Row>[] = [
    { key: "name", label: c.team.columns.name, render: (r) => <span className="flex items-center gap-2.5"><Avatar name={`${r.agent.firstName} ${r.agent.lastName}`} className="size-8 text-[11px]" /><span><span className="block font-medium">{r.agent.firstName} {r.agent.lastName}{r.agent.id === current?.id ? <Pill className="ml-2">{c.team.current}</Pill> : null}</span><span className="block text-xs text-muted-foreground">{r.agent.email}</span></span></span> },
    { key: "role", label: c.team.columns.role, render: (r) => <span className="text-muted-foreground">{c.agentRole[r.agent.role]} · {c.team.split} {r.agent.split} %</span> },
    { key: "listings", label: c.team.columns.listings, className: "text-right", render: (r) => <span className="tabular-nums">{r.activeListings}</span> },
    { key: "open", label: c.team.columns.openDeals, className: "text-right", render: (r) => <span className="tabular-nums">{r.openDeals}</span> },
    { key: "won", label: c.team.columns.won, className: "text-right", render: (r) => <span className="tabular-nums">{r.wonDeals}</span> },
    { key: "gross", label: c.team.columns.gross, className: "text-right", render: (r) => <Money amount={r.gross} /> },
    { key: "share", label: c.team.columns.share, className: "text-right", render: (r) => <Money amount={r.agentShare} /> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={c.team.title} intro={c.team.intro} actions={<PrimaryButton onClick={() => setAddOpen(true)}><Plus aria-hidden />{c.team.add}</PrimaryButton>} />
      {ws.settings.mode === "solo" && <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{c.team.soloHint}</p>}
      <DataList rows={data} columns={columns} onOpen={(r) => updateSettings({ currentAgentId: r.agent.id })} openLabel={c.team.viewAs} ariaLabel={c.team.title} testId="team-list"
        renderCard={(r) => <span className="block space-y-1"><span className="font-medium">{r.agent.firstName} {r.agent.lastName}</span><span className="block text-xs text-muted-foreground">{c.agentRole[r.agent.role]} · {r.activeListings} {c.team.columns.listings.toLowerCase()} · {r.openDeals} {c.team.columns.openDeals.toLowerCase()}</span><span className="block text-sm"><Money amount={r.gross} /> → <Money amount={r.agentShare} /></span></span>} />
      <Panel title={c.team.statement} hint={c.team.statementHint} testId="commission-statement">
        <FormRow className="mb-4">
          <Field label={c.team.agentLabel}>{(id) => <Select id={id} value={chosenAgent} onChange={(e) => setStatementAgent(e.target.value)}>{ws.agents.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}</Select>}</Field>
          <Field label={c.team.month}>{(id) => <Select id={id} value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((m) => <option key={m} value={m}>{formatMonth(m, locale)}</option>)}</Select>}</Field>
        </FormRow>
        {statement.rows.length === 0 ? <p className="text-sm text-muted-foreground">{c.team.noDeals}</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="py-2 font-medium">{c.nav.properties}</th><th className="py-2 text-right font-medium">{c.deals.agreedPrice}</th><th className="py-2 text-right font-medium">{c.team.columns.gross}</th><th className="py-2 text-right font-medium">{c.team.columns.share}</th></tr></thead>
            <tbody>
              {statement.rows.map((r) => <tr key={r.deal.id} className="border-t border-border/60"><td className="py-2">{lookups.property(r.deal.propertyId)?.title} <span className="text-xs text-muted-foreground">· {fullName(lookups.contact(r.deal.buyerId) ?? { firstName: "", lastName: "" })} · {formatDate(r.deal.closedAt ?? "", locale)}</span></td><td className="py-2 text-right tabular-nums">{formatMoney(r.deal.agreedPrice, locale)}</td><td className="py-2 text-right tabular-nums">{formatMoney(r.gross, locale)}</td><td className="py-2 text-right tabular-nums">{formatMoney(r.agentShare, locale)}</td></tr>)}
            </tbody>
            <tfoot className="border-t border-border font-medium"><tr><td className="py-2">{c.team.totalGross}</td><td /><td className="py-2 text-right tabular-nums">{formatMoney(statement.gross, locale)}</td><td className="py-2 text-right tabular-nums">{formatMoney(statement.agentShare, locale)}</td></tr><tr className="text-xs text-muted-foreground"><td className="py-1">{c.team.totalAgency}</td><td /><td /><td className="py-1 text-right tabular-nums">{formatMoney(statement.agencyShare, locale)}</td></tr></tfoot>
          </table>
        )}
        <TextButton className="mt-3" onClick={() => window.print()}>{c.common.print}</TextButton>
      </Panel>
      <Drawer open={addOpen} onOpenChange={setAddOpen} title={c.team.add} closeLabel={c.common.close}>
        <AgentForm onDone={() => setAddOpen(false)} />
      </Drawer>
    </div>
  );
}

export type { Agent };
