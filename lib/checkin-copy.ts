/**
 * checkin-copy.ts — every word the daily check-in shows, in English (default, US) and
 * Slovak (golden product rule 4). The build renders one locale; the other is ready for the
 * day locale routing lands.
 */

import type { PillarId } from "./checkin-engine";

export type CheckinLocale = "en" | "sk";

export function checkinLocale(locale: string): CheckinLocale {
  return locale === "sk" ? "sk" : "en";
}

/** Slovak counts: 1 deň, 2–4 dni, 5+ dní. */
function sk(n: number, one: string, few: string, many: string): string {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
}

interface Copy {
  intl: string;
  pageTitle: string;
  pageIntro: string;
  pillars: Record<PillarId, string>;
  today: string;
  yesterday: string;
  pickDate: string;
  dayProgress: (done: number) => string;
  streak: (current: number, best: number) => string;
  noteLabel: string;
  notePlaceholder: string;
  saved: string;
  storageBlocked: string;
  overallTitle: string;
  overallBody: (current: number, best: number) => string;
  consistencyTitle: string;
  last7: string;
  last30: string;
  balanceTitle: string;
  balanceAria: (range: string, values: string) => string;
  monthLess: string;
  monthMore: string;
  heatCell: (date: string, count: number) => string;
  weekdays: [mon: string, wed: string, fri: string];
}

const EN: Copy = {
  intl: "en-US",
  pageTitle: "Daily check-in",
  pageIntro:
    "Tap each pillar you showed up for. Streaks, balance and your month fill in as you go — saved on this device, no account needed.",
  pillars: { work: "Work", fitness: "Fitness", mind: "Mind", relationships: "Relationships", habits: "Habits" },
  today: "Today",
  yesterday: "Yesterday",
  pickDate: "Pick a date",
  dayProgress: (done) => `${done} of 5 done`,
  streak: (current, best) =>
    current === 0 ? (best === 0 ? "No streak yet" : `No streak now, best ${best}`) : `${current}-day streak, best ${best}`,
  noteLabel: "Note for this day",
  notePlaceholder: "What helped, what got in the way…",
  saved: "Saved on this device",
  storageBlocked: "This browser blocks storage, so check-ins will be lost when you leave the page.",
  overallTitle: "All five pillars",
  overallBody: (current, best) =>
    current === 0
      ? `No full day in a row right now. Best run: ${best} ${best === 1 ? "day" : "days"}.`
      : `${current} full ${current === 1 ? "day" : "days"} in a row. Best run: ${best}.`,
  consistencyTitle: "Consistency",
  last7: "Last 7 days",
  last30: "Last 30 days",
  balanceTitle: "Week balance",
  balanceAria: (range, values) => `Week balance, ${range}: ${values}`,
  monthLess: "Less",
  monthMore: "More",
  heatCell: (date, count) => `${date}: ${count} of 5`,
  weekdays: ["Mon", "Wed", "Fri"],
};

const SK: Copy = {
  intl: "sk-SK",
  pageTitle: "Denný check-in",
  pageIntro:
    "Ťuknite na každý pilier, ktorému ste sa dnes venovali. Série, rovnováha aj celý mesiac sa dopĺňajú priebežne — uložené v tomto zariadení, bez účtu.",
  pillars: { work: "Práca", fitness: "Fitness", mind: "Myseľ", relationships: "Vzťahy", habits: "Návyky" },
  today: "Dnes",
  yesterday: "Včera",
  pickDate: "Vybrať dátum",
  dayProgress: (done) => `${done} z 5 hotové`,
  streak: (current, best) =>
    current === 0
      ? best === 0
        ? "Zatiaľ bez série"
        : `Teraz bez série, najlepšia ${best}`
      : `${current} ${sk(current, "deň", "dni", "dní")} v rade, najlepšia ${best}`,
  noteLabel: "Poznámka k dňu",
  notePlaceholder: "Čo pomohlo, čo prekážalo…",
  saved: "Uložené v tomto zariadení",
  storageBlocked: "Tento prehliadač blokuje úložisko, check-iny sa po odchode zo stránky stratia.",
  overallTitle: "Všetkých päť pilierov",
  overallBody: (current, best) =>
    current === 0
      ? `Momentálne žiadny úplný deň v rade. Najlepšia séria: ${best} ${sk(best, "deň", "dni", "dní")}.`
      : `${current} ${sk(current, "úplný deň", "úplné dni", "úplných dní")} v rade. Najlepšia séria: ${best}.`,
  consistencyTitle: "Konzistencia",
  last7: "Posledných 7 dní",
  last30: "Posledných 30 dní",
  balanceTitle: "Rovnováha týždňa",
  balanceAria: (range, values) => `Rovnováha týždňa ${range}: ${values}`,
  monthLess: "Menej",
  monthMore: "Viac",
  heatCell: (date, count) => `${date}: ${count} z 5`,
  weekdays: ["Po", "St", "Pi"],
};

export const COPY: Record<CheckinLocale, Copy> = { en: EN, sk: SK };
