"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { appCopy, asLocale } from "@/lib/legal/copy";
import { addDays, todayIso } from "@/lib/legal/dates";
import { utilisation } from "@/lib/legal/billing";
import { formatMinutes, initialsOf, percent } from "@/lib/legal/format";
import { newId, useWorkspace } from "@/lib/legal/store";
import type { Member, Role } from "@/lib/legal/types";
import { localePath } from "@/lib/locale-routing";
import { NAV_ROUTES } from "../shell";
import { Avatar, Badge, Empty, Field, PageHeader, Panel, Progress, Select, TextInput } from "../ui";

const ROLES: Role[] = ["partner", "attorney", "associate", "paralegal", "assistant"];

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const copy = appCopy(useLocale());
  const { update } = useWorkspace();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("associate");
  const [email, setEmail] = useState("");
  const [rate, setRate] = useState(80);
  const [capacity, setCapacity] = useState(35);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const m: Member = { id: newId("m"), name: name.trim(), initials: initialsOf(name.trim()), role, email: email.trim(), hourlyRate: rate, capacityHoursWeek: capacity };
    update((w) => ({ ...w, members: [...w.members, m] }));
    setName(""); setEmail("");
    onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent closeLabel={copy.common.close}>
        <DialogTitle>{copy.team.invite}</DialogTitle>
        <DialogDescription>{copy.team.inviteHint}</DialogDescription>
        <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={copy.common.name} className="sm:col-span-2"><TextInput value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
          <Field label={copy.team.role}><Select value={role} onChange={(e) => setRole(e.target.value as Role)}>{ROLES.map((r) => <option key={r} value={r}>{copy.roles[r]}</option>)}</Select></Field>
          <Field label={copy.team.emailLabel}><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} /></Field>
          <Field label={`${copy.team.rateLabel} (${copy.common.perHour})`}><TextInput type="number" min={0} max={1000} value={rate} onChange={(e) => setRate(Number(e.target.value))} /></Field>
          <Field label={`${copy.team.capacity} (h / ${copy.common.week.toLowerCase()})`}><TextInput type="number" min={0} max={60} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></Field>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" className="h-11" onClick={onClose}>{copy.common.cancel}</Button><Button type="submit" className="h-11" disabled={!name.trim()}>{copy.common.save}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TeamPage() {
  const locale = asLocale(useLocale());
  const copy = appCopy(locale);
  const { ws } = useWorkspace();
  const [inviting, setInviting] = useState(false);
  if (!ws) return <p role="status" className="text-sm text-muted-foreground">{copy.common.loading}</p>;
  const today = todayIso();
  if (ws.kind === "solo") {
    return (
      <div>
        <PageHeader title={copy.team.title} intro={copy.team.intro} />
        <Panel title={copy.team.soloTitle}>
          <p className="text-sm text-muted-foreground">{copy.team.soloIntro}</p>
          <Button asChild className="mt-4 h-11"><a href={localePath(locale, NAV_ROUTES.settings)}>{copy.nav.settings}</a></Button>
        </Panel>
      </div>
    );
  }
  const stats = new Map(utilisation(ws.members, ws.timeEntries, addDays(today, -28), today).map((u) => [u.memberId, u]));
  return (
    <div>
      <PageHeader title={copy.team.title} intro={copy.team.intro} actions={<Button className="h-11" onClick={() => setInviting(true)}><Plus className="size-4" aria-hidden />{copy.team.invite}</Button>} />
      <p className="mb-3 text-xs text-muted-foreground">{copy.team.utilisationHint}</p>
      {ws.members.length === 0 ? <Empty>{copy.common.none}</Empty> : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{ws.members.map((m) => {
          const u = stats.get(m.id);
          const leads = ws.matters.filter((x) => x.leadId === m.id && x.stage !== "closed").length;
          const deadlines = ws.deadlines.filter((d) => d.responsibleId === m.id && d.status === "open").length;
          return (
            <li key={m.id} className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="flex items-center gap-3">
                <Avatar initials={m.initials} size="md" />
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{m.name}</p><p className="truncate text-xs text-muted-foreground">{copy.roles[m.role]} · {m.email}</p></div>
                {m.id === ws.currentMemberId && <Badge tone="accent">{copy.product.you}</Badge>}
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div><dt className="text-muted-foreground">{copy.team.openMatters}</dt><dd className="font-heading text-lg font-semibold tabular-nums">{leads}</dd></div>
                <div><dt className="text-muted-foreground">{copy.team.openDeadlines}</dt><dd className="font-heading text-lg font-semibold tabular-nums">{deadlines}</dd></div>
                <div><dt className="text-muted-foreground">{copy.team.rateLabel}</dt><dd className="font-heading text-lg font-semibold tabular-nums">{m.hourlyRate ? `${m.hourlyRate} ${copy.common.perHour}` : "—"}</dd></div>
              </dl>
              {m.capacityHoursWeek > 0 && u && (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{copy.team.utilisation}</span><span className="tabular-nums">{formatMinutes(u.billableMinutes)} · {percent(u.utilisation, locale)} · {copy.team.capacity} {m.capacityHoursWeek} h/{copy.common.week.toLowerCase()}</span></div>
                  <Progress value={u.utilisation} label={m.name} />
                </div>
              )}
            </li>
          );
        })}</ul>
      )}
      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
    </div>
  );
}
