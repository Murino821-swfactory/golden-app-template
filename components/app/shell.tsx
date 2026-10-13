"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  AlarmClock, Briefcase, CalendarDays, FileText, Gavel, LayoutDashboard, Menu, Receipt, Scale, Settings, Users, UsersRound, X,
  type LucideIcon,
} from "lucide-react";
import { appCopy, asLocale, type NavId } from "@/lib/legal/copy";
import { useWorkspace } from "@/lib/legal/store";
import { localePath } from "@/lib/locale-routing";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui";

/**
 * The signed-in shell: a sidebar from `lg` up, a bottom bar on phones, the shared tokenwise
 * header above both (founder decision 2026-09-28 — it carries palette, font, language and
 * sign-in). The active item is a prop, not read from the router, so the same components
 * render in the test harness without `next/navigation`.
 */
export const NAV_ROUTES: Record<NavId, string> = {
  dashboard: "/dashboard",
  matters: "/matters",
  clients: "/clients",
  calendar: "/calendar",
  deadlines: "/deadlines",
  hearings: "/hearings",
  billing: "/billing",
  documents: "/documents",
  research: "/research",
  team: "/team",
  settings: "/settings",
};

const NAV_ICONS: Record<NavId, LucideIcon> = {
  dashboard: LayoutDashboard,
  matters: Briefcase,
  clients: Users,
  calendar: CalendarDays,
  deadlines: AlarmClock,
  hearings: Gavel,
  billing: Receipt,
  documents: FileText,
  research: Scale,
  team: UsersRound,
  settings: Settings,
};

const NAV_ORDER: NavId[] = ["dashboard", "matters", "clients", "calendar", "deadlines", "hearings", "billing", "documents", "research", "team", "settings"];
const BOTTOM: NavId[] = ["dashboard", "matters", "calendar", "deadlines"];

export function AppShell({ active, children }: { active: NavId; children: ReactNode }) {
  const locale = asLocale(useLocale());
  const copy = appCopy(locale);
  const { ws, update } = useWorkspace();
  const [more, setMore] = useState(false);

  // The shared header's height decides where the sticky sidebar starts (it varies by font).
  useEffect(() => {
    const header = document.querySelector("header");
    const apply = () => document.documentElement.style.setProperty("--app-top", `${header?.getBoundingClientRect().height ?? 76}px`);
    apply();
    const observer = header ? new ResizeObserver(apply) : null;
    if (header && observer) observer.observe(header);
    return () => observer?.disconnect();
  }, []);

  const me = ws?.members.find((m) => m.id === ws.currentMemberId);
  const item = (id: NavId, compact = false) => {
    const Icon = NAV_ICONS[id];
    const current = id === active;
    return (
      <Link
        key={id}
        href={localePath(locale, NAV_ROUTES[id])}
        aria-current={current ? "page" : undefined}
        onClick={() => setMore(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
          compact ? "min-h-12 flex-col justify-center gap-1 px-1 text-[0.65rem]" : "min-h-11 px-3",
          current ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="size-5 shrink-0" aria-hidden />
        <span className={cn(compact && "truncate")}>{copy.nav[id]}</span>
      </Link>
    );
  };

  return (
    <div data-app-shell className="mx-auto flex w-full max-w-[1440px] gap-8 px-4 sm:px-6">
      <aside className="sticky top-[var(--app-top,76px)] hidden h-[calc(100svh-var(--app-top,76px))] w-60 shrink-0 flex-col overflow-y-auto py-6 lg:flex" aria-label={copy.product.tagline}>
        <div className="mb-6 px-3">
          <p className="font-heading text-lg font-semibold leading-tight">{copy.product.name}</p>
          <p className="text-xs text-muted-foreground">{ws?.firm.name ?? copy.product.tagline}</p>
        </div>
        <nav className="flex flex-col gap-1" aria-label={copy.nav.dashboard}>
          {NAV_ORDER.map((id) => item(id))}
        </nav>
        <div className="mt-auto space-y-3 px-3 pt-6">
          {ws && me && (
            <div className="flex items-center gap-3 text-sm">
              <Avatar initials={me.initials} size="md" />
              <div className="min-w-0">
                <p className="truncate font-medium">{me.name}</p>
                <p className="truncate text-xs text-muted-foreground">{copy.roles[me.role]}</p>
              </div>
            </div>
          )}
          {ws && ws.kind === "firm" && ws.members.length > 1 && (
            <label className="block text-xs text-muted-foreground">
              <span className="sr-only">{copy.product.you}</span>
              <select
                value={ws.currentMemberId}
                onChange={(e) => update((w) => ({ ...w, currentMemberId: e.target.value }))}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                aria-label={copy.product.you}
              >
                {ws.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
          )}
          <p className="text-[0.7rem] leading-snug text-muted-foreground">{copy.product.demoLong}</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1 py-6 pb-28 lg:pb-12">{children}</div>

      <nav
        aria-label={copy.common.more}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden"
      >
        {BOTTOM.map((id) => item(id, true))}
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          aria-expanded={more}
          className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.65rem] font-medium", more ? "bg-muted text-foreground" : "text-muted-foreground")}
        >
          {more ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          {copy.common.more}
        </button>
      </nav>
      {more && (
        <div className="fixed inset-x-0 bottom-[3.75rem] z-30 max-h-[70svh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-3 shadow-lg lg:hidden">
          <p className="px-3 pb-2 text-xs text-muted-foreground">{ws?.firm.name}</p>
          <div className="grid grid-cols-2 gap-1">{NAV_ORDER.filter((id) => !BOTTOM.includes(id)).map((id) => item(id))}</div>
          <p className="px-3 pt-3 text-[0.7rem] text-muted-foreground">{copy.product.demoLong}</p>
        </div>
      )}
    </div>
  );
}
