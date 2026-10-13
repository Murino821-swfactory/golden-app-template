/**
 * checkin-copy.ts — every word the daily check-in shows, in English (default, US) and
 * Slovak (golden product rule 4). The build renders one locale; the other is ready for the
 * day locale routing lands.
 */

import type { LevelId, PillarId, Scope, SpecialBadgeId, StreakTier } from "./checkin-engine";

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
  scopeAll: string;
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

  // ── Motivation layer (2026-10-13) ──
  shields: (n: number) => string;
  shieldsHint: string;
  shieldCovered: (date: string) => string;
  levelTitle: string;
  levelName: Record<LevelId, string>;
  levelProgress: (into: number, span: number, next: string) => string;
  levelTop: string;
  xpTotal: (xp: number) => string;
  xpHint: string;
  focusTitle: string;
  focusBody: (pillar: string) => string;
  focusBalanced: string;
  focusEmpty: string;
  celebrate: string;
  celebrateBody: (xp: number) => string;
  comebackTitle: string;
  comebackShielded: string;
  comebackFresh: string;
  firstRunTitle: string;
  firstRunSteps: [string, string, string];
  trophiesTitle: string;
  trophiesEmpty: string;
  tierBadge: (scope: string, tier: StreakTier) => string;
  tierLocked: (scope: string, tier: StreakTier) => string;
  specialBadge: Record<SpecialBadgeId, { title: string; body: string }>;
  earnedOn: (date: string) => string;
  locked: string;
  recapTitle: (range: string) => string;
  recapNone: string;
  recapTotal: (total: number, previous: number) => string;
  recapFullDays: (n: number) => string;
  recapStrongest: (pillars: string) => string;
  recapWeakest: (pillars: string) => string;
  share: string;
  shareTitle: string;
  shareBody: string;
  shareCardStreak: (n: number) => string;
  shareCardLevel: (name: string) => string;
  shareCardTagline: string;
  shareNow: string;
  shareDownload: string;
  shareImageAlt: string;
  shareFailed: string;
  remind: string;
  remindTitle: string;
  remindBody: string;
  remindTime: string;
  remindGoogle: string;
  remindIcs: string;
  remindEventTitle: string;
  remindEventBody: string;
  installTitle: string;
  installBody: string;
  installButton: string;
  installIos: string;
  installAndroid: string;
  dismiss: string;
  close: string;
  cloudSignedOut: string;
  cloudSignIn: string;
  cloudSyncing: string;
  cloudSynced: string;
  cloudUnavailable: string;
  cloudError: string;
}

const EN: Copy = {
  intl: "en-US",
  pageTitle: "Daily check-in",
  pageIntro:
    "Tap each pillar you showed up for. Streaks, shields, XP and your month fill in as you go — saved on this device, and synced to your account when you sign in.",
  pillars: { work: "Work", fitness: "Fitness", mind: "Mind", relationships: "Relationships", habits: "Habits" },
  scopeAll: "All five",
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

  shields: (n) => (n === 1 ? "1 shield" : `${n} shields`),
  shieldsHint: "Every 7 days in a row earns a shield (max 2). A shield covers one missed day, so the streak survives it.",
  shieldCovered: (date) => `A shield covered ${date}.`,
  levelTitle: "Level",
  levelName: {
    paper: "Paper",
    wood: "Wood",
    stone: "Stone",
    iron: "Iron",
    steel: "Steel",
    titanium: "Titanium",
    diamond: "Diamond",
    unbroken: "Unbroken",
  },
  levelProgress: (into, span, next) => `${into} / ${span} XP to ${next}`,
  levelTop: "Top level reached",
  xpTotal: (n) => `${n} XP`,
  xpHint: "10 XP per pillar, +25 XP for a full day.",
  focusTitle: "Today's focus",
  focusBody: (pillar) => `${pillar} got the least attention this week. One tap there today evens the balance.`,
  focusBalanced: "All five pillars are level this week. Keep the balance.",
  focusEmpty: "Start anywhere. The first tap is the whole trick.",
  celebrate: "Full day!",
  celebrateBody: (n) => `All five pillars done — +${n} XP today.`,
  comebackTitle: "Welcome back.",
  comebackShielded: "One missed day won't break you — your shield covered yesterday and the streak lives on.",
  comebackFresh: "One missed day won't break you. Today counts the same as any other — tap what you showed up for.",
  firstRunTitle: "How Unbroken works",
  firstRunSteps: [
    "Tap each pillar you showed up for today. Five taps, ten seconds.",
    "Every tap earns XP, every 7-day streak earns a shield.",
    "Miss a day? A shield covers it. One missed day won't break you.",
  ],
  trophiesTitle: "Trophy case",
  trophiesEmpty: "Your first badge is one tap away.",
  tierBadge: (scope, tier) => `${scope}: ${tier}-day streak`,
  tierLocked: (scope, tier) => `${scope}: ${tier}-day streak, not yet`,
  specialBadge: {
    "first-checkin": { title: "First check-in", body: "You showed up. Everything else builds on this." },
    comeback: { title: "Comeback", body: "You returned after a missed day. That is the whole point." },
    "shield-saved": { title: "Shield up", body: "A shield covered a missed day and your streak survived." },
    "perfect-week": { title: "Perfect week", body: "Seven full days, Monday to Sunday." },
    "balanced-week": { title: "Balanced week", body: "Every pillar at least four times in one week." },
    century: { title: "Century", body: "One hundred pillar check-ins." },
  },
  earnedOn: (date) => `Earned ${date}`,
  locked: "Not yet",
  recapTitle: (range) => `Last week, ${range}`,
  recapNone: "Your first weekly recap arrives after a full Monday-to-Sunday week.",
  recapTotal: (total, previous) =>
    `${total} of 35 check-ins` +
    (total === previous ? ", same as the week before." : total > previous ? `, up ${total - previous} on the week before.` : `, down ${previous - total} on the week before.`),
  recapFullDays: (n) => (n === 1 ? "1 full day." : `${n} full days.`),
  recapStrongest: (pillars) => `Strongest: ${pillars}.`,
  recapWeakest: (pillars) => `Needs love: ${pillars}.`,
  share: "Share",
  shareTitle: "Share your streak",
  shareBody: "A card for Instagram, WhatsApp or wherever your people are.",
  shareCardStreak: (n) => (n === 1 ? "1-day streak" : `${n}-day streak`),
  shareCardLevel: (name) => `Level: ${name}`,
  shareCardTagline: "One missed day won't break you.",
  shareNow: "Share",
  shareDownload: "Download image",
  shareImageAlt: "Your streak card",
  shareFailed: "Could not draw the card in this browser.",
  remind: "Daily reminder",
  remindTitle: "Daily reminder",
  remindBody: "Put a daily check-in reminder in the calendar you already look at.",
  remindTime: "Remind me at",
  remindGoogle: "Add to Google Calendar",
  remindIcs: "Download .ics (Apple, Outlook)",
  remindEventTitle: "Unbroken check-in",
  remindEventBody: "Ten seconds: tap the pillars you showed up for today.",
  installTitle: "Add Unbroken to your home screen",
  installBody: "Opens like an app, one tap from your home screen.",
  installButton: "Install",
  installIos: "On iPhone: Share, then \"Add to Home Screen\".",
  installAndroid: "In your browser menu choose \"Add to Home screen\" or \"Install app\".",
  dismiss: "Not now",
  close: "Close",
  cloudSignedOut: "Saved on this device only.",
  cloudSignIn: "Sign in to sync across devices",
  cloudSyncing: "Syncing…",
  cloudSynced: "Synced to your account",
  cloudUnavailable: "Cloud sync is not available for this app yet — saved on this device.",
  cloudError: "Sync failed; saved on this device and retried next time.",
};

const SK: Copy = {
  intl: "sk-SK",
  pageTitle: "Denný check-in",
  pageIntro:
    "Ťuknite na každý pilier, ktorému ste sa dnes venovali. Série, štíty, XP aj celý mesiac sa dopĺňajú priebežne — uložené v tomto zariadení a po prihlásení synchronizované s účtom.",
  pillars: { work: "Práca", fitness: "Fitness", mind: "Myseľ", relationships: "Vzťahy", habits: "Návyky" },
  scopeAll: "Všetkých päť",
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

  shields: (n) => `${n} ${sk(n, "štít", "štíty", "štítov")}`,
  shieldsHint: "Každých 7 dní v rade získate štít (max 2). Štít pokryje jeden vynechaný deň, séria ho prežije.",
  shieldCovered: (date) => `Štít pokryl ${date}.`,
  levelTitle: "Úroveň",
  levelName: {
    paper: "Papier",
    wood: "Drevo",
    stone: "Kameň",
    iron: "Železo",
    steel: "Oceľ",
    titanium: "Titán",
    diamond: "Diamant",
    unbroken: "Unbroken",
  },
  levelProgress: (into, span, next) => `${into} / ${span} XP do úrovne ${next}`,
  levelTop: "Najvyššia úroveň dosiahnutá",
  xpTotal: (n) => `${n} XP`,
  xpHint: "10 XP za pilier, +25 XP za úplný deň.",
  focusTitle: "Dnešný fokus",
  focusBody: (pillar) => `${pillar} dostal tento týždeň najmenej pozornosti. Jedno ťuknutie dnes vyrovná rovnováhu.`,
  focusBalanced: "Všetkých päť pilierov je tento týždeň vyrovnaných. Držte rovnováhu.",
  focusEmpty: "Začnite kdekoľvek. Prvé ťuknutie je celý trik.",
  celebrate: "Úplný deň!",
  celebrateBody: (n) => `Všetkých päť pilierov hotových — dnes +${n} XP.`,
  comebackTitle: "Vitajte späť.",
  comebackShielded: "Jeden vynechaný deň vás nezlomí — štít pokryl včerajšok a séria žije ďalej.",
  comebackFresh: "Jeden vynechaný deň vás nezlomí. Dnešok sa počíta ako každý iný — ťuknite, čomu ste sa venovali.",
  firstRunTitle: "Ako Unbroken funguje",
  firstRunSteps: [
    "Ťuknite na každý pilier, ktorému ste sa dnes venovali. Päť ťuknutí, desať sekúnd.",
    "Každé ťuknutie dáva XP, každá 7-dňová séria dáva štít.",
    "Vynechali ste deň? Pokryje ho štít. Jeden vynechaný deň vás nezlomí.",
  ],
  trophiesTitle: "Vitrína",
  trophiesEmpty: "Prvý odznak je jedno ťuknutie ďaleko.",
  tierBadge: (scope, tier) => `${scope}: séria ${tier} dní`,
  tierLocked: (scope, tier) => `${scope}: séria ${tier} dní, zatiaľ nie`,
  specialBadge: {
    "first-checkin": { title: "Prvý check-in", body: "Ukázali ste sa. Všetko ostatné stavia na tomto." },
    comeback: { title: "Návrat", body: "Vrátili ste sa po vynechanom dni. O tom to celé je." },
    "shield-saved": { title: "Štít hore", body: "Štít pokryl vynechaný deň a séria prežila." },
    "perfect-week": { title: "Dokonalý týždeň", body: "Sedem úplných dní, od pondelka do nedele." },
    "balanced-week": { title: "Vyrovnaný týždeň", body: "Každý pilier aspoň štyrikrát za jeden týždeň." },
    century: { title: "Stovka", body: "Sto check-inov pilierov." },
  },
  earnedOn: (date) => `Získané ${date}`,
  locked: "Zatiaľ nie",
  recapTitle: (range) => `Minulý týždeň, ${range}`,
  recapNone: "Prvý týždenný recap príde po celom týždni od pondelka do nedele.",
  recapTotal: (total, previous) =>
    `${total} z 35 check-inov` +
    (total === previous ? ", rovnako ako týždeň predtým." : total > previous ? `, o ${total - previous} viac než týždeň predtým.` : `, o ${previous - total} menej než týždeň predtým.`),
  recapFullDays: (n) => `${n} ${sk(n, "úplný deň", "úplné dni", "úplných dní")}.`,
  recapStrongest: (pillars) => `Najsilnejšie: ${pillars}.`,
  recapWeakest: (pillars) => `Potrebuje lásku: ${pillars}.`,
  share: "Zdieľať",
  shareTitle: "Zdieľajte svoju sériu",
  shareBody: "Kartička na Instagram, WhatsApp alebo kamkoľvek, kde sú vaši ľudia.",
  shareCardStreak: (n) => `séria ${n} ${sk(n, "deň", "dni", "dní")}`,
  shareCardLevel: (name) => `Úroveň: ${name}`,
  shareCardTagline: "Jeden vynechaný deň vás nezlomí.",
  shareNow: "Zdieľať",
  shareDownload: "Stiahnuť obrázok",
  shareImageAlt: "Vaša kartička so sériou",
  shareFailed: "V tomto prehliadači sa kartičku nepodarilo nakresliť.",
  remind: "Denná pripomienka",
  remindTitle: "Denná pripomienka",
  remindBody: "Dajte si denný check-in do kalendára, do ktorého aj tak pozeráte.",
  remindTime: "Pripomenúť o",
  remindGoogle: "Pridať do Google Kalendára",
  remindIcs: "Stiahnuť .ics (Apple, Outlook)",
  remindEventTitle: "Unbroken check-in",
  remindEventBody: "Desať sekúnd: ťuknite na piliere, ktorým ste sa dnes venovali.",
  installTitle: "Pridajte si Unbroken na plochu",
  installBody: "Otvára sa ako aplikácia, jedným ťuknutím z plochy.",
  installButton: "Inštalovať",
  installIos: "Na iPhone: Zdieľať a potom „Pridať na plochu“.",
  installAndroid: "V menu prehliadača vyberte „Pridať na plochu“ alebo „Inštalovať aplikáciu“.",
  dismiss: "Teraz nie",
  close: "Zavrieť",
  cloudSignedOut: "Uložené iba v tomto zariadení.",
  cloudSignIn: "Prihláste sa a synchronizujte medzi zariadeniami",
  cloudSyncing: "Synchronizuje sa…",
  cloudSynced: "Synchronizované s účtom",
  cloudUnavailable: "Cloudová synchronizácia pre túto aplikáciu zatiaľ nie je dostupná — uložené v tomto zariadení.",
  cloudError: "Synchronizácia zlyhala; uložené v zariadení, skúsi sa nabudúce.",
};

export const COPY: Record<CheckinLocale, Copy> = { en: EN, sk: SK };

/** The label of a streak scope — a pillar's name or "All five". */
export function scopeLabel(copy: Copy, scope: Scope): string {
  return scope === "all" ? copy.scopeAll : copy.pillars[scope];
}
