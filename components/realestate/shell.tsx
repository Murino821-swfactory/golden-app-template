"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import {
  BarChart3, Building2, CalendarClock, CheckSquare, FileText, Handshake, Inbox, KeyRound, LayoutDashboard, Megaphone, MoreHorizontal, Search, Settings, Users, UsersRound, X,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useCopy, useCurrentAgent, useWorkspace } from "@/hooks/use-workspace";
import { updateSettings } from "@/lib/realestate/actions";
import { useEffect } from "react";
import { fullName, type Workspace } from "@/lib/realestate/model";
import { isStorageBlocked } from "@/lib/realestate/store";
import { localePath, routeFromPathname } from "@/lib/locale-routing";
import { cn } from "@/lib/utils";
import { Pill, Select } from "./ui";

/**
 * The application shell: a sidebar from `lg` up, a bottom tab bar below it, the page in
 * between. The site header above it stays the shared tokenwise.sk header — the shell only
 * owns what is inside the prototype.
 */

export const WORKSPACE_ROUTES = [
  { id: "overview", route: "/workspace", icon: LayoutDashboard, agencyOnly: false },
  { id: "properties", route: "/workspace/properties", icon: Building2, agencyOnly: false },
  { id: "contacts", route: "/workspace/contacts", icon: Users, agencyOnly: false },
  { id: "demands", route: "/workspace/demands", icon: Inbox, agencyOnly: false },
  { id: "viewings", route: "/workspace/viewings", icon: CalendarClock, agencyOnly: false },
  { id: "deals", route: "/workspace/deals", icon: Handshake, agencyOnly: false },
  { id: "rentals", route: "/workspace/rentals", icon: KeyRound, agencyOnly: false },
  { id: "documents", route: "/workspace/documents", icon: FileText, agencyOnly: false },
  { id: "tasks", route: "/workspace/tasks", icon: CheckSquare, agencyOnly: false },
  { id: "marketing", route: "/workspace/marketing", icon: Megaphone, agencyOnly: false },
  { id: "team", route: "/workspace/team", icon: UsersRound, agencyOnly: true },
  { id: "reports", route: "/workspace/reports", icon: BarChart3, agencyOnly: false },
  { id: "settings", route: "/workspace/settings", icon: Settings, agencyOnly: false },
] as const;

type RouteId = (typeof WORKSPACE_ROUTES)[number]["id"];

/** The four tabs a phone shows; the rest live behind "More". */
const PHONE_TABS: RouteId[] = ["overview", "properties", "deals", "contacts"];

function isActive(current: string, route: string): boolean {
  return route === "/workspace" ? current === "/workspace" : current.startsWith(route);
}

interface SearchHit {
  kind: "property" | "contact" | "deal";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

function searchWorkspace(ws: Workspace, query: string, locale: string): SearchHit[] {
  const q = query.trim().toLocaleLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const p of ws.properties) {
    if (`${p.title} ${p.street} ${p.district} ${p.city}`.toLocaleLowerCase().includes(q)) hits.push({ kind: "property", id: p.id, title: p.title, subtitle: p.district || p.city, href: `${localePath(locale, "/workspace/properties")}?id=${p.id}` });
  }
  for (const x of ws.contacts) {
    const name = fullName(x);
    if (`${name} ${x.company} ${x.email} ${x.phone}`.toLocaleLowerCase().includes(q)) hits.push({ kind: "contact", id: x.id, title: name, subtitle: x.phone, href: `${localePath(locale, "/workspace/contacts")}?id=${x.id}` });
  }
  for (const d of ws.deals) {
    const p = ws.properties.find((x) => x.id === d.propertyId);
    const buyer = ws.contacts.find((x) => x.id === d.buyerId);
    if (p && `${p.title} ${buyer ? fullName(buyer) : ""}`.toLocaleLowerCase().includes(q)) hits.push({ kind: "deal", id: d.id, title: p.title, subtitle: buyer ? fullName(buyer) : "", href: `${localePath(locale, "/workspace/deals")}?id=${d.id}` });
  }
  return hits.slice(0, 8);
}

function WorkspaceSearch({ ws, onNavigate }: { ws: Workspace | null; onNavigate?: () => void }) {
  const c = useCopy();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const hits = useMemo(() => (ws ? searchWorkspace(ws, query, locale) : []), [ws, query, locale]);
  const kindLabel: Record<SearchHit["kind"], string> = { property: c.nav.properties, contact: c.nav.contacts, deal: c.nav.deals };
  return (
    <div className="relative">
      <label htmlFor="workspace-search" className="sr-only">{c.nav.search}</label>
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id="workspace-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={c.nav.searchPlaceholder}
        autoComplete="off"
        className="min-h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {query.trim().length >= 2 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg" aria-label={c.nav.search}>
          {hits.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{c.nav.noResults}</li>}
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.id}`}>
              <Link
                href={hit.href}
                onClick={() => {
                  setQuery("");
                  onNavigate?.();
                }}
                className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-sm hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{hit.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{kindLabel[hit.kind]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Who is "working" in the demo. In agency mode every colleague is selectable, so an owner
 * can look at an agent's desk; in solo mode there is one person. */
function Persona({ ws }: { ws: Workspace }) {
  const c = useCopy();
  const agent = useCurrentAgent(ws);
  if (ws.settings.mode === "solo" || ws.agents.length < 2) {
    return (
      <p className="truncate text-xs text-muted-foreground">
        {c.nav.viewingAs}: {agent ? `${agent.firstName} ${agent.lastName}` : "—"}
      </p>
    );
  }
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{c.nav.viewingAs}</span>
      <Select aria-label={c.nav.viewingAs} value={ws.settings.currentAgentId} onChange={(e) => updateSettings({ currentAgentId: e.target.value })} className="mt-1 min-h-9 py-1 text-xs sm:text-xs">
        {ws.agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.firstName} {a.lastName} · {c.agentRole[a.role]}
          </option>
        ))}
      </Select>
    </label>
  );
}

/** `?mode=solo|agency` from the landing's plan cards: open the demo in that chair, once,
 * then drop the parameter so a reload keeps whatever the visitor changed since. Solo
 * opens as an agent, agency as the owner. Renders inside the shell's Suspense. */
function ModeFromQuery({ ws }: { ws: Workspace }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const mode = params.get("mode");
  useEffect(() => {
    if (mode !== "solo" && mode !== "agency") return;
    const persona = mode === "agency" ? ws.agents.find((a) => a.role === "owner" || a.role === "manager") : ws.agents.find((a) => a.role === "agent");
    updateSettings({ mode, currentAgentId: persona?.id ?? ws.settings.currentAgentId });
    const next = new URLSearchParams(params.toString());
    next.delete("mode");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- apply once per visit with the parameter
  }, [mode]);
  return null;
}

function NavLink({ id, route, icon: Icon, current, onClick }: { id: RouteId; route: string; icon: typeof LayoutDashboard; current: string; onClick?: () => void }) {
  const c = useCopy();
  const locale = useLocale();
  const active = isActive(current, route);
  return (
    <Link
      href={localePath(locale, route)}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors motion-reduce:transition-none", active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {c.nav[id]}
    </Link>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const ws = useWorkspace();
  const c = useCopy();
  const current = routeFromPathname(usePathname());
  const locale = useLocale();
  const [moreOpen, setMoreOpen] = useState(false);
  const blocked = ws !== null && isStorageBlocked();
  const name = ws?.settings.agencyName || c.nav.workspace;
  const routes = WORKSPACE_ROUTES.filter((r) => !r.agencyOnly || ws?.settings.mode !== "solo");

  return (
    <div data-workspace-shell className="mx-auto flex w-full max-w-[88rem] gap-8 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <aside className="sticky top-24 hidden w-60 shrink-0 flex-col gap-4 self-start lg:flex" aria-label={c.nav.workspace}>
        <div>
          <p className="truncate text-sm font-semibold">{name}</p>
          <Pill tone="neutral" className="mt-1" title={c.nav.demoHint}>{c.nav.demoBadge}</Pill>
        </div>
        {ws && <Persona ws={ws} />}
        <WorkspaceSearch ws={ws} />
        <nav className="flex flex-col gap-0.5" aria-label={c.nav.workspace}>
          {routes.map((r) => (
            <NavLink key={r.id} id={r.id} route={r.route} icon={r.icon} current={current} />
          ))}
        </nav>
        <p className="text-xs leading-relaxed text-muted-foreground">{blocked ? c.common.storageError : c.nav.demoHint}</p>
      </aside>

      <div className="min-w-0 flex-1 pb-24 lg:pb-4">
        <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
          <p className="truncate text-sm font-semibold">{name}</p>
          <Pill tone="neutral" title={c.nav.demoHint}>{c.nav.demoBadge}</Pill>
        </div>
        {blocked && <p role="alert" className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100 lg:hidden">{c.common.storageError}</p>}
        <Suspense fallback={<PageSkeleton />}>
          {ws && <ModeFromQuery ws={ws} />}
          {ws ? children : <PageSkeleton />}
        </Suspense>
      </div>

      <nav aria-label={c.nav.workspace} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {WORKSPACE_ROUTES.filter((r) => PHONE_TABS.includes(r.id)).map((r) => {
          const active = isActive(current, r.route);
          return (
            <Link key={r.id} href={localePath(locale, r.route)} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>
              <r.icon aria-hidden className="size-5" />
              {c.nav[r.id]}
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium", moreOpen ? "text-foreground" : "text-muted-foreground")}>
          <MoreHorizontal aria-hidden className="size-5" />
          {c.nav.more}
        </button>
      </nav>

      <DialogPrimitive.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-card-foreground shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <DialogPrimitive.Title className="text-base font-semibold">{c.nav.more}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">{c.nav.workspace}</DialogPrimitive.Description>
              <DialogPrimitive.Close aria-label={c.common.close} className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
                <X className="size-5" aria-hidden />
              </DialogPrimitive.Close>
            </div>
            <div className="mb-3 space-y-3">
              {ws && <Persona ws={ws} />}
              <WorkspaceSearch ws={ws} onNavigate={() => setMoreOpen(false)} />
            </div>
            <nav className="grid gap-0.5" aria-label={c.nav.more}>
              {routes.map((r) => (
                <NavLink key={r.id} id={r.id} route={r.route} icon={r.icon} current={current} onClick={() => setMoreOpen(false)} />
              ))}
            </nav>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
