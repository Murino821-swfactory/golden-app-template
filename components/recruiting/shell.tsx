"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import {
  BarChart3, Briefcase, Building2, CalendarClock, KanbanSquare, LayoutDashboard, MoreHorizontal, ScanSearch, Search, Settings, Users, X,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useCopy, useWorkspace } from "@/hooks/use-workspace";
import { localePath, routeFromPathname } from "@/lib/locale-routing";
import { fullName, type Workspace } from "@/lib/recruiting/model";
import { isStorageBlocked } from "@/lib/recruiting/store";
import { cn } from "@/lib/utils";
import { Pill } from "./ui";

/**
 * The application shell: a sidebar from `lg` up, a bottom tab bar below it, the page in
 * between. The site header above it stays the shared tokenwise.sk header — the shell only
 * owns what is inside the prototype.
 */

export const WORKSPACE_ROUTES = [
  { id: "overview", route: "/workspace", icon: LayoutDashboard },
  { id: "pipeline", route: "/workspace/pipeline", icon: KanbanSquare },
  { id: "candidates", route: "/workspace/candidates", icon: Users },
  { id: "jobs", route: "/workspace/jobs", icon: Briefcase },
  { id: "clients", route: "/workspace/clients", icon: Building2 },
  { id: "interviews", route: "/workspace/interviews", icon: CalendarClock },
  { id: "matcher", route: "/workspace/matcher", icon: ScanSearch },
  { id: "reports", route: "/workspace/reports", icon: BarChart3 },
  { id: "settings", route: "/workspace/settings", icon: Settings },
] as const;

type RouteId = (typeof WORKSPACE_ROUTES)[number]["id"];

/** The four tabs a phone shows; the rest live behind "More". */
const PHONE_TABS: RouteId[] = ["overview", "pipeline", "candidates", "jobs"];

function isActive(current: string, route: string): boolean {
  return route === "/workspace" ? current === "/workspace" : current.startsWith(route);
}

interface SearchHit {
  kind: "candidate" | "job" | "client";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

function searchWorkspace(ws: Workspace, query: string, locale: string): SearchHit[] {
  const q = query.trim().toLocaleLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const c of ws.candidates) {
    const hay = `${fullName(c)} ${c.title} ${c.currentCompany} ${c.skills.join(" ")} ${c.tags.join(" ")}`.toLocaleLowerCase();
    if (hay.includes(q)) hits.push({ kind: "candidate", id: c.id, title: fullName(c), subtitle: c.title, href: `${localePath(locale, "/workspace/candidates")}?id=${c.id}` });
  }
  for (const j of ws.jobs) {
    const client = ws.clients.find((c) => c.id === j.clientId)?.name ?? "";
    if (`${j.title} ${client} ${j.location}`.toLocaleLowerCase().includes(q)) hits.push({ kind: "job", id: j.id, title: j.title, subtitle: client, href: `${localePath(locale, "/workspace/jobs")}?id=${j.id}` });
  }
  for (const c of ws.clients) {
    if (`${c.name} ${c.industry} ${c.contactName}`.toLocaleLowerCase().includes(q)) hits.push({ kind: "client", id: c.id, title: c.name, subtitle: c.industry, href: `${localePath(locale, "/workspace/clients")}?id=${c.id}` });
  }
  return hits.slice(0, 8);
}

function WorkspaceSearch({ ws, onNavigate }: { ws: Workspace | null; onNavigate?: () => void }) {
  const c = useCopy();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const hits = useMemo(() => (ws ? searchWorkspace(ws, query, locale) : []), [ws, query, locale]);
  const kindLabel: Record<SearchHit["kind"], string> = { candidate: c.nav.candidates, job: c.nav.jobs, client: c.nav.clients };
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

function NavLink({ id, route, icon: Icon, current, onClick }: { id: RouteId; route: string; icon: typeof LayoutDashboard; current: string; onClick?: () => void }) {
  const c = useCopy();
  const locale = useLocale();
  const active = isActive(current, route);
  return (
    <Link
      href={localePath(locale, route)}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors motion-reduce:transition-none",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
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

  return (
    <div data-workspace-shell className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <aside className="sticky top-24 hidden w-56 shrink-0 flex-col gap-5 self-start lg:flex" aria-label={c.nav.workspace}>
        <div>
          <p className="truncate text-sm font-semibold">{name}</p>
          <Pill tone="neutral" className="mt-1" title={c.nav.demoHint}>{c.nav.demoBadge}</Pill>
        </div>
        <WorkspaceSearch ws={ws} />
        <nav className="flex flex-col gap-0.5" aria-label={c.nav.workspace}>
          {WORKSPACE_ROUTES.map((r) => (
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
        <Suspense fallback={<PageSkeleton />}>{ws ? children : <PageSkeleton />}</Suspense>
      </div>

      {/* Phone tab bar: four destinations plus everything else behind "More". */}
      <nav
        aria-label={c.nav.workspace}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {WORKSPACE_ROUTES.filter((r) => PHONE_TABS.includes(r.id)).map((r) => {
          const active = isActive(current, r.route);
          return (
            <Link
              key={r.id}
              href={localePath(locale, r.route)}
              aria-current={active ? "page" : undefined}
              className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}
            >
              <r.icon aria-hidden className="size-5" />
              {c.nav[r.id]}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium", moreOpen ? "text-foreground" : "text-muted-foreground")}
        >
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
            <div className="mb-3">
              <WorkspaceSearch ws={ws} onNavigate={() => setMoreOpen(false)} />
            </div>
            <nav className="grid gap-0.5" aria-label={c.nav.more}>
              {WORKSPACE_ROUTES.map((r) => (
                <NavLink key={r.id} id={r.id} route={r.route} icon={r.icon} current={current} onClick={() => setMoreOpen(false)} />
              ))}
            </nav>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
