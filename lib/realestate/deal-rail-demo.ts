import { checklistTemplate, SALE_STAGES, type ChecklistKey, type DealStage } from "./model";

/**
 * The landing's deal rail demo (T-384, from the T-344 v3 redesign): the workspace's own sale rail — the stations
 * from the offer to the handover and the checklist each one demands — so the landing shows exactly what the Deals
 * screen enforces. Pure; pinned by tests/deal-rail-demo.spec.ts.
 */
export function railStations(): { stage: DealStage; items: ChecklistKey[] }[] {
  const template = checklistTemplate("sale");
  return SALE_STAGES.filter((stage) => stage !== "closed").map((stage) => ({
    stage,
    items: template.filter((item) => item.stage === stage).map((item) => item.key),
  }));
}

/** The demo's own words; stations, checklist items and hints come from the workspace copy. */
export const DEAL_RAIL_DEMO_COPY = {
  en: { kicker: "Demo", done: "Keys handed over. Nothing was forgotten." },
  sk: { kicker: "Ukážka", done: "Kľúče odovzdané. Na nič sa nezabudlo." },
} as const;
