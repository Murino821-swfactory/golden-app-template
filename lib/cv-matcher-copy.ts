/**
 * cv-matcher-copy.ts — every word the CV matcher shows or exports, in English (default)
 * and Slovak (golden product rule 4). The screen and the Markdown report read the same
 * strings, so an action keeps one name in both.
 */

import type { AnalysisResult, MatchTier, Recommendation, SkillHit } from "./cv-analyzer";

export type CvLocale = "en" | "sk";

export function cvLocale(locale: string): CvLocale {
  return locale === "sk" ? "sk" : "en";
}

interface Copy {
  pageTitle: string;
  pageIntro: string;
  samplesLabel: string;
  sampleButton: (label: string) => string;
  cvLabel: string;
  cvPlaceholder: string;
  jobLabel: string;
  jobPlaceholder: string;
  library: {
    title: string; intro: string; search: string; choose: string; defaults: string;
    saved: string; noMatches: string; use: string; roleTitle: string; category: string;
    categories: { ai: string; data: string; aws: string };
    save: string; update: string; remove: string; savedNotice: string; deletedNotice: string;
    loadedNotice: string; invalid: string; limit: string; storageError: string;
  };
  words: (n: number) => string;
  clear: string;
  importFile: string;
  importFileAriaLabel: string;
  importLinkedIn: string;
  importLinkedInAriaLabel: string;
  importDragHint: string;
  importDragInvalid: string;
  importLoading: string;
  importSuccess: (name: string) => string;
  importError: string;
  importTypeError: string;
  importSizeError: string;
  linkedInDialogTitle: string;
  linkedInDialogDesc: string;
  linkedInStep1: string;
  linkedInStep2: string;
  linkedInStep3: string;
  linkedInUpload: string;
  linkedInClose: string;
  emptyState: string;
  scoreLabel: string;
  tier: Record<MatchTier, string>;
  tierHint: Record<MatchTier, string>;
  keywordNotice: string;
  zones: [low: string, medium: string, high: string];
  matched: string;
  matchedEmpty: string;
  missing: string;
  missingEmpty: string;
  required: string;
  preferred: string;
  mentions: (n: number) => string;
  recommendations: string;
  groups: { add: string; strengthen: string; rephrase: string };
  exportMarkdown: string;
  print: string;
  reportTitle: string;
  reportDate: string;
  rec: {
    addKeyword: (skills: string) => string;
    addPreferred: (skills: string) => string;
    strengthen: (hit: SkillHit) => string;
    mirrorTitle: (title: string) => string;
    quantify: string;
    weakVerbs: (phrases: string[]) => string;
  };
}

const EN: Copy = {
  pageTitle: "Match a CV to a job",
  pageIntro:
    "Paste a CV and a job posting. The score, the skill gaps and the advice update as you type — nothing leaves your browser.",
  samplesLabel: "Try a sample",
  sampleButton: (label) => `Load sample: ${label}`,
  cvLabel: "CV",
  cvPlaceholder: "Paste the CV text here…",
  jobLabel: "Job posting",
  jobPlaceholder: "Paste the job description here…",
  library: {
    title: "Job title library",
    intro: "10 starter roles across AI, Data and AWS Cloud. Customize a description and save your own roles in this browser. Saved roles stay on this device; clearing browser data removes them.",
    search: "Search roles", choose: "Choose a role", defaults: "Default roles", saved: "Your saved roles",
    noMatches: "No roles match your search.", use: "Use role description",
    roleTitle: "Role title", category: "Role category",
    categories: { ai: "AI", data: "Data", aws: "AWS Cloud" },
    save: "Save current posting as a role", update: "Update saved role", remove: "Delete saved role",
    savedNotice: "Role saved in this browser.", deletedNotice: "Saved role deleted. Your posting is still available below.",
    loadedNotice: "Role description loaded. You can edit it below.",
    invalid: "Enter a role title (up to 120 characters) and a job description (up to 50,000 characters).",
    limit: "You can save up to 100 custom roles. Update or delete a saved role first.",
    storageError: "Saved roles could not be read or saved. Check browser storage settings, or reload if another tab changed the library. You can still use the default roles and paste a posting.",
  },
  words: (n) => `${n} ${n === 1 ? "word" : "words"}`,
  clear: "Clear",
  importFile: "Upload file",
  importFileAriaLabel: "Upload CV file (PDF, DOC, DOCX)",
  importLinkedIn: "LinkedIn",
  importLinkedInAriaLabel: "Import from LinkedIn — opens instructions",
  importDragHint: "Drop your CV here",
  importDragInvalid: "PDF, DOC or DOCX only",
  importLoading: "Reading file…",
  importSuccess: (name) => `Loaded: ${name}`,
  importError: "Could not read the file. Try a different format or paste the text.",
  importTypeError: "Only PDF, DOC and DOCX files are supported.",
  importSizeError: "File is too large. Maximum size is 5 MB.",
  linkedInDialogTitle: "Import from LinkedIn",
  linkedInDialogDesc:
    "LinkedIn doesn't support direct import. Export your profile as a PDF and upload it here.",
  linkedInStep1: "Open your LinkedIn profile",
  linkedInStep2: "Click More → Save to PDF",
  linkedInStep3: "Upload the downloaded file below",
  linkedInUpload: "Upload LinkedIn PDF",
  linkedInClose: "Done",
  emptyState: "Paste both texts, or load a sample, to see how well they match.",
  scoreLabel: "Match score",
  tier: { high: "Strong match", medium: "Partial match", low: "Weak match" },
  tierHint: {
    high: "The CV covers most of what the posting asks for.",
    medium: "The CV covers the core, but some requirements are missing.",
    low: "Most of the posting's requirements are not in the CV yet.",
  },
  keywordNotice:
    "This posting names no skills we recognise, so the score compares its key words instead.",
  zones: ["Weak", "Partial", "Strong"],
  matched: "Matched skills",
  matchedEmpty: "None of the posting's skills appear in the CV yet.",
  missing: "Missing skills",
  missingEmpty: "Nothing missing — the CV names every skill the posting asks for.",
  required: "Required",
  preferred: "Nice to have",
  mentions: (n) => `named ${n}× in the posting`,
  recommendations: "Recommendations",
  groups: {
    add: "Add to the CV",
    strengthen: "Keywords to strengthen",
    rephrase: "Rephrase your experience",
  },
  exportMarkdown: "Export Markdown",
  print: "Print summary",
  reportTitle: "CV match report",
  reportDate: "Generated",
  rec: {
    addKeyword: (skills) =>
      `Add ${skills} if you have the experience — they are required and recruiters' filters look for these exact words.`,
    addPreferred: (skills) =>
      `Worth mentioning if true: ${skills}. They are optional, but each one sets you apart.`,
    strengthen: (h) =>
      `${h.skill.name} is named ${h.jobMentions}× in the posting but ${h.cvMentions}× in the CV. Show it in your most recent role, with what it achieved.`,
    mirrorTitle: (title) =>
      `Use the posting's title, “${title}”, in your headline or summary so the CV reads as written for this role.`,
    quantify:
      "Put numbers on your results — users served, time saved, % improved. The CV has almost none.",
    weakVerbs: (phrases) =>
      `Replace “${phrases.join("”, “")}” with what you did and what changed: “Built…”, “Cut…”, “Launched…”.`,
  },
};

const SK: Copy = {
  pageTitle: "Porovnajte životopis s pracovnou ponukou",
  pageIntro:
    "Vložte životopis a pracovnú ponuku. Skóre, chýbajúce zručnosti aj odporúčania sa menia počas písania — nič neopúšťa váš prehliadač.",
  samplesLabel: "Vyskúšajte ukážku",
  sampleButton: (label) => `Načítať ukážku: ${label}`,
  cvLabel: "Životopis",
  cvPlaceholder: "Sem vložte text životopisu…",
  jobLabel: "Pracovná ponuka",
  jobPlaceholder: "Sem vložte popis pracovnej pozície…",
  library: {
    title: "Knižnica pracovných pozícií",
    intro: "10 predvolených rolí z oblastí AI, Data a AWS Cloud. Upravte popis a uložte vlastné roly v tomto prehliadači. Uložené roly zostávajú na tomto zariadení; vymazanie dát prehliadača ich odstráni.",
    search: "Hľadať roly", choose: "Vyberte rolu", defaults: "Predvolené roly", saved: "Vaše uložené roly",
    noMatches: "Hľadaniu nezodpovedá žiadna rola.", use: "Použiť popis roly",
    roleTitle: "Názov roly", category: "Oblasť roly",
    categories: { ai: "AI", data: "Data", aws: "AWS Cloud" },
    save: "Uložiť aktuálnu ponuku ako rolu", update: "Aktualizovať uloženú rolu", remove: "Odstrániť uloženú rolu",
    savedNotice: "Rola je uložená v tomto prehliadači.", deletedNotice: "Uložená rola bola odstránená. Ponuka zostala dostupná nižšie.",
    loadedNotice: "Popis roly bol načítaný. Môžete ho upraviť nižšie.",
    invalid: "Zadajte názov roly (najviac 120 znakov) a popis práce (najviac 50 000 znakov).",
    limit: "Môžete uložiť najviac 100 vlastných rolí. Najprv aktualizujte alebo odstráňte uloženú rolu.",
    storageError: "Uložené roly sa nepodarilo načítať alebo uložiť. Skontrolujte nastavenia úložiska prehliadača alebo obnovte stránku, ak knižnicu zmenila iná karta. Predvolené roly aj vloženie ponuky môžete naďalej používať.",
  },
  words: (n) => `${n} ${n === 1 ? "slovo" : n >= 2 && n <= 4 ? "slová" : "slov"}`,
  clear: "Vymazať",
  importFile: "Nahrať súbor",
  importFileAriaLabel: "Nahrať životopis (PDF, DOC, DOCX)",
  importLinkedIn: "LinkedIn",
  importLinkedInAriaLabel: "Importovať z LinkedIn — otvorí návod",
  importDragHint: "Sem pustite životopis",
  importDragInvalid: "Len PDF, DOC alebo DOCX",
  importLoading: "Čítam súbor…",
  importSuccess: (name) => `Načítané: ${name}`,
  importError: "Súbor sa nepodarilo načítať. Skúste iný formát alebo vložte text.",
  importTypeError: "Podporované sú len súbory PDF, DOC a DOCX.",
  importSizeError: "Súbor je príliš veľký. Maximum je 5 MB.",
  linkedInDialogTitle: "Importovať z LinkedIn",
  linkedInDialogDesc:
    "LinkedIn neumožňuje priamy import. Exportujte profil ako PDF a nahrajte ho tu.",
  linkedInStep1: "Otvorte svoj LinkedIn profil",
  linkedInStep2: "Kliknite na Ďalšie → Uložiť ako PDF",
  linkedInStep3: "Nahrajte stiahnutý súbor nižšie",
  linkedInUpload: "Nahrať LinkedIn PDF",
  linkedInClose: "Hotovo",
  emptyState: "Vložte oba texty alebo načítajte ukážku a uvidíte, ako sa zhodujú.",
  scoreLabel: "Skóre zhody",
  tier: { high: "Vysoká zhoda", medium: "Stredná zhoda", low: "Nízka zhoda" },
  tierHint: {
    high: "Životopis pokrýva väčšinu toho, čo ponuka žiada.",
    medium: "Životopis pokrýva jadro, no niektoré požiadavky chýbajú.",
    low: "Väčšina požiadaviek ponuky v životopise zatiaľ nie je.",
  },
  keywordNotice:
    "Ponuka neuvádza zručnosti, ktoré poznáme, preto skóre porovnáva jej kľúčové slová.",
  zones: ["Nízka", "Stredná", "Vysoká"],
  matched: "Zhoda",
  matchedEmpty: "Žiadna zo zručností z ponuky sa v životopise zatiaľ nenachádza.",
  missing: "Chýbajúce zručnosti",
  missingEmpty: "Nič nechýba — životopis uvádza všetky zručnosti z ponuky.",
  required: "Povinné",
  preferred: "Výhodou",
  mentions: (n) => `v ponuke ${n}×`,
  recommendations: "Odporúčania",
  groups: {
    add: "Čo doplniť do životopisu",
    strengthen: "Kľúčové slová na posilnenie",
    rephrase: "Ako preformulovať skúsenosti",
  },
  exportMarkdown: "Exportovať Markdown",
  print: "Tlačiť / Stiahnuť zhrnutie",
  reportTitle: "Report zhody životopisu",
  reportDate: "Vytvorené",
  rec: {
    addKeyword: (skills) =>
      `Doplňte ${skills}, ak s nimi máte skúsenosť — sú povinné a filtre náborárov hľadajú práve tieto slová.`,
    addPreferred: (skills) =>
      `Ak je to pravda, spomeňte aj: ${skills}. Nie sú povinné, no každá vás odlíši.`,
    strengthen: (h) =>
      `${h.skill.name} ponuka spomína ${h.jobMentions}×, životopis ${h.cvMentions}×. Ukážte ju pri poslednej pozícii aj s tým, čo priniesla.`,
    mirrorTitle: (title) =>
      `Použite názov pozície z ponuky, „${title}“, v nadpise alebo zhrnutí, aby životopis pôsobil ako písaný pre túto rolu.`,
    quantify:
      "Doplňte k výsledkom čísla — počet používateľov, ušetrený čas, zlepšenie v %. Životopis ich takmer nemá.",
    weakVerbs: (phrases) =>
      `Namiesto „${phrases.join("“, „")}“ napíšte, čo ste urobili a čo sa zmenilo: „Postavil som…“, „Skrátila som…“, „Spustil som…“.`,
  },
};

export const COPY: Record<CvLocale, Copy> = { en: EN, sk: SK };

export type RecommendationGroup = keyof Copy["groups"];

const GROUP: Record<Recommendation["kind"], RecommendationGroup> = {
  "add-keyword": "add",
  "add-preferred": "add",
  strengthen: "strengthen",
  "mirror-title": "rephrase",
  quantify: "rephrase",
  "weak-verbs": "rephrase",
};

function list(names: string[], locale: CvLocale): string {
  if (names.length <= 1) return names.join("");
  const and = locale === "sk" ? " a " : " and ";
  return `${names.slice(0, -1).join(", ")}${and}${names[names.length - 1]}`;
}

/** Recommendations as sentences, grouped the way the screen and the report show them. */
export function groupedRecommendations(
  result: AnalysisResult,
  locale: CvLocale
): { group: RecommendationGroup; items: string[] }[] {
  const c = COPY[locale];
  const groups = new Map<RecommendationGroup, string[]>();
  for (const rec of result.recommendations) {
    const lines: string[] = [];
    switch (rec.kind) {
      case "add-keyword":
        lines.push(c.rec.addKeyword(list(rec.skills.map((s) => s.name), locale)));
        break;
      case "add-preferred":
        lines.push(c.rec.addPreferred(list(rec.skills.map((s) => s.name), locale)));
        break;
      case "strengthen":
        lines.push(...rec.hits.map(c.rec.strengthen));
        break;
      case "mirror-title":
        lines.push(c.rec.mirrorTitle(rec.title));
        break;
      case "quantify":
        lines.push(c.rec.quantify);
        break;
      case "weak-verbs":
        lines.push(c.rec.weakVerbs(rec.phrases));
        break;
    }
    const g = GROUP[rec.kind];
    groups.set(g, [...(groups.get(g) ?? []), ...lines]);
  }
  const order: RecommendationGroup[] = ["add", "strengthen", "rephrase"];
  return order.filter((g) => groups.has(g)).map((g) => ({ group: g, items: groups.get(g)! }));
}

export function reportToMarkdown(result: AnalysisResult, locale: CvLocale, now = new Date()): string {
  const c = COPY[locale];
  const tag = (h: SkillHit) =>
    `- ${h.skill.name} (${h.priority === "required" ? c.required : c.preferred}; ${c.mentions(h.jobMentions)})`;

  const out = [
    `# ${c.reportTitle}`,
    "",
    `${c.reportDate}: ${now.toISOString().slice(0, 10)}`,
    "",
    `**${c.scoreLabel}: ${result.score}%** — ${c.tier[result.tier]}`,
    "",
    c.tierHint[result.tier],
  ];
  if (result.method === "keywords") out.push("", `> ${c.keywordNotice}`);

  out.push("", `## ${c.matched}`, "");
  out.push(...(result.matched.length ? result.matched.map(tag) : [c.matchedEmpty]));
  out.push("", `## ${c.missing}`, "");
  out.push(...(result.missing.length ? result.missing.map(tag) : [c.missingEmpty]));

  out.push("", `## ${c.recommendations}`);
  for (const { group, items } of groupedRecommendations(result, locale)) {
    out.push("", `### ${c.groups[group]}`, "", ...items.map((i) => `- ${i}`));
  }
  return out.join("\n") + "\n";
}
