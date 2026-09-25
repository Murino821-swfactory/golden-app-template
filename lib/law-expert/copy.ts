import type { UiError } from "./api";
import type { MemoUnavailable } from "./types";

/**
 * Copy for the research page, English and Slovak — the two languages this prototype
 * declares. Kept here, not in `messages/*.json`, because those bundles are template chrome
 * shared by eight languages and checked for identical keys (tests/locale.spec.ts); this
 * page exists only in law-expert. Same approach as `lib/cv-matcher-copy.ts` on cv-matcher.
 */

export interface ResearchCopy {
  nav: string;
  pageTitle: string;
  pageIntro: string;
  tabs: { search: string; memo: string };
  search: {
    query: string;
    queryPlaceholder: string;
    paragraph: string;
    paragraphPlaceholder: string;
    from: string;
    courtType: string;
    region: string;
    form: string;
    any: string;
    submit: string;
    searching: string;
    found: (n: number) => string;
    none: string;
    pdf: string;
    judge: string;
    next: string;
    previous: string;
    source: string;
  };
  stats: { title: string; form: string; nature: string; region: string };
  memo: {
    label: string;
    placeholder: string;
    privacy: string;
    counter: (n: number, max: number) => string;
    tooShort: (min: number) => string;
    submit: string;
    working: string;
    qualification: string;
    slovLex: string;
    sources: string;
    ecli: string;
    truncated: string;
    showQuote: (n: number) => string;
    unsupported: string;
    disclaimer: (model: string) => string;
    took: (seconds: string) => string;
    unavailable: Record<MemoUnavailable, string>;
  };
  save: {
    open: string;
    caseNumber: string;
    courtName: string;
    submit: string;
    saving: string;
    saved: string;
    viewCases: string;
    failed: string;
  };
  errors: Record<UiError, string>;
  dashboardLink: string;
}

const en: ResearchCopy = {
  nav: "Research",
  pageTitle: "Research",
  pageIntro:
    "Search published Slovak criminal-law decisions, or describe what happened and get a memo that quotes the decisions it relies on.",
  tabs: { search: "Search decisions", memo: "Memo on the facts" },
  search: {
    query: "Words",
    queryPlaceholder: "e.g. krádež vlámaním",
    paragraph: "Criminal Code section",
    paragraphPlaceholder: "e.g. 212",
    from: "Decided after",
    courtType: "Court",
    region: "Region",
    form: "Type of decision",
    any: "Any",
    submit: "Search",
    searching: "Searching InfoSúd…",
    found: (n) => `${n.toLocaleString("en")} decisions found`,
    none: "No decisions match. Try fewer words, another section or no date limit.",
    pdf: "Open the decision (PDF)",
    judge: "Judge",
    next: "Next page",
    previous: "Previous page",
    source: "Source: InfoSúd, Ministry of Justice of the Slovak Republic",
  },
  stats: {
    title: "How these decisions split",
    form: "Type of decision",
    nature: "Outcome",
    region: "Region",
  },
  memo: {
    label: "What happened",
    placeholder:
      "e.g. At night the accused broke the window of a parked car and took the radio and a laptop worth about €900.",
    privacy: "Leave out names, dates of birth and addresses. What you type is not stored unless you save the memo to a case.",
    counter: (n, max) => `${n} / ${max}`,
    tooShort: (min) => `Describe the facts in at least ${min} characters.`,
    submit: "Write the memo",
    working: "Finding the Criminal Code sections, searching InfoSúd and reading the decisions. This usually takes 10–20 seconds.",
    qualification: "Likely legal qualification",
    slovLex: "Read the section on Slov-Lex",
    sources: "Decisions this memo relies on",
    ecli: "ECLI",
    truncated: "Only the first part of this decision was read.",
    showQuote: (n) => `Show the quote from decision ${n}`,
    unsupported: "Not backed by a quote from the decisions",
    disclaimer: (model) =>
      `Written by AI (${model}) from the decisions listed below. This is research, not legal advice, and it does not replace a lawyer.`,
    took: (s) => `Took ${s} s`,
    unavailable: {
      "no-decisions":
        "No decisions matched these facts, so no memo was written — nothing is invented. Describe the facts in more detail, or search the decisions directly.",
      "model-failed": "The memo could not be written this time. The decisions that were found are listed below.",
      refused: "The model declined to write a memo on these facts. The decisions that were found are listed below.",
    },
  },
  save: {
    open: "Save to my cases",
    caseNumber: "Case number",
    courtName: "Court",
    submit: "Save case",
    saving: "Saving…",
    saved: "Saved to your cases.",
    viewCases: "Open my cases",
    failed: "The case could not be saved. Try again.",
  },
  errors: {
    auth: "Your sign-in has expired. Sign in again to continue.",
    invalid: "Check what you entered — one of the fields is not in the expected format.",
    "quota-user": "You have used today's memos. Searching decisions still works; memos are available again tomorrow.",
    "quota-global": "Today's memo limit for this demo has been reached. Searching decisions still works.",
    rate: "Too many searches in a minute. Wait a moment and search again.",
    source: "InfoSúd is not answering right now. Try again in a minute.",
    internal: "Something went wrong on our side. Try again.",
    network: "No connection to the server. Check your connection and try again.",
  },
  dashboardLink: "New research",
};

const sk: ResearchCopy = {
  nav: "Rešerš",
  pageTitle: "Rešerš",
  pageIntro:
    "Prehľadajte zverejnené slovenské trestnoprávne rozhodnutia, alebo opíšte, čo sa stalo, a získajte rešerš, ktorá cituje rozhodnutia, o ktoré sa opiera.",
  tabs: { search: "Vyhľadať rozhodnutia", memo: "Rešerš k skutku" },
  search: {
    query: "Slová",
    queryPlaceholder: "napr. krádež vlámaním",
    paragraph: "Paragraf Trestného zákona",
    paragraphPlaceholder: "napr. 212",
    from: "Rozhodnuté po",
    courtType: "Súd",
    region: "Kraj",
    form: "Forma rozhodnutia",
    any: "Akýkoľvek",
    submit: "Hľadať",
    searching: "Hľadám v InfoSúde…",
    found: (n) => `Nájdených rozhodnutí: ${n.toLocaleString("sk")}`,
    none: "Žiadne rozhodnutie nevyhovuje. Skúste menej slov, iný paragraf alebo bez obmedzenia dátumu.",
    pdf: "Otvoriť rozhodnutie (PDF)",
    judge: "Sudca",
    next: "Ďalšia strana",
    previous: "Predchádzajúca strana",
    source: "Zdroj: InfoSúd, Ministerstvo spravodlivosti SR",
  },
  stats: {
    title: "Ako sa tieto rozhodnutia delia",
    form: "Forma rozhodnutia",
    nature: "Výsledok",
    region: "Kraj",
  },
  memo: {
    label: "Čo sa stalo",
    placeholder:
      "napr. Obvinený v noci rozbil okno zaparkovaného auta a vzal z neho autorádio a notebook v hodnote asi 900 €.",
    privacy: "Neuvádzajte mená, dátumy narodenia ani adresy. Napísaný text sa neukladá, kým rešerš neuložíte do prípadu.",
    counter: (n, max) => `${n} / ${max}`,
    tooShort: (min) => `Opíšte skutok aspoň ${min} znakmi.`,
    submit: "Napísať rešerš",
    working: "Hľadám paragrafy Trestného zákona, prehľadávam InfoSúd a čítam rozhodnutia. Zvyčajne to trvá 10–20 sekúnd.",
    qualification: "Pravdepodobná právna kvalifikácia",
    slovLex: "Znenie paragrafu na Slov-Lexe",
    sources: "Rozhodnutia, o ktoré sa rešerš opiera",
    ecli: "ECLI",
    truncated: "Z tohto rozhodnutia sa čítala len prvá časť.",
    showQuote: (n) => `Zobraziť citát z rozhodnutia ${n}`,
    unsupported: "Bez citátu z rozhodnutí",
    disclaimer: (model) =>
      `Napísala umelá inteligencia (${model}) z rozhodnutí uvedených nižšie. Ide o rešerš, nie o právnu radu, a nenahrádza advokáta.`,
    took: (s) => `Trvalo ${s} s`,
    unavailable: {
      "no-decisions":
        "K tomuto skutku sa nenašli žiadne rozhodnutia, preto rešerš nevznikla — nič sa nevymýšľa. Opíšte skutok podrobnejšie, alebo hľadajte rozhodnutia priamo.",
      "model-failed": "Rešerš sa tentoraz nepodarilo napísať. Nájdené rozhodnutia sú uvedené nižšie.",
      refused: "Model odmietol k tomuto skutku napísať rešerš. Nájdené rozhodnutia sú uvedené nižšie.",
    },
  },
  save: {
    open: "Uložiť do mojich prípadov",
    caseNumber: "Číslo veci",
    courtName: "Súd",
    submit: "Uložiť prípad",
    saving: "Ukladám…",
    saved: "Uložené do vašich prípadov.",
    viewCases: "Otvoriť moje prípady",
    failed: "Prípad sa nepodarilo uložiť. Skúste to znova.",
  },
  errors: {
    auth: "Vaše prihlásenie vypršalo. Prihláste sa znova.",
    invalid: "Skontrolujte zadanie — jedno z polí nemá očakávaný tvar.",
    "quota-user": "Dnešné rešerše ste vyčerpali. Vyhľadávanie rozhodnutí funguje ďalej; rešerše budú opäť k dispozícii zajtra.",
    "quota-global": "Denný limit rešerší pre toto demo je vyčerpaný. Vyhľadávanie rozhodnutí funguje ďalej.",
    rate: "Priveľa vyhľadávaní za minútu. Chvíľu počkajte a hľadajte znova.",
    source: "InfoSúd práve neodpovedá. Skúste to o minútu.",
    internal: "Na našej strane sa niečo pokazilo. Skúste to znova.",
    network: "Bez spojenia so serverom. Skontrolujte pripojenie a skúste to znova.",
  },
  dashboardLink: "Nová rešerš",
};

export function researchCopy(locale: string): ResearchCopy {
  return locale === "sk" ? sk : en;
}

/** Filter options. InfoSúd's own values (Slovak in both languages — they are data). */
export const COURT_TYPES = ["Okresný súd", "Mestský súd", "Krajský súd", "Špecializovaný trestný súd", "Najvyšší súd SR"];
export const REGIONS = [
  "Bratislavský kraj",
  "Trnavský kraj",
  "Trenčiansky kraj",
  "Nitriansky kraj",
  "Žilinský kraj",
  "Banskobystrický kraj",
  "Prešovský kraj",
  "Košický kraj",
];
export const FORMS = ["Rozsudok", "Trestný rozkaz", "Uznesenie", "Rozhodnutie"];
