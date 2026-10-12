/**
 * extract.ts — what a CV's plain text says about the candidate, for pre-filling the form.
 *
 * Heuristics, deliberately modest: the first line is usually the name (and, after a dash,
 * the title), an e-mail and a phone are regular expressions, and skills are whatever the
 * matcher's taxonomy recognises. Everything stays editable; nothing is sent anywhere.
 */
import { detectSkills } from "@/lib/cv-analyzer";

export interface ExtractedFields {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  skills: string[];
}

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE = /(?:\+|00)?\d[\d\s().-]{7,}\d/;
const NAME_SPLIT = /\s[—–|-]\s|,\s/;

function titleCase(word: string): string {
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

export function extractCandidateFields(text: string): ExtractedFields {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const first = lines[0] ?? "";
  let firstName = "", lastName = "", title = "";
  const [namePart, ...rest] = first.split(NAME_SPLIT);
  const words = (namePart ?? "").replace(/[^\p{L}\p{M}'. -]/gu, "").trim().split(/\s+/).filter(Boolean);
  // A name is two to four words with no digits; a heading like "Curriculum vitae" is not.
  if (words.length >= 2 && words.length <= 4 && !/\d|@/.test(namePart ?? "") && !/curriculum|resume|životopis/i.test(namePart ?? "")) {
    firstName = titleCase(words[0]!);
    lastName = words.slice(1).map(titleCase).join(" ");
    title = rest.join(" ").trim().slice(0, 80);
  }
  const email = EMAIL.exec(text)?.[0] ?? "";
  const phone = PHONE.exec(text.replace(email, ""))?.[0]?.replace(/\s{2,}/g, " ").trim() ?? "";
  const skills = detectSkills(text).filter((s) => s.category !== "keyword").map((s) => s.name);
  return { firstName, lastName, title, email, phone: phone.length <= 20 ? phone : "", skills };
}

/** "React, Node.js,  SQL" → ["React", "Node.js", "SQL"], de-duplicated, order kept. */
export function parseList(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(/[,\n;]/)) {
    const item = raw.trim();
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function mergeLists(a: readonly string[], b: readonly string[]): string[] {
  return parseList([...a, ...b].join(","));
}
