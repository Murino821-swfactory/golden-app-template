import type { Client, Matter, PartyRole } from "./types";

/**
 * Conflict-of-interest check at intake (zákon č. 586/2003 Z. z. § 21; Advokátsky poriadok SAK).
 * A new client or opponent is compared with every client and party the workspace already
 * knows. Names are compared loosely — case, diacritics and company suffixes ignored — so
 * "NOVÁ STAVBA s.r.o." finds "Nova Stavba, s. r. o.". The lawyer decides; the check only shows.
 */
export interface ConflictHit {
  name: string;
  /** How the known party relates to the firm. */
  relation: "ourClient" | "opponent" | "otherParty";
  matterId: string;
  matterNumber: string;
  matterTitle: string;
  role: PartyRole | "client";
}

const SUFFIXES = /\b(s\s*\.?\s*r\s*\.?\s*o\.?|a\s*\.?\s*s\.?|k\s*\.?\s*s\.?|v\s*\.?\s*o\s*\.?\s*s\.?|spol\.?|s\.?p\.?|n\.?o\.?|o\.?z\.?|ltd\.?|gmbh|inc\.?)\b/g;

export function normaliseName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(SUFFIXES, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameName(a: string, b: string): boolean {
  const na = normaliseName(a);
  const nb = normaliseName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function findConflicts(
  known: { clients: readonly Client[]; matters: readonly Matter[] },
  candidates: readonly string[]
): ConflictHit[] {
  const hits: ConflictHit[] = [];
  const clientName = new Map(known.clients.map((c) => [c.id, c.name]));
  for (const candidate of candidates) {
    if (!candidate.trim()) continue;
    for (const matter of known.matters) {
      const owner = clientName.get(matter.clientId);
      if (owner && sameName(owner, candidate)) {
        hits.push({ name: owner, relation: "ourClient", matterId: matter.id, matterNumber: matter.number, matterTitle: matter.title, role: "client" });
      }
      for (const party of matter.parties) {
        if (party.role === "court" || party.role === "authority") continue;
        if (sameName(party.name, candidate)) {
          hits.push({
            name: party.name,
            relation: party.role === "opponent" ? "opponent" : "otherParty",
            matterId: matter.id,
            matterNumber: matter.number,
            matterTitle: matter.title,
            role: party.role,
          });
        }
      }
    }
  }
  // One line per (name, matter, role): the same party may appear through several candidates.
  const seen = new Set<string>();
  return hits.filter((h) => {
    const key = `${normaliseName(h.name)}|${h.matterId}|${h.role}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The verdict the intake form shows. An opponent in our files is the serious case. */
export function conflictLevel(hits: readonly ConflictHit[]): "none" | "review" | "block" {
  if (hits.length === 0) return "none";
  return hits.some((h) => h.relation === "opponent" || h.relation === "ourClient") ? "block" : "review";
}
