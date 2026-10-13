import type {
  ActivityKind, AmlRisk, BillingMode, DeadlinePreset, DeadlineUnit, DocumentKind, HearingKind, KycStatus, Locale,
  MatterStage, MatterType, PartyRole, PracticeArea, Role,
} from "./types";
import type { DeadlineUrgency } from "./deadlines";

/**
 * Copy of the workspace, Slovak and English. Kept here like `lib/law-expert/copy.ts`: the
 * `messages/*.json` bundles are shared chrome for eight languages and must carry identical
 * keys; these pages exist only in law-expert.
 */
export type NavId = "dashboard" | "matters" | "clients" | "calendar" | "deadlines" | "hearings" | "billing" | "documents" | "research" | "team" | "settings";

export interface AppCopy {
  nav: Record<NavId, string>;
  product: { name: string; tagline: string; demo: string; demoLong: string; you: string; staleData: string; refreshData: string };
  common: Record<
    | "search" | "new" | "save" | "cancel" | "delete" | "edit" | "close" | "today" | "all" | "none" | "open" | "done" | "back" | "more"
    | "loading" | "yes" | "no" | "notes" | "status" | "assignee" | "client" | "matter" | "court" | "date" | "amount" | "hours" | "rate"
    | "total" | "dueDate" | "startDate" | "days" | "viewAll" | "add" | "remove" | "confirm" | "title" | "kind" | "name" | "filter"
    | "noResults" | "required" | "optional" | "perHour" | "version" | "author" | "updated" | "size" | "actions" | "count" | "time"
    | "place" | "lead" | "team" | "value" | "billing" | "stage" | "area" | "type" | "tags" | "summary" | "nextStep" | "risk" | "parties"
    | "overview" | "week" | "month" | "unassigned" | "export" | "print" | "saved" | "progress" | "items" | "of",
    string
  >;
  roles: Record<Role, string>;
  areas: Record<PracticeArea, string>;
  matterTypes: Record<MatterType, string>;
  stages: Record<MatterStage, string>;
  billingModes: Record<BillingMode, string>;
  partyRoles: Record<PartyRole, string>;
  kyc: Record<KycStatus, string>;
  amlRisk: Record<AmlRisk, string>;
  risk: Record<"low" | "medium" | "high", string>;
  urgency: Record<DeadlineUrgency, string>;
  activities: Record<ActivityKind, string>;
  docKinds: Record<DocumentKind, string>;
  docStatus: Record<"draft" | "final" | "filed", string>;
  taskStatus: Record<"todo" | "doing" | "done", string>;
  priority: Record<"low" | "normal" | "high", string>;
  hearingKinds: Record<HearingKind, string>;
  hearingStatus: Record<"scheduled" | "done" | "adjourned", string>;
  invoiceStatus: Record<"draft" | "sent" | "paid" | "overdue", string>;
  deadlineUnits: Record<DeadlineUnit, string>;
  deadlinePresets: Record<DeadlinePreset, string>;
  evidenceKinds: Record<"document" | "witness" | "expert" | "inspection" | "other", string>;
  evidenceStatus: Record<"filed" | "toFile" | "requested", string>;
  witnessSide: Record<"ours" | "theirs" | "court", string>;
  witnessStatus: Record<"summoned" | "toSummon" | "confirmed", string>;
  dashboard: Record<"greeting" | "subtitle" | "openMatters" | "deadlines7" | "overdue" | "hearingsWeek" | "wip" | "wipHint" | "receivables" | "receivablesHint" | "agenda" | "agendaEmpty" | "atRisk" | "atRiskEmpty" | "workload" | "workloadHint" | "activity" | "research" | "researchHint" | "researchOpen" | "researchEmpty" | "tasks" | "tasksEmpty" | "daysLeft" | "daysOver", string>;
  matters: Record<"title" | "intro" | "newMatter" | "list" | "board" | "searchPlaceholder" | "allStages" | "allAreas" | "allLeads" | "empty" | "nextDeadline" | "nextHearing" | "unbilled" | "opponent" | "opponentHint" | "clientNew" | "clientExisting" | "conflictTitle" | "conflictNone" | "conflictReview" | "conflictBlock" | "conflictOurClient" | "conflictOpponent" | "conflictOther" | "conflictIn" | "created" | "tabOverview" | "tabDeadlines" | "tabHearings" | "tabTime" | "tabDocuments" | "tabResearch" | "tabActivity" | "addDeadline" | "addEntry" | "researchLinked" | "researchNone" | "researchNew" | "researchLink" | "stageAdvance" | "valueHint" | "courtFile" | "judge" | "opened" | "closed" | "markDone" | "reopen", string>;
  clients: Record<"title" | "intro" | "newClient" | "person" | "company" | "registrationNumber" | "contact" | "mattersOf" | "noMatters" | "kycTitle" | "kycHint" | "kycIdentity" | "kycVerification" | "kycBeneficialOwner" | "kycPep" | "kycPurpose" | "kycRecordTemplate" | "markVerified" | "empty" | "searchPlaceholder" | "amlHint", string>;
  calendar: Record<"title" | "intro" | "prev" | "next" | "hearing" | "deadline" | "task" | "legend" | "empty" | "dayAgenda", string>;
  deadlines: Record<"title" | "intro" | "calculator" | "calculatorHint" | "preset" | "startDateHint" | "amount" | "unit" | "result" | "rawEnd" | "shiftedYes" | "shiftedNo" | "source" | "saveToMatter" | "responsible" | "onlyOpen" | "showDone" | "empty" | "legal" | "statute" | "disclaimer", string>;
  hearings: Record<"title" | "intro" | "upcoming" | "past" | "binder" | "checklist" | "chronology" | "evidence" | "witnesses" | "arguments" | "questions" | "addItem" | "claim" | "support" | "riskLabel" | "topic" | "side" | "event" | "evidenceRef" | "question" | "readiness" | "printBinder" | "recordOutcome" | "outcomeNote" | "empty" | "noPrep" | "duration" | "attendees" | "room" | "addQuestion" | "addArgument" | "addWitness" | "addEvidence" | "addChronology" | "addChecklist", string>;
  billing: Record<"title" | "intro" | "tabEntries" | "tabInvoices" | "tabTariff" | "tabOverview" | "newEntry" | "minutes" | "activity" | "description" | "billable" | "nonBillable" | "entriesEmpty" | "invoiceFromEntries" | "chooseMatter" | "preview" | "issue" | "subtotal" | "vat" | "issuedAt" | "dueAt" | "markPaid" | "markSent" | "invoicesEmpty" | "tariffTitle" | "tariffHint" | "tariffValue" | "tariffNoValue" | "acts" | "halfActs" | "multiplier" | "base" | "ratePerAct" | "overhead" | "tariffTotal" | "courtFeeTitle" | "courtFeeHint" | "commercial" | "electronic" | "courtFee" | "wipByMatter" | "aging" | "agingCurrent" | "aging1" | "aging2" | "aging3" | "thisMonth" | "unbilledHours" | "disclaimer" | "lineTariffAct" | "lineOverhead" | "lineHours" | "unit_h" | "unit_act" | "unit_item", string>;
  documents: Record<"title" | "intro" | "newDocument" | "templates" | "templatesHint" | "allKinds" | "allMatters" | "empty" | "newVersion" | "markFinal" | "markFiled" | "useTemplate" | "general" | "searchPlaceholder", string>;
  team: Record<"title" | "intro" | "soloTitle" | "soloIntro" | "invite" | "inviteHint" | "capacity" | "utilisation" | "utilisationHint" | "openMatters" | "openDeadlines" | "billableWeeks" | "role" | "emailLabel" | "rateLabel" | "added", string>;
  settings: Record<"title" | "intro" | "workspace" | "workspaceKind" | "solo" | "firm" | "switchHint" | "switchConfirm" | "firmName" | "address" | "tariff" | "tariffYear" | "tariffBase" | "tariffBaseHint" | "defaultRate" | "vatRate" | "data" | "dataHint" | "exportJson" | "resetDemo" | "resetConfirm" | "legal" | "legalGdpr" | "legalAi" | "legalAml" | "legalDeadlines" | "owner" | "saved" | "seededAt", string>;
  research: Record<"title" | "intro" | "archiveTab", string>;
}

const sk: AppCopy = {
  nav: { dashboard: "Prehľad", matters: "Spisy", clients: "Klienti", calendar: "Kalendár", deadlines: "Lehoty", hearings: "Pojednávania", billing: "Výkazy a faktúry", documents: "Dokumenty", research: "Rešerš", team: "Tím", settings: "Nastavenia" },
  product: { name: "Law expert", tagline: "Pracovisko advokáta", demo: "Demo", demoLong: "Demo pracovisko — údaje sú uložené len v tomto prehliadači. Všetky osoby a firmy sú vymyslené.", you: "Vy", staleData: "Demo údaje sú staršie ako tri týždne; agenda už nemusí sedieť s dnešným dátumom.", refreshData: "Obnoviť demo údaje" },
  common: {
    search: "Hľadať", new: "Nový", save: "Uložiť", cancel: "Zrušiť", delete: "Vymazať", edit: "Upraviť", close: "Zavrieť", today: "Dnes", all: "Všetko", none: "Žiadne", open: "Otvorené", done: "Hotovo", back: "Späť", more: "Viac",
    loading: "Načítavam…", yes: "Áno", no: "Nie", notes: "Poznámky", status: "Stav", assignee: "Zodpovedný", client: "Klient", matter: "Spis", court: "Súd", date: "Dátum", amount: "Suma", hours: "Hodiny", rate: "Sadzba",
    total: "Spolu", dueDate: "Termín", startDate: "Začiatok plynutia", days: "dní", viewAll: "Zobraziť všetko", add: "Pridať", remove: "Odstrániť", confirm: "Potvrdiť", title: "Názov", kind: "Druh", name: "Meno", filter: "Filter",
    noResults: "Nič nezodpovedá filtru.", required: "povinné", optional: "nepovinné", perHour: "€/h", version: "Verzia", author: "Autor", updated: "Upravené", size: "Veľkosť", actions: "Akcie", count: "Počet", time: "Čas",
    place: "Miesto", lead: "Vedie", team: "Tím", value: "Hodnota sporu", billing: "Odmena", stage: "Fáza", area: "Oblasť práva", type: "Typ veci", tags: "Štítky", summary: "Zhrnutie", nextStep: "Ďalší krok", risk: "Riziko", parties: "Strany",
    overview: "Prehľad", week: "Týždeň", month: "Mesiac", unassigned: "Bez spisu", export: "Export", print: "Tlačiť", saved: "Uložené.", progress: "Pripravenosť", items: "položiek", of: "z",
  },
  roles: { partner: "Partner", attorney: "Advokát", associate: "Advokátsky koncipient", paralegal: "Právny asistent", assistant: "Office / asistent" },
  areas: { civil: "Občianske právo", commercial: "Obchodné právo", criminal: "Trestné právo", family: "Rodinné právo", labour: "Pracovné právo", administrative: "Správne právo", realEstate: "Nehnuteľnosti", insolvency: "Konkurz a oddlženie" },
  matterTypes: { litigation: "Súdny spor", advisory: "Právne poradenstvo", transaction: "Transakcia", criminalDefence: "Obhajoba", administrative: "Správne konanie" },
  stages: { intake: "Príjem", analysis: "Analýza", filed: "Podané", hearing: "Pojednávanie", decision: "Rozhodnutie", appeal: "Opravné prostriedky", closed: "Uzavreté" },
  billingModes: { hourly: "Hodinová sadzba", flat: "Paušál", tariff: "Tarifná odmena" },
  partyRoles: { client: "Klient", opponent: "Protistrana", court: "Súd", authority: "Orgán / úrad", witness: "Svedok", expert: "Znalec", other: "Iná osoba" },
  kyc: { pending: "Identifikácia čaká", verified: "Overený", expired: "Doklad exspiroval" },
  amlRisk: { low: "Nízke riziko", medium: "Stredné riziko", high: "Vysoké riziko" },
  risk: { low: "nízke", medium: "stredné", high: "vysoké" },
  urgency: { overdue: "Po termíne", today: "Dnes", soon: "Do 7 dní", later: "Neskôr", done: "Splnené" },
  activities: { consultation: "Konzultácia s klientom", drafting: "Spisovanie podania / zmluvy", filing: "Podanie na súd / úrad", hearing: "Účasť na pojednávaní", research: "Rešerš a analýza", call: "Telefonát", email: "E-mail / korešpondencia", travel: "Cesta", internal: "Interná práca" },
  docKinds: { submission: "Podanie", contract: "Zmluva", evidence: "Dôkaz", decision: "Rozhodnutie súdu", memo: "Stanovisko / memo", correspondence: "Korešpondencia", template: "Šablóna" },
  docStatus: { draft: "Koncept", final: "Finálne", filed: "Podané" },
  taskStatus: { todo: "Na rade", doing: "Prebieha", done: "Hotovo" },
  priority: { low: "nízka", normal: "bežná", high: "vysoká" },
  hearingKinds: { hearing: "Pojednávanie", consultation: "Konzultácia", meeting: "Stretnutie", negotiation: "Rokovanie" },
  hearingStatus: { scheduled: "Naplánované", done: "Uskutočnené", adjourned: "Odročené" },
  invoiceStatus: { draft: "Koncept", sent: "Odoslaná", paid: "Uhradená", overdue: "Po splatnosti" },
  deadlineUnits: { days: "dní", workingDays: "pracovných dní", weeks: "týždňov", months: "mesiacov", years: "rokov" },
  deadlinePresets: { appealCsp: "Odvolanie (civilné konanie) — 15 dní", oppositionPaymentOrder: "Odpor proti platobnému rozkazu — 15 dní", extraordinaryAppealCsp: "Dovolanie — 2 mesiace", appealCriminal: "Odvolanie (trestné konanie) — 15 dní", complaintCriminal: "Sťažnosť (trestné konanie) — 3 pracovné dni", administrativeAction: "Správna žaloba — 2 mesiace", statementCourtSet: "Vyjadrenie na výzvu súdu — 15 dní", custom: "Vlastná lehota" },
  evidenceKinds: { document: "Listina", witness: "Svedok", expert: "Znalec", inspection: "Ohliadka", other: "Iné" },
  evidenceStatus: { filed: "Predložené", toFile: "Predložiť", requested: "Vyžiadané" },
  witnessSide: { ours: "Naša strana", theirs: "Protistrana", court: "Súd / znalec" },
  witnessStatus: { summoned: "Predvolaný", toSummon: "Navrhnúť", confirmed: "Potvrdený" },
  dashboard: {
    greeting: "Dobrý deň", subtitle: "Čo vás dnes čaká v kancelárii.", openMatters: "Otvorené spisy", deadlines7: "Lehoty do 7 dní", overdue: "po termíne", hearingsWeek: "Pojednávania tento týždeň",
    wip: "Nefakturovaná práca", wipHint: "zapísané, nevyfakturované", receivables: "Pohľadávky po splatnosti", receivablesHint: "z odoslaných faktúr",
    agenda: "Agenda — najbližších 7 dní", agendaEmpty: "Najbližší týždeň je bez pojednávaní a lehôt.", atRisk: "Lehoty v riziku", atRiskEmpty: "Žiadna lehota nie je po termíne ani do troch dní.",
    workload: "Vyťaženie tímu (4 týždne)", workloadHint: "fakturovateľné hodiny proti plánovanej kapacite", activity: "Posledná aktivita", research: "Rešerš judikatúry", researchHint: "InfoSúd a NS SR OpenData — posledné uložené rešerše",
    researchOpen: "Otvoriť rešerš", researchEmpty: "Zatiaľ žiadna uložená rešerš.", tasks: "Moje úlohy", tasksEmpty: "Žiadne otvorené úlohy.", daysLeft: "zostáva dní", daysOver: "dní po termíne",
  },
  matters: {
    title: "Spisy", intro: "Všetky veci kancelárie — od príjmu po archív.", newMatter: "Nový spis", list: "Zoznam", board: "Nástenka", searchPlaceholder: "Hľadať podľa názvu, čísla, klienta…", allStages: "Všetky fázy", allAreas: "Všetky oblasti", allLeads: "Všetci advokáti",
    empty: "Žiadny spis nezodpovedá filtru.", nextDeadline: "Najbližšia lehota", nextHearing: "Najbližšie pojednávanie", unbilled: "Nefakturované", opponent: "Protistrana", opponentHint: "Meno protistrany sa hneď preverí na konflikt záujmov.",
    clientNew: "Nový klient", clientExisting: "Existujúci klient", conflictTitle: "Kontrola konfliktu záujmov", conflictNone: "Bez nálezu — mená sa nezhodujú so žiadnym klientom ani protistranou v evidencii.",
    conflictReview: "Nález na preverenie — meno sa vyskytuje v inom spise v inej úlohe.", conflictBlock: "Pozor — konflikt záujmov: meno je klientom alebo protistranou v inom spise (§ 21 zákona o advokácii).",
    conflictOurClient: "náš klient", conflictOpponent: "protistrana", conflictOther: "iná osoba", conflictIn: "v spise", created: "Spis bol založený.",
    tabOverview: "Prehľad", tabDeadlines: "Lehoty", tabHearings: "Pojednávania", tabTime: "Úkony", tabDocuments: "Dokumenty", tabResearch: "Rešerš", tabActivity: "Aktivita",
    addDeadline: "Pridať lehotu", addEntry: "Zapísať úkon", researchLinked: "Prepojené rešerše", researchNone: "K spisu zatiaľ nie je prepojená žiadna rešerš.", researchNew: "Nová rešerš k spisu", researchLink: "Prepojiť uloženú rešerš",
    stageAdvance: "Posunúť do ďalšej fázy", valueHint: "Hodnota sporu určuje tarifnú odmenu a súdny poplatok.", courtFile: "Spisová značka súdu", judge: "Sudca", opened: "Otvorený", closed: "Uzavretý", markDone: "Splnené", reopen: "Znovu otvoriť",
  },
  clients: {
    title: "Klienti", intro: "Fyzické a právnické osoby, ich identifikácia a spisy.", newClient: "Nový klient", person: "Fyzická osoba", company: "Právnická osoba", registrationNumber: "IČO", contact: "Kontakt",
    mattersOf: "Spisy klienta", noMatters: "Klient zatiaľ nemá spis.", kycTitle: "Identifikácia a AML", kycHint: "Povinná starostlivosť podľa zákona č. 297/2008 Z. z. pri činnostiach, kde je advokát povinnou osobou.",
    kycIdentity: "Identifikácia klienta (doklad totožnosti / výpis z registra)", kycVerification: "Overenie identifikácie", kycBeneficialOwner: "Konečný užívateľ výhod", kycPep: "Preverenie — politicky exponovaná osoba, sankčné zoznamy", kycPurpose: "Účel a povaha obchodu",
    kycRecordTemplate: "Záznam o identifikácii (šablóna)", markVerified: "Označiť ako overeného", empty: "Žiadny klient nezodpovedá hľadaniu.", searchPlaceholder: "Hľadať klienta…", amlHint: "Rizikový profil určuje rozsah starostlivosti; údaje uchovávajte 5 rokov od skončenia obchodu.",
  },
  calendar: { title: "Kalendár", intro: "Pojednávania, lehoty a úlohy v jednom pohľade.", prev: "Predchádzajúci mesiac", next: "Nasledujúci mesiac", hearing: "pojednávanie / stretnutie", deadline: "lehota", task: "úloha", legend: "Legenda", empty: "V tento deň nie je nič naplánované.", dayAgenda: "Agenda dňa" },
  deadlines: {
    title: "Lehoty", intro: "Procesné lehoty počítané podľa § 121 CSP: deň doručenia sa nepočíta, koniec na víkend alebo sviatok sa posúva na najbližší pracovný deň.",
    calculator: "Kalkulačka lehôt", calculatorHint: "Vyberte druh lehoty a deň doručenia / oznámenia. Výsledok je orientačný — rozhoduje poučenie súdu a aktuálne znenie zákona.",
    preset: "Druh lehoty", startDateHint: "deň doručenia, oznámenia alebo výzvy", amount: "Dĺžka", unit: "Jednotka", result: "Posledný deň lehoty", rawEnd: "Koniec podľa počtu dní", shiftedYes: "pripadol na sobotu, nedeľu alebo sviatok — posunuté na najbližší pracovný deň", shiftedNo: "pracovný deň, bez posunu",
    source: "Právny základ", saveToMatter: "Uložiť lehotu do spisu", responsible: "Zodpovedný", onlyOpen: "Len otvorené", showDone: "Zobraziť aj splnené", empty: "Žiadne lehoty.",
    legal: "Výpočet", statute: "ustanovenie", disclaimer: "Kalendár dní pracovného pokoja pre roky 2026–2027 je zapísaný v aplikácii; v produkcii sa preberá z udržiavaného zdroja.",
  },
  hearings: {
    title: "Pojednávania", intro: "Príprava na pojednávanie: checklist, chronológia skutku, dôkazy, svedkovia, argumentácia a otázky — všetko v jednom zväzku.",
    upcoming: "Najbližšie", past: "Uskutočnené", binder: "Prípravný zväzok", checklist: "Checklist", chronology: "Chronológia", evidence: "Dôkazy", witnesses: "Svedkovia", arguments: "Argumentácia", questions: "Otázky na výsluch",
    addItem: "Pridať položku", claim: "Tvrdenie", support: "Opora (dôkaz, ustanovenie)", riskLabel: "Riziko / protiargument", topic: "Predmet výsluchu", side: "Strana", event: "Udalosť", evidenceRef: "Dôkaz", question: "Otázka",
    readiness: "Pripravenosť", printBinder: "Tlačiť zväzok", recordOutcome: "Zaznamenať priebeh", outcomeNote: "Priebeh a výsledok", empty: "Žiadne pojednávanie.", noPrep: "Príprava ešte nezačala — pridajte prvú položku.",
    duration: "Trvanie", attendees: "Účasť", room: "Miestnosť", addQuestion: "Pridať otázku", addArgument: "Pridať argument", addWitness: "Pridať svedka", addEvidence: "Pridať dôkaz", addChronology: "Pridať udalosť", addChecklist: "Pridať bod",
  },
  billing: {
    title: "Výkazy a faktúry", intro: "Úkony, nefakturovaná práca, faktúry a výpočet odmeny podľa advokátskej tarify.",
    tabEntries: "Úkony", tabInvoices: "Faktúry", tabTariff: "Tarifa a poplatky", tabOverview: "Prehľad", newEntry: "Zapísať úkon", minutes: "Minúty", activity: "Druh úkonu", description: "Popis", billable: "Fakturovateľné", nonBillable: "Nefakturovateľné",
    entriesEmpty: "Žiadne úkony.", invoiceFromEntries: "Vystaviť faktúru z úkonov", chooseMatter: "Vyberte spis s nefakturovanými úkonmi", preview: "Náhľad faktúry", issue: "Vystaviť faktúru", subtotal: "Základ", vat: "DPH", issuedAt: "Vystavená", dueAt: "Splatnosť",
    markPaid: "Označiť ako uhradenú", markSent: "Označiť ako odoslanú", invoicesEmpty: "Žiadne faktúry.", tariffTitle: "Tarifná odmena za úkon", tariffHint: "Vyhláška č. 655/2004 Z. z.: základná sadzba podľa hodnoty veci (§ 10) alebo 1/13 výpočtového základu (§ 11), plus režijný paušál 1/100 základu za každý úkon (§ 16 ods. 3).",
    tariffValue: "Hodnota veci (€)", tariffNoValue: "Vec nie je oceniteľná peniazmi (1/13 základu)", acts: "Počet úkonov", halfActs: "Úkony za polovičnú sadzbu", multiplier: "Násobok sadzby (0,5–3×)", base: "Výpočtový základ", ratePerAct: "Sadzba za úkon", overhead: "Režijný paušál", tariffTotal: "Odmena spolu (bez DPH)",
    courtFeeTitle: "Súdny poplatok z návrhu", courtFeeHint: "Zákon č. 71/1992 Zb., položka 1a: 6 % z hodnoty, najmenej 25 €, najviac 25 000 € (obchodné veci 50 000 €); elektronické podanie znižuje poplatok o polovicu, najviac o 50 €.",
    commercial: "Obchodná vec", electronic: "Elektronické podanie", courtFee: "Súdny poplatok", wipByMatter: "Nefakturované podľa spisov", aging: "Pohľadávky podľa splatnosti", agingCurrent: "v splatnosti", aging1: "1–30 dní", aging2: "31–60 dní", aging3: "61+ dní",
    thisMonth: "Tento mesiac", unbilledHours: "Nefakturované hodiny", disclaimer: "Sumy sú orientačné; pred vyúčtovaním overte aktuálne znenie predpisov a dohodu s klientom.",
    lineTariffAct: "Úkon právnej služby podľa tarify", lineOverhead: "Režijný paušál", lineHours: "Právne služby", unit_h: "h", unit_act: "úkon", unit_item: "ks",
  },
  documents: {
    title: "Dokumenty", intro: "Podania, zmluvy, dôkazy a rozhodnutia pri spisoch; šablóny kancelárie na jednom mieste.", newDocument: "Nový dokument", templates: "Šablóny kancelárie", templatesHint: "Vzory, z ktorých vzniká nový dokument v spise.",
    allKinds: "Všetky druhy", allMatters: "Všetky spisy", empty: "Žiadne dokumenty.", newVersion: "Nová verzia", markFinal: "Označiť ako finálne", markFiled: "Označiť ako podané", useTemplate: "Použiť šablónu", general: "Bez spisu", searchPlaceholder: "Hľadať dokument…",
  },
  team: {
    title: "Tím", intro: "Kto na čom pracuje, vyťaženie a kapacita kancelárie.", soloTitle: "Pracujete ako samostatný advokát", soloIntro: "Tímové funkcie — prideľovanie spisov, vyťaženie a schvaľovanie výkazov — sa zapnú prepnutím pracoviska na kanceláriu v nastaveniach.",
    invite: "Pridať člena tímu", inviteHint: "V demo verzii pribudne člen do tohto prehliadača.", capacity: "Kapacita", utilisation: "Vyťaženie", utilisationHint: "fakturovateľné hodiny za posledné 4 týždne proti plánovanej kapacite", openMatters: "Vedie spisov", openDeadlines: "Otvorené lehoty", billableWeeks: "fakturovateľných h / 4 týždne",
    role: "Rola", emailLabel: "E-mail", rateLabel: "Hodinová sadzba", added: "Člen pridaný.",
  },
  settings: {
    title: "Nastavenia", intro: "Pracovisko, tarifa, údaje a právne upozornenia.", workspace: "Pracovisko", workspaceKind: "Režim pracoviska", solo: "Samostatný advokát", firm: "Advokátska kancelária",
    switchHint: "Prepnutie režimu nahradí demo údaje vzorovou kanceláriou daného typu.", switchConfirm: "Prepnúť režim a nahradiť demo údaje?", firmName: "Názov kancelárie", address: "Adresa",
    tariff: "Advokátska tarifa", tariffYear: "Rok", tariffBase: "Výpočtový základ (€)", tariffBaseHint: "Priemerná mesačná mzda za 1. polrok predchádzajúceho roka (§ 1 ods. 3 vyhl. 655/2004 Z. z.). 2026: 1 586 €.", defaultRate: "Predvolená hodinová sadzba (€)", vatRate: "DPH (%)",
    data: "Údaje", dataHint: "Demo údaje sú uložené v tomto prehliadači. Produkčná verzia ukladá údaje na server s prístupovými právami kancelárie.", exportJson: "Exportovať údaje (JSON)", resetDemo: "Obnoviť demo údaje", resetConfirm: "Nahradiť všetky údaje čerstvým demom?",
    legal: "Právne upozornenia", legalGdpr: "Osobné údaje klientov a protistrán spracúva advokát podľa GDPR a Kódexu správania SAK; údaje o trestnej činnosti (čl. 10 GDPR) len v nevyhnutnom rozsahu.",
    legalAi: "Rešerš judikatúry generuje umelá inteligencia z verejných rozhodnutí (InfoSúd, NS SR). Ide o podklad, nie o právnu radu; každý záver overuje advokát.",
    legalAml: "Pri činnostiach podľa § 5 zákona č. 297/2008 Z. z. je advokát povinnou osobou — identifikácia, overenie a uchovávanie záznamov 5 rokov.",
    legalDeadlines: "Výpočet lehôt je orientačný. Rozhoduje poučenie v rozhodnutí súdu a aktuálne znenie procesných predpisov.",
    owner: "Vlastník prototypu", saved: "Nastavenia uložené.", seededAt: "Demo údaje vytvorené",
  },
  research: { title: "Rešerš judikatúry", intro: "Vyhľadávanie v InfoSúde a NS SR OpenData s porovnaním k vašej právnej otázke. Uložené rešerše prepojíte so spisom.", archiveTab: "Uložené rešerše" },
};

const en: AppCopy = {
  nav: { dashboard: "Overview", matters: "Matters", clients: "Clients", calendar: "Calendar", deadlines: "Deadlines", hearings: "Hearings", billing: "Time & invoices", documents: "Documents", research: "Research", team: "Team", settings: "Settings" },
  product: { name: "Law expert", tagline: "The lawyer's workspace", demo: "Demo", demoLong: "Demo workspace — data lives only in this browser. Every person and company is invented.", you: "You", staleData: "The demo data is more than three weeks old; the agenda may no longer match today's date.", refreshData: "Refresh demo data" },
  common: {
    search: "Search", new: "New", save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", close: "Close", today: "Today", all: "All", none: "None", open: "Open", done: "Done", back: "Back", more: "More",
    loading: "Loading…", yes: "Yes", no: "No", notes: "Notes", status: "Status", assignee: "Responsible", client: "Client", matter: "Matter", court: "Court", date: "Date", amount: "Amount", hours: "Hours", rate: "Rate",
    total: "Total", dueDate: "Due", startDate: "Period starts", days: "days", viewAll: "View all", add: "Add", remove: "Remove", confirm: "Confirm", title: "Title", kind: "Kind", name: "Name", filter: "Filter",
    noResults: "Nothing matches the filter.", required: "required", optional: "optional", perHour: "€/h", version: "Version", author: "Author", updated: "Updated", size: "Size", actions: "Actions", count: "Count", time: "Time",
    place: "Place", lead: "Lead", team: "Team", value: "Value in dispute", billing: "Fees", stage: "Stage", area: "Practice area", type: "Matter type", tags: "Tags", summary: "Summary", nextStep: "Next step", risk: "Risk", parties: "Parties",
    overview: "Overview", week: "Week", month: "Month", unassigned: "No matter", export: "Export", print: "Print", saved: "Saved.", progress: "Readiness", items: "items", of: "of",
  },
  roles: { partner: "Partner", attorney: "Attorney", associate: "Trainee lawyer", paralegal: "Paralegal", assistant: "Office / assistant" },
  areas: { civil: "Civil law", commercial: "Commercial law", criminal: "Criminal law", family: "Family law", labour: "Employment law", administrative: "Administrative law", realEstate: "Real estate", insolvency: "Insolvency" },
  matterTypes: { litigation: "Litigation", advisory: "Legal advice", transaction: "Transaction", criminalDefence: "Criminal defence", administrative: "Administrative proceedings" },
  stages: { intake: "Intake", analysis: "Analysis", filed: "Filed", hearing: "Hearing", decision: "Decision", appeal: "Appeal", closed: "Closed" },
  billingModes: { hourly: "Hourly rate", flat: "Flat fee", tariff: "Statutory tariff" },
  partyRoles: { client: "Client", opponent: "Opposing party", court: "Court", authority: "Authority", witness: "Witness", expert: "Expert", other: "Other person" },
  kyc: { pending: "Identification pending", verified: "Verified", expired: "ID expired" },
  amlRisk: { low: "Low risk", medium: "Medium risk", high: "High risk" },
  risk: { low: "low", medium: "medium", high: "high" },
  urgency: { overdue: "Overdue", today: "Today", soon: "Within 7 days", later: "Later", done: "Done" },
  activities: { consultation: "Client consultation", drafting: "Drafting a submission / contract", filing: "Filing with court / authority", hearing: "Hearing attendance", research: "Research and analysis", call: "Phone call", email: "E-mail / correspondence", travel: "Travel", internal: "Internal work" },
  docKinds: { submission: "Submission", contract: "Contract", evidence: "Evidence", decision: "Court decision", memo: "Memo / opinion", correspondence: "Correspondence", template: "Template" },
  docStatus: { draft: "Draft", final: "Final", filed: "Filed" },
  taskStatus: { todo: "To do", doing: "In progress", done: "Done" },
  priority: { low: "low", normal: "normal", high: "high" },
  hearingKinds: { hearing: "Hearing", consultation: "Consultation", meeting: "Meeting", negotiation: "Negotiation" },
  hearingStatus: { scheduled: "Scheduled", done: "Held", adjourned: "Adjourned" },
  invoiceStatus: { draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue" },
  deadlineUnits: { days: "days", workingDays: "working days", weeks: "weeks", months: "months", years: "years" },
  deadlinePresets: { appealCsp: "Appeal (civil) — 15 days", oppositionPaymentOrder: "Opposition to a payment order — 15 days", extraordinaryAppealCsp: "Extraordinary appeal (dovolanie) — 2 months", appealCriminal: "Appeal (criminal) — 15 days", complaintCriminal: "Complaint (criminal) — 3 working days", administrativeAction: "Administrative action — 2 months", statementCourtSet: "Statement on a court's request — 15 days", custom: "Custom period" },
  evidenceKinds: { document: "Document", witness: "Witness", expert: "Expert", inspection: "Inspection", other: "Other" },
  evidenceStatus: { filed: "Filed", toFile: "To file", requested: "Requested" },
  witnessSide: { ours: "Our side", theirs: "Opposing side", court: "Court / expert" },
  witnessStatus: { summoned: "Summoned", toSummon: "To propose", confirmed: "Confirmed" },
  dashboard: {
    greeting: "Good day", subtitle: "What the office has ahead today.", openMatters: "Open matters", deadlines7: "Deadlines within 7 days", overdue: "overdue", hearingsWeek: "Hearings this week",
    wip: "Unbilled work", wipHint: "recorded, not yet invoiced", receivables: "Overdue receivables", receivablesHint: "from sent invoices",
    agenda: "Agenda — next 7 days", agendaEmpty: "No hearings or deadlines in the coming week.", atRisk: "Deadlines at risk", atRiskEmpty: "No deadline is overdue or due within three days.",
    workload: "Team workload (4 weeks)", workloadHint: "billable hours against planned capacity", activity: "Recent activity", research: "Case-law research", researchHint: "InfoSúd and NS SR OpenData — latest saved research",
    researchOpen: "Open research", researchEmpty: "No saved research yet.", tasks: "My tasks", tasksEmpty: "No open tasks.", daysLeft: "days left", daysOver: "days overdue",
  },
  matters: {
    title: "Matters", intro: "Every matter of the practice — from intake to archive.", newMatter: "New matter", list: "List", board: "Board", searchPlaceholder: "Search by title, number, client…", allStages: "All stages", allAreas: "All areas", allLeads: "All lawyers",
    empty: "No matter matches the filter.", nextDeadline: "Next deadline", nextHearing: "Next hearing", unbilled: "Unbilled", opponent: "Opposing party", opponentHint: "The opposing party's name is checked for conflicts right away.",
    clientNew: "New client", clientExisting: "Existing client", conflictTitle: "Conflict-of-interest check", conflictNone: "No hit — the names match no client or opposing party on file.",
    conflictReview: "Hit to review — the name appears in another matter in a different role.", conflictBlock: "Warning — conflict of interest: the name is a client or an opposing party in another matter.",
    conflictOurClient: "our client", conflictOpponent: "opposing party", conflictOther: "other person", conflictIn: "in matter", created: "Matter opened.",
    tabOverview: "Overview", tabDeadlines: "Deadlines", tabHearings: "Hearings", tabTime: "Time", tabDocuments: "Documents", tabResearch: "Research", tabActivity: "Activity",
    addDeadline: "Add deadline", addEntry: "Record time", researchLinked: "Linked research", researchNone: "No research is linked to this matter yet.", researchNew: "New research for this matter", researchLink: "Link saved research",
    stageAdvance: "Move to next stage", valueHint: "The value drives the statutory tariff and the court fee.", courtFile: "Court file number", judge: "Judge", opened: "Opened", closed: "Closed", markDone: "Mark done", reopen: "Reopen",
  },
  clients: {
    title: "Clients", intro: "People and companies, their identification and matters.", newClient: "New client", person: "Person", company: "Company", registrationNumber: "Reg. no.", contact: "Contact",
    mattersOf: "Client's matters", noMatters: "No matter yet.", kycTitle: "Identification and AML", kycHint: "Customer due diligence under Act 297/2008 where the lawyer is an obliged entity.",
    kycIdentity: "Client identification (ID document / register extract)", kycVerification: "Verification of identification", kycBeneficialOwner: "Beneficial owner", kycPep: "Screening — politically exposed person, sanctions lists", kycPurpose: "Purpose and nature of the business",
    kycRecordTemplate: "Identification record (template)", markVerified: "Mark as verified", empty: "No client matches the search.", searchPlaceholder: "Search clients…", amlHint: "The risk profile sets the depth of due diligence; keep records for 5 years after the relationship ends.",
  },
  calendar: { title: "Calendar", intro: "Hearings, deadlines and tasks in one view.", prev: "Previous month", next: "Next month", hearing: "hearing / meeting", deadline: "deadline", task: "task", legend: "Legend", empty: "Nothing planned for this day.", dayAgenda: "Day agenda" },
  deadlines: {
    title: "Deadlines", intro: "Procedural periods counted per § 121 CSP: the day of delivery is not counted; an end on a weekend or holiday moves to the next working day.",
    calculator: "Deadline calculator", calculatorHint: "Pick the kind of period and the day of delivery or announcement. The result is indicative — the court's instruction and the current statute prevail.",
    preset: "Kind of period", startDateHint: "day of delivery, announcement or request", amount: "Length", unit: "Unit", result: "Last day of the period", rawEnd: "End by the count", shiftedYes: "fell on a Saturday, Sunday or holiday — moved to the next working day", shiftedNo: "a working day, no shift",
    source: "Legal basis", saveToMatter: "Save deadline to a matter", responsible: "Responsible", onlyOpen: "Open only", showDone: "Show done too", empty: "No deadlines.",
    legal: "Computation", statute: "provision", disclaimer: "The 2026–2027 days-of-rest calendar is built into the app; production reads it from a maintained source.",
  },
  hearings: {
    title: "Hearings", intro: "Hearing preparation: checklist, chronology, evidence, witnesses, arguments and questions — one binder.",
    upcoming: "Upcoming", past: "Held", binder: "Preparation binder", checklist: "Checklist", chronology: "Chronology", evidence: "Evidence", witnesses: "Witnesses", arguments: "Arguments", questions: "Examination questions",
    addItem: "Add item", claim: "Claim", support: "Support (evidence, provision)", riskLabel: "Risk / counter-argument", topic: "Topic", side: "Side", event: "Event", evidenceRef: "Evidence", question: "Question",
    readiness: "Readiness", printBinder: "Print binder", recordOutcome: "Record outcome", outcomeNote: "Course and outcome", empty: "No hearings.", noPrep: "Preparation has not started — add the first item.",
    duration: "Duration", attendees: "Attending", room: "Room", addQuestion: "Add question", addArgument: "Add argument", addWitness: "Add witness", addEvidence: "Add evidence", addChronology: "Add event", addChecklist: "Add item",
  },
  billing: {
    title: "Time & invoices", intro: "Time entries, unbilled work, invoices and the statutory tariff.",
    tabEntries: "Entries", tabInvoices: "Invoices", tabTariff: "Tariff & fees", tabOverview: "Overview", newEntry: "Record time", minutes: "Minutes", activity: "Activity", description: "Description", billable: "Billable", nonBillable: "Non-billable",
    entriesEmpty: "No entries.", invoiceFromEntries: "Invoice from entries", chooseMatter: "Choose a matter with unbilled entries", preview: "Invoice preview", issue: "Issue invoice", subtotal: "Subtotal", vat: "VAT", issuedAt: "Issued", dueAt: "Due",
    markPaid: "Mark as paid", markSent: "Mark as sent", invoicesEmpty: "No invoices.", tariffTitle: "Tariff fee per act", tariffHint: "Decree 655/2004: basic rate by the value of the matter (§ 10) or 1/13 of the base (§ 11), plus an overhead flat fee of 1/100 of the base per act (§ 16(3)).",
    tariffValue: "Value of the matter (€)", tariffNoValue: "Not expressible in money (1/13 of the base)", acts: "Number of acts", halfActs: "Half-rate acts", multiplier: "Rate multiplier (0.5–3×)", base: "Base (výpočtový základ)", ratePerAct: "Rate per act", overhead: "Overhead flat fee", tariffTotal: "Fee total (excl. VAT)",
    courtFeeTitle: "Court fee on a claim", courtFeeHint: "Act 71/1992, item 1a: 6 % of the value, at least €25, at most €25,000 (commercial €50,000); e-filing halves the fee by at most €50.",
    commercial: "Commercial matter", electronic: "Electronic filing", courtFee: "Court fee", wipByMatter: "Unbilled by matter", aging: "Receivables by age", agingCurrent: "not yet due", aging1: "1–30 days", aging2: "31–60 days", aging3: "61+ days",
    thisMonth: "This month", unbilledHours: "Unbilled hours", disclaimer: "Amounts are indicative; check the current statute and the client agreement before billing.",
    lineTariffAct: "Act of legal service per tariff", lineOverhead: "Overhead flat fee", lineHours: "Legal services", unit_h: "h", unit_act: "act", unit_item: "pc",
  },
  documents: {
    title: "Documents", intro: "Submissions, contracts, evidence and decisions per matter; the office's templates in one place.", newDocument: "New document", templates: "Office templates", templatesHint: "Models a new matter document starts from.",
    allKinds: "All kinds", allMatters: "All matters", empty: "No documents.", newVersion: "New version", markFinal: "Mark final", markFiled: "Mark filed", useTemplate: "Use template", general: "No matter", searchPlaceholder: "Search documents…",
  },
  team: {
    title: "Team", intro: "Who works on what, workload and capacity.", soloTitle: "You work as a sole practitioner", soloIntro: "Team features — assignment, workload and timesheet approval — switch on when the workspace becomes a firm in Settings.",
    invite: "Add team member", inviteHint: "In the demo the member is added to this browser.", capacity: "Capacity", utilisation: "Utilisation", utilisationHint: "billable hours in the last 4 weeks against planned capacity", openMatters: "Leads matters", openDeadlines: "Open deadlines", billableWeeks: "billable h / 4 weeks",
    role: "Role", emailLabel: "E-mail", rateLabel: "Hourly rate", added: "Member added.",
  },
  settings: {
    title: "Settings", intro: "Workspace, tariff, data and legal notices.", workspace: "Workspace", workspaceKind: "Workspace mode", solo: "Sole practitioner", firm: "Law firm",
    switchHint: "Switching the mode replaces the demo data with a sample practice of that kind.", switchConfirm: "Switch mode and replace the demo data?", firmName: "Practice name", address: "Address",
    tariff: "Statutory tariff", tariffYear: "Year", tariffBase: "Base (€)", tariffBaseHint: "Average monthly wage in the first half of the previous year (§ 1(3) of Decree 655/2004). 2026: €1,586.", defaultRate: "Default hourly rate (€)", vatRate: "VAT (%)",
    data: "Data", dataHint: "Demo data lives in this browser. The production version stores data on a server under the firm's access rules.", exportJson: "Export data (JSON)", resetDemo: "Reset demo data", resetConfirm: "Replace all data with a fresh demo?",
    legal: "Legal notices", legalGdpr: "Personal data of clients and parties is processed under the GDPR and the Slovak Bar's code of conduct; criminal-offence data (Art. 10 GDPR) only as strictly necessary.",
    legalAi: "Case-law research is generated by AI from public decisions (InfoSúd, NS SR). It is a research aid, not legal advice; a lawyer verifies every conclusion.",
    legalAml: "For activities under § 5 of Act 297/2008 the lawyer is an obliged entity — identification, verification and records kept for 5 years.",
    legalDeadlines: "Deadline computation is indicative. The instruction in the court's decision and the current procedural code prevail.",
    owner: "Prototype owner", saved: "Settings saved.", seededAt: "Demo data created",
  },
  research: { title: "Case-law research", intro: "Search InfoSúd and NS SR OpenData and compare decisions with your legal question. Link saved research to a matter.", archiveTab: "Saved research" },
};

export function appCopy(locale: string): AppCopy {
  return locale === "sk" ? sk : en;
}

export function asLocale(locale: string): Locale {
  return locale === "sk" ? "sk" : "en";
}
