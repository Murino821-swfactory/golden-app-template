"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { WORKSPACE_COPY, workspaceLocale, type WorkspaceCopy } from "@/lib/realestate/copy";
import type { Agent, Contact, Deal, Demand, Lease, Property, Workspace, WorkspaceLocale } from "@/lib/realestate/model";
import { getServerSnapshot, getSnapshot, initWorkspace, subscribe } from "@/lib/realestate/store";

/** The workspace, or `null` before the client has loaded it. */
export function useWorkspace(): Workspace | null {
  const locale = useWorkspaceLocale();
  useEffect(() => initWorkspace(locale), [locale]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useWorkspaceLocale(): WorkspaceLocale {
  return workspaceLocale(useLocale());
}

export function useCopy(): WorkspaceCopy {
  return WORKSPACE_COPY[useWorkspaceLocale()];
}

/** Id → record maps, so a row can name its property and people without a search per row. */
export interface Lookups {
  property: (id: string) => Property | undefined;
  contact: (id: string) => Contact | undefined;
  agent: (id: string) => Agent | undefined;
  demand: (id: string) => Demand | undefined;
  deal: (id: string) => Deal | undefined;
  lease: (id: string) => Lease | undefined;
}

export function useLookups(ws: Workspace | null): Lookups {
  return useMemo(() => {
    const properties = new Map(ws?.properties.map((p) => [p.id, p]));
    const contacts = new Map(ws?.contacts.map((c) => [c.id, c]));
    const agents = new Map(ws?.agents.map((a) => [a.id, a]));
    const demands = new Map(ws?.demands.map((d) => [d.id, d]));
    const deals = new Map(ws?.deals.map((d) => [d.id, d]));
    const leases = new Map(ws?.leases.map((l) => [l.id, l]));
    return {
      property: (id) => properties.get(id),
      contact: (id) => contacts.get(id),
      agent: (id) => agents.get(id),
      demand: (id) => demands.get(id),
      deal: (id) => deals.get(id),
      lease: (id) => leases.get(id),
    };
  }, [ws]);
}

/** The signed-in persona of the demo: the agent whose desk is on screen. */
export function useCurrentAgent(ws: Workspace | null): Agent | null {
  return useMemo(() => ws?.agents.find((a) => a.id === ws.settings.currentAgentId) ?? ws?.agents[0] ?? null, [ws]);
}
