import { test, expect } from "@playwright/test";
import { WORKSPACE_COPY } from "../lib/realestate/copy";
import { renderDocument } from "../lib/realestate/documents";
import {
  attention, averageDaysOnMarket, blockingItems, commissionAmount, commissionBreakdown, commissionByMonth, dealsByStage, funnel, kpis, matchesForDemand,
  nextStage, scoreMatch, weightedCommission,
} from "../lib/realestate/metrics";
import { checklistTemplate, freshChecklist, fullName, stagesFor, type Deal, type Demand, type Property } from "../lib/realestate/model";
import { seedWorkspace } from "../lib/realestate/seed";
import { parseWorkspace } from "../lib/realestate/store";
import { generatePayments } from "../lib/realestate/actions";

/**
 * The workspace's arithmetic, without a browser: matching, money, the overview's
 * attention list, reports, documents and the seed's integrity. Pure functions of a
 * workspace and a clock.
 */

const ws = seedWorkspace("en");
const now = new Date();

test.describe("seed", () => {
  test("every reference points at a record that exists, in both languages", () => {
    for (const locale of ["en", "sk"] as const) {
      const w = seedWorkspace(locale);
      const ids = {
        agents: new Set(w.agents.map((a) => a.id)),
        properties: new Set(w.properties.map((p) => p.id)),
        contacts: new Set(w.contacts.map((c) => c.id)),
        demands: new Set(w.demands.map((d) => d.id)),
      };
      for (const p of w.properties) {
        expect(ids.contacts.has(p.ownerId), `${p.id} owner`).toBe(true);
        expect(ids.agents.has(p.agentId), `${p.id} agent`).toBe(true);
      }
      for (const d of w.demands) {
        expect(ids.contacts.has(d.contactId)).toBe(true);
        if (d.propertyId) expect(ids.properties.has(d.propertyId)).toBe(true);
      }
      for (const v of w.viewings) {
        expect(ids.properties.has(v.propertyId)).toBe(true);
        expect(ids.contacts.has(v.contactId)).toBe(true);
        if (v.demandId) expect(ids.demands.has(v.demandId)).toBe(true);
      }
      for (const deal of w.deals) {
        expect(ids.properties.has(deal.propertyId)).toBe(true);
        expect(ids.contacts.has(deal.buyerId)).toBe(true);
        expect(ids.contacts.has(deal.sellerId)).toBe(true);
        expect(deal.checklist.map((i) => i.key)).toEqual(checklistTemplate(deal.transaction).map((i) => i.key));
      }
      for (const l of w.leases) {
        expect(ids.properties.has(l.propertyId)).toBe(true);
        expect(ids.contacts.has(l.tenantId)).toBe(true);
      }
      for (const doc of w.documents) {
        const pool = doc.link.kind === "deal" ? w.deals : doc.link.kind === "lease" ? w.leases : doc.link.kind === "property" ? w.properties : w.contacts;
        expect(pool.some((x) => x.id === doc.link.id), `${doc.id}`).toBe(true);
      }
      expect(w.settings.currentAgentId).toBe("ag-kollarova");
      expect(new Set(w.properties.map((p) => p.id)).size).toBe(w.properties.length);
      expect(new Set(w.contacts.map((p) => p.id)).size).toBe(w.contacts.length);
    }
  });

  test("the seed round-trips through the store's parser and foreign data is refused", () => {
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws))).properties.length).toBe(ws.properties.length);
    expect(() => parseWorkspace({ version: 1 })).toThrow();
    expect(() => parseWorkspace({ ...ws, version: 99 })).toThrow();
    expect(() => parseWorkspace({ ...ws, deals: [{ noId: true }] })).toThrow();
  });

  test("the Slovak copy mirrors the English one key for key", () => {
    const walk = (a: unknown, b: unknown, path: string) => {
      if (typeof a === "function") {
        expect(typeof b, path).toBe("function");
        return;
      }
      if (Array.isArray(a)) {
        expect(Array.isArray(b), path).toBe(true);
        return;
      }
      if (a && typeof a === "object") {
        expect(Object.keys(b as object).sort(), path).toEqual(Object.keys(a).sort());
        for (const key of Object.keys(a)) walk((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`);
        return;
      }
      expect(typeof b, path).toBe(typeof a);
    };
    walk(WORKSPACE_COPY.en, WORKSPACE_COPY.sk, "copy");
  });
});

test.describe("matching", () => {
  const demand = ws.demands.find((d) => d.id === "d-urban")!;
  test("scores a listing on type, location, budget, rooms, area and must-haves", () => {
    const travniky = ws.properties.find((p) => p.id === "p-travniky-3i")!;
    const result = scoreMatch(demand, travniky);
    expect(result.score).toBe(100);
    expect(result.reasons.every((r) => r.ok)).toBe(true);
  });
  test("rent never matches a sale demand, and a reserved listing is not offered", () => {
    expect(scoreMatch(demand, ws.properties.find((p) => p.id === "p-mierova-rent")!).score).toBe(0);
    expect(scoreMatch(demand, ws.properties.find((p) => p.id === "p-panenska-2i")!).score).toBe(0);
  });
  test("over budget by up to 10 % earns a partial score; above that nothing", () => {
    const base: Property = { ...ws.properties.find((p) => p.id === "p-travniky-3i")! };
    expect(scoreMatch(demand, { ...base, price: 250000 }).reasons.find((r) => r.criterion === "budget")?.partial).toBe(true);
    expect(scoreMatch(demand, { ...base, price: 260000 }).reasons.find((r) => r.criterion === "budget")?.ok).toBe(false);
  });
  test("ranks the portfolio for a demand, best first, above the threshold", () => {
    const ranked = matchesForDemand(ws, demand);
    expect(ranked[0]!.property.id).toBe("p-travniky-3i");
    expect(ranked.every((r, i) => i === 0 || ranked[i - 1]!.match.score >= r.match.score)).toBe(true);
    expect(ranked.every((r) => r.match.score >= 40)).toBe(true);
  });
});

test.describe("money", () => {
  test("commission by percent, fixed sum or months of rent", () => {
    expect(commissionAmount({ basis: "percent", value: 3 }, 185000)).toBe(5550);
    expect(commissionAmount({ basis: "fixed", value: 900 }, 24000)).toBe(900);
    expect(commissionAmount({ basis: "months", value: 1 }, 850)).toBe(850);
  });
  test("breakdown adds VAT and splits by the agent's share", () => {
    const deal = ws.deals.find((d) => d.id === "deal-panenska-farkas")!;
    const agent = ws.agents.find((a) => a.id === deal.agentId)!;
    const b = commissionBreakdown(deal, agent, 23);
    expect(b.gross).toBe(5550);
    expect(b.vat).toBe(1277);
    expect(b.total).toBe(6827);
    expect(b.agentShare).toBe(3330);
    expect(b.agencyShare).toBe(2220);
  });
  test("the pipeline weighs a deal by its station", () => {
    const deal = ws.deals.find((d) => d.id === "deal-senec-kralik")!;
    expect(weightedCommission(deal)).toBe(Math.round(9360 * 0.8));
    expect(dealsByStage(ws, "sale").find((s) => s.stage === "financing")?.count).toBe(1);
  });
  test("rent payments: one per month of the term, due on the 5th, paid up to a month", () => {
    const payments = generatePayments("2026-01-01", "2026-06-30", 700, "2026-03");
    expect(payments.map((p) => p.month)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]);
    expect(payments.filter((p) => p.paidAt).length).toBe(3);
    expect(payments[0]!.due).toBe("2026-01-05");
  });
});

test.describe("the rail", () => {
  test("a sale has seven stations, a rental five; checklists follow them", () => {
    expect(stagesFor("sale")).toHaveLength(7);
    expect(stagesFor("rent")).toHaveLength(5);
    expect(freshChecklist("rent").some((i) => i.key === "mortgageApplied")).toBe(false);
    expect(freshChecklist("sale").some((i) => i.key === "cadastreFiled")).toBe(true);
  });
  test("open items from the current and earlier stations block the next step", () => {
    const deal = ws.deals.find((d) => d.id === "deal-senec-kralik")!;
    expect(nextStage(deal)).toBe("cadastre");
    expect(blockingItems(deal).map((i) => i.key)).toEqual(["mortgageApproved", "lienRegistered"]);
    const won = ws.deals.find((d) => d.id === "deal-heckova-kucerova")!;
    expect(nextStage(won)).toBeNull();
    expect(blockingItems(won)).toHaveLength(0);
  });
});

test.describe("the overview", () => {
  test("KPIs for the whole agency and for one agent", () => {
    const all = kpis(ws, now, null);
    expect(all.activeListings).toBe(ws.properties.filter((p) => p.status === "active" || p.status === "reserved").length);
    expect(all.openDeals).toBe(3);
    expect(all.viewingsThisWeek).toBeGreaterThanOrEqual(2);
    expect(all.pipelineCommission).toBeGreaterThan(0);
    const petra = kpis(ws, now, "ag-hudecova");
    expect(petra.openDeals).toBe(0);
    expect(petra.activeListings).toBeLessThan(all.activeListings);
  });
  test("the attention list names today's real problems, worst first", () => {
    const items = attention(ws, now, null, fullName);
    const kinds = items.map((i) => i.kind);
    expect(kinds).toContain("unansweredDemand");
    expect(kinds).toContain("viewingToday");
    expect(kinds).toContain("reservationExpiring");
    expect(kinds).toContain("energyCertificateMissing");
    expect(kinds).toContain("exclusivityEnding");
    expect(kinds).toContain("leaseEnding");
    expect(kinds).toContain("rentOverdue");
    expect(kinds).toContain("consentExpiring");
    expect(kinds).toContain("staleDeal");
    expect(kinds).toContain("taskOverdue");
    expect(kinds).toContain("longOnMarket");
    expect(kinds).not.toContain("amlMissing");
    const order = { bad: 0, warn: 1, info: 2 };
    expect(items.every((it, i) => i === 0 || order[items[i - 1]!.tone] <= order[it.tone])).toBe(true);
    const unanswered = items.find((i) => i.kind === "unansweredDemand")!;
    expect(unanswered.subject).toBe("Filip Bielik");
    expect(unanswered.value).toBeGreaterThanOrEqual(24);
  });
  test("a deal past the contracts with an unidentified party is flagged", () => {
    const copy = JSON.parse(JSON.stringify(ws)) as typeof ws;
    const deal = copy.deals.find((d) => d.id === "deal-senec-kralik")!;
    copy.contacts.find((c) => c.id === deal.buyerId)!.aml.status = "none";
    const items = attention(copy, now, null, fullName);
    expect(items.find((i) => i.kind === "amlMissing")?.subject).toBe("Ondrej Králik");
  });
});

test.describe("reports", () => {
  test("funnel, days on market and commission by month come from the seed's closed deals", () => {
    const f = funnel(ws, new Date(now.getTime() - 200 * 86_400_000));
    expect(f.demands).toBe(ws.demands.length);
    expect(f.viewings).toBeGreaterThan(0);
    expect(f.won).toBe(ws.deals.filter((d) => d.status === "won" && d.createdAt >= new Date(now.getTime() - 200 * 86_400_000).toISOString()).length);
    expect(averageDaysOnMarket(ws)).toBeGreaterThan(0);
    const months = commissionByMonth(ws, now, 6);
    expect(months).toHaveLength(6);
    expect(months.reduce((s, m) => s + m.amount, 0)).toBe(5100 + 6150);
  });
});

test.describe("documents", () => {
  test("a reservation agreement carries the deal's price, deposit and parties in both languages", () => {
    const doc = ws.documents.find((d) => d.id === "doc-panenska-reservation")!;
    const en = renderDocument(ws, doc, "en", WORKSPACE_COPY.en);
    expect(en.title).toBe("Reservation agreement");
    expect(en.parties.map((p) => p.name)).toEqual(["Dávid Farkaš", "Helena Kováčová", "Reality Nábrežie"]);
    // Intl writes the group separator as a no-break or narrow space; compare on digits.
    const digits = (text: string) => text.replace(/[\s,.]/g, "");
    expect(en.clauses.some((c) => digits(c.body).includes("185000"))).toBe(true);
    expect(en.clauses.some((c) => digits(c.body).includes("5000"))).toBe(true);
    const sk = renderDocument(ws, doc, "sk", WORKSPACE_COPY.sk);
    expect(sk.title).toBe("Rezervačná zmluva");
    expect(sk.clauses.some((c) => digits(c.body).includes("185000"))).toBe(true);
  });
  test("every template renders for its natural record without throwing", () => {
    const links = { deal: ws.deals[0]!.id, property: ws.properties[0]!.id, lease: ws.leases[0]!.id, contact: ws.contacts[0]!.id } as const;
    const kinds: Record<string, keyof typeof links> = { brokerageExclusive: "property", brokerageNonExclusive: "property", reservation: "deal", purchase: "deal", lease: "lease", handover: "lease", cadastreFiling: "deal", gdprConsent: "contact", amlForm: "contact", powerOfAttorney: "property" };
    for (const [templateId, kind] of Object.entries(kinds)) {
      const rendered = renderDocument(ws, { id: "x", templateId: templateId as never, link: { kind, id: links[kind] }, status: "draft", createdAt: now.toISOString(), signedAt: null }, "sk", WORKSPACE_COPY.sk);
      expect(rendered.clauses.length, templateId).toBeGreaterThan(1);
    }
  });
});

test("types stay honest: a demand and a deal from the seed satisfy their shapes", () => {
  const d: Demand = ws.demands[0]!;
  const deal: Deal = ws.deals[0]!;
  expect(typeof d.budgetMax).toBe("number");
  expect(deal.stageHistory.length).toBeGreaterThan(0);
});
