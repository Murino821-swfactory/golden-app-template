import { addDays } from "./dates";
import { computeDeadline, DEADLINE_RULES } from "./deadlines";
import { tariffBaseFor } from "./tariff";
import type {
  Activity, Client, Deadline, DeadlinePreset, Hearing, HearingPrep, Invoice, Matter, MatterDocument, Member, Task,
  TimeEntry, Workspace, WorkspaceKind,
} from "./types";

/**
 * The demo workspace — a realistic Slovak practice, dated relative to `today` so the agenda
 * always looks live. Every person and company is invented; no real identifiers appear.
 * `solo` is one lawyer with an assistant; `firm` is a six-seat office. The same matters
 * underlie both, so a presentation can switch kind without re-learning the story.
 */

const FIRM_MEMBERS: Member[] = [
  { id: "m1", name: "Mgr. Jana Hroncová", initials: "JH", role: "partner", email: "hroncova@hronec-partners.sk", hourlyRate: 150, capacityHoursWeek: 30 },
  { id: "m2", name: "JUDr. Peter Lukáč", initials: "PL", role: "attorney", email: "lukac@hronec-partners.sk", hourlyRate: 130, capacityHoursWeek: 32 },
  { id: "m3", name: "Mgr. Tomáš Vrábel", initials: "TV", role: "attorney", email: "vrabel@hronec-partners.sk", hourlyRate: 120, capacityHoursWeek: 32 },
  { id: "m4", name: "Mgr. Lucia Benková", initials: "LB", role: "associate", email: "benkova@hronec-partners.sk", hourlyRate: 80, capacityHoursWeek: 35 },
  { id: "m5", name: "Bc. Marek Šimko", initials: "MŠ", role: "paralegal", email: "simko@hronec-partners.sk", hourlyRate: 50, capacityHoursWeek: 38 },
  { id: "m6", name: "Zuzana Krajčiová", initials: "ZK", role: "assistant", email: "office@hronec-partners.sk", hourlyRate: 0, capacityHoursWeek: 0 },
];

const SOLO_MEMBERS: Member[] = [
  { id: "m1", name: "JUDr. Martin Hronec", initials: "MH", role: "attorney", email: "hronec@ak-hronec.sk", hourlyRate: 120, capacityHoursWeek: 30 },
  { id: "m6", name: "Zuzana Krajčiová", initials: "ZK", role: "assistant", email: "office@ak-hronec.sk", hourlyRate: 0, capacityHoursWeek: 0 },
];

function clients(d: (n: number) => string): Client[] {
  return [
    { id: "c1", type: "company", name: "Nová Stavba, s. r. o.", registrationNumber: "00 000 001", email: "konatel@novastavba.example", phone: "+421 900 000 001", address: "Priemyselná 12, Bratislava", kyc: "verified", amlRisk: "low", createdAt: d(-210) },
    { id: "c2", type: "person", name: "Ing. Ján Kováč", email: "jan.kovac@example.sk", phone: "+421 900 000 002", address: "Hlboká 3, Trnava", kyc: "verified", amlRisk: "low", createdAt: d(-150) },
    { id: "c3", type: "person", name: "Mária Horváthová", email: "maria.h@example.sk", phone: "+421 900 000 003", address: "Ružová dolina 8, Bratislava", kyc: "verified", amlRisk: "low", createdAt: d(-120) },
    { id: "c4", type: "company", name: "TechPoint Logistics, a. s.", registrationNumber: "00 000 004", email: "hr@techpoint.example", address: "Logistická 1, Senec", kyc: "verified", amlRisk: "medium", note: "Zahraničný akcionár — rozšírená starostlivosť podľa AML zákona.", createdAt: d(-95) },
    { id: "c5", type: "person", name: "Rastislav Paulík", phone: "+421 900 000 005", address: "Štúrova 45, Nitra", kyc: "verified", amlRisk: "low", createdAt: d(-80) },
    { id: "c6", type: "company", name: "Bytové družstvo Ružinov", registrationNumber: "00 000 006", email: "predseda@bdruzinov.example", address: "Mierová 20, Bratislava", kyc: "pending", amlRisk: "low", createdAt: d(-30) },
    { id: "c7", type: "person", name: "Karol Urban", email: "k.urban@example.sk", address: "Lipová 2, Pezinok", kyc: "verified", amlRisk: "low", createdAt: d(-140) },
    { id: "c8", type: "company", name: "Delta Pharm, s. r. o.", registrationNumber: "00 000 008", email: "legal@deltapharm.example", address: "Vedecká 7, Bratislava", kyc: "verified", amlRisk: "low", createdAt: d(-60) },
    { id: "c9", type: "person", name: "Alena Dudášová", phone: "+421 900 000 009", address: "Hviezdoslavova 11, Žilina", kyc: "expired", amlRisk: "low", note: "Doklad totožnosti exspiroval — vyžiadať nový pred ďalším úkonom.", createdAt: d(-300) },
    { id: "c10", type: "company", name: "Green Energy Solutions, s. r. o.", registrationNumber: "00 000 010", email: "ceo@greenenergy.example", address: "Solárna 5, Košice", kyc: "pending", amlRisk: "medium", createdAt: d(-12) },
  ];
}

function matters(d: (n: number) => string, solo: boolean): Matter[] {
  const lead = (id: string) => (solo ? "m1" : id);
  const team = (...ids: string[]) => (solo ? ["m1"] : ids);
  const all: Matter[] = [
    {
      id: "k1", number: "2026/0031", title: "Nová Stavba vs. BauTech — nezaplatené faktúry za subdodávku", clientId: "c1", area: "commercial", type: "litigation",
      stage: "filed", leadId: lead("m2"), teamIds: team("m2", "m4"), court: "Mestský súd Bratislava III", courtFileNumber: "22Cb/58/2026", judge: "JUDr. M. Benedikt",
      value: 48_500, billing: { mode: "hourly", hourlyRate: 130 }, openedAt: d(-74),
      parties: [{ role: "client", name: "Nová Stavba, s. r. o." }, { role: "opponent", name: "BauTech Slovakia, s. r. o.", note: "zastúpený AK Mráz" }, { role: "court", name: "Mestský súd Bratislava III" }],
      tags: ["faktúry", "subdodávka", "úroky z omeškania"],
      summary: "Žaloba o zaplatenie 48 500 € s príslušenstvom za stavebné práce na objekte Dom Levice. Protistrana namieta vady diela; náš klient má preberacie protokoly bez výhrad.",
      nextStep: "Vyjadrenie k odporu žalovaného a návrh dôkazov (znalec z odboru stavebníctvo).", risk: "medium", researchIds: [],
    },
    {
      id: "k2", number: "2026/0037", title: "Kováč — vrátenie zálohy za vozidlo (odstúpenie od zmluvy)", clientId: "c2", area: "civil", type: "litigation",
      stage: "hearing", leadId: lead("m3"), teamIds: team("m3", "m5"), court: "Okresný súd Trnava", courtFileNumber: "11C/112/2026", judge: "JUDr. E. Gáborová",
      value: 8_900, billing: { mode: "tariff" }, openedAt: d(-120),
      parties: [{ role: "client", name: "Ing. Ján Kováč" }, { role: "opponent", name: "AutoCentrum Hlohovec, s. r. o." }, { role: "witness", name: "Peter Mikuš", note: "predajca, zamestnanec žalovaného" }, { role: "court", name: "Okresný súd Trnava" }],
      tags: ["spotrebiteľ", "odstúpenie", "záloha"],
      summary: "Klient zaplatil zálohu 8 900 € na vozidlo, ktoré predajca nedodal v dohodnutom termíne. Odstúpil od zmluvy; predajca zálohu nevrátil a tvrdí dohodu o posunutí termínu.",
      nextStep: "Pojednávanie — výsluch svedka Mikuša, predloženie e-mailovej komunikácie.", risk: "low", researchIds: [],
    },
    {
      id: "k3", number: "2026/0040", title: "Horváthová — rozvod a úprava výkonu rodičovských práv", clientId: "c3", area: "family", type: "litigation",
      stage: "filed", leadId: lead("m1"), teamIds: team("m1", "m4"), court: "Okresný súd Bratislava II", courtFileNumber: "8P/44/2026",
      billing: { mode: "tariff" }, openedAt: d(-58),
      parties: [{ role: "client", name: "Mária Horváthová" }, { role: "opponent", name: "Roman Horváth" }, { role: "authority", name: "ÚPSVaR Bratislava — kolízny opatrovník" }, { role: "court", name: "Okresný súd Bratislava II" }],
      tags: ["rozvod", "striedavá starostlivosť", "výživné"],
      summary: "Návrh na rozvod manželstva a úpravu výkonu rodičovských práv k dvom maloletým deťom. Klientka navrhuje osobnú starostlivosť s rozšíreným stykom otca; otec žiada striedavú starostlivosť.",
      nextStep: "Pripraviť klientku na výsluch; vyžiadať správu zo školy.", risk: "medium", researchIds: [],
    },
    {
      id: "k4", number: "2026/0042", title: "TechPoint — neplatnosť skončenia pracovného pomeru (Dolinský)", clientId: "c4", area: "labour", type: "litigation",
      stage: "analysis", leadId: lead("m2"), teamIds: team("m2", "m4"), value: 14_200, billing: { mode: "hourly", hourlyRate: 130 }, openedAt: d(-21),
      parties: [{ role: "client", name: "TechPoint Logistics, a. s." }, { role: "opponent", name: "Igor Dolinský", note: "bývalý vedúci skladu" }],
      tags: ["okamžité skončenie", "§ 68 ZP", "náhrada mzdy"],
      summary: "Bývalý zamestnanec napadol okamžité skončenie pracovného pomeru pre závažné porušenie pracovnej disciplíny. Preverujeme dodržanie lehôt podľa § 68 ods. 2 ZP a prerokovanie so zástupcami zamestnancov.",
      nextStep: "Stanovisko k šanciam a odporúčanie: obrana vs. zmier.", risk: "high", researchIds: [],
    },
    {
      id: "k5", number: "2026/0019", title: "Paulík — obhajoba, dopravná nehoda (§ 157 Tr. zák.)", clientId: "c5", area: "criminal", type: "criminalDefence",
      stage: "hearing", leadId: lead("m1"), teamIds: team("m1", "m5"), court: "Okresný súd Nitra", courtFileNumber: "2T/61/2026", judge: "JUDr. P. Kollár",
      billing: { mode: "hourly", hourlyRate: 150 }, openedAt: d(-160),
      parties: [{ role: "client", name: "Rastislav Paulík" }, { role: "authority", name: "Okresná prokuratúra Nitra" }, { role: "expert", name: "Ing. D. Révay", note: "znalec — cestná doprava" }, { role: "court", name: "Okresný súd Nitra" }],
      tags: ["obhajoba", "nedbanlivosť", "znalecký posudok"],
      summary: "Obžaloba z prečinu ublíženia na zdraví z nedbanlivosti po dopravnej nehode. Obhajoba stavia na spoluzavinení poškodeného (nedanie prednosti) a na rozporoch v znaleckom posudku.",
      nextStep: "Hlavné pojednávanie — výsluch znalca, návrh na doplnenie dokazovania.", risk: "medium", researchIds: [],
    },
    {
      id: "k6", number: "2026/0045", title: "Bytové družstvo — vypratanie bytu (Sedlák)", clientId: "c6", area: "realEstate", type: "litigation",
      stage: "intake", leadId: lead("m3"), teamIds: team("m3"), billing: { mode: "tariff" }, openedAt: d(-9),
      parties: [{ role: "client", name: "Bytové družstvo Ružinov" }, { role: "opponent", name: "Dušan Sedlák", note: "užíva byt bez právneho titulu" }],
      tags: ["vypratanie", "nájom", "neplatič"],
      summary: "Nájomca neplatí nájomné 7 mesiacov; nájomná zmluva skončila výpoveďou. Družstvo žiada vypratanie bytu a zaplatenie dlžného nájomného.",
      nextStep: "Zmluva o poskytovaní právnych služieb, plnomocenstvo, príprava žaloby.", risk: "low", researchIds: [],
    },
    {
      id: "k7", number: "2026/0028", title: "Urban — správna žaloba proti stavebnému povoleniu", clientId: "c7", area: "administrative", type: "administrative",
      stage: "filed", leadId: lead("m2"), teamIds: team("m2"), court: "Správny súd v Bratislave", courtFileNumber: "1S/88/2026",
      billing: { mode: "hourly", hourlyRate: 130 }, openedAt: d(-88),
      parties: [{ role: "client", name: "Karol Urban" }, { role: "authority", name: "Okresný úrad Pezinok — odbor výstavby" }, { role: "other", name: "Stavebník: Rezidencia Lipová, s. r. o." }, { role: "court", name: "Správny súd v Bratislave" }],
      tags: ["správna žaloba", "stavebné povolenie", "účastník konania"],
      summary: "Klient ako sused nebol pribraný za účastníka stavebného konania. Správna žaloba namieta porušenie procesných práv a nedostatočné posúdenie zatienenia pozemku.",
      nextStep: "Replika k vyjadreniu žalovaného.", risk: "medium", researchIds: [],
    },
    {
      id: "k8", number: "2026/0048", title: "Delta Pharm — GDPR a distribučné zmluvy", clientId: "c8", area: "commercial", type: "advisory",
      stage: "analysis", leadId: lead("m1"), teamIds: team("m1", "m4"), billing: { mode: "flat", flatFee: 4_500 }, openedAt: d(-17),
      parties: [{ role: "client", name: "Delta Pharm, s. r. o." }],
      tags: ["poradenstvo", "GDPR", "distribúcia"],
      summary: "Audit spracovania osobných údajov v CRM a revízia troch distribučných zmlúv (exkluzivita, zodpovednosť za vady, rozhodné právo).",
      nextStep: "Odovzdať písomné stanovisko a návrh dodatkov.", risk: "low", researchIds: [],
    },
    {
      id: "k9", number: "2026/0012", title: "Dudášová — oddlženie konkurzom", clientId: "c9", area: "insolvency", type: "litigation",
      stage: "decision", leadId: lead("m3"), teamIds: team("m3", "m4"), court: "Okresný súd Žilina", courtFileNumber: "4OdK/210/2026",
      billing: { mode: "flat", flatFee: 500 }, openedAt: d(-200),
      parties: [{ role: "client", name: "Alena Dudášová" }, { role: "other", name: "Centrum právnej pomoci Žilina" }, { role: "court", name: "Okresný súd Žilina" }],
      tags: ["osobný bankrot", "oddlženie"],
      summary: "Návrh na vyhlásenie konkurzu a oddlženie. Súd vyhlásil konkurz; správca žiada doplniť zoznam majetku.",
      nextStep: "Doplniť zoznam majetku a veriteľov pre správcu.", risk: "low", researchIds: [],
    },
    {
      id: "k10", number: "2026/0050", title: "Green Energy — prevod obchodného podielu", clientId: "c10", area: "commercial", type: "transaction",
      stage: "intake", leadId: lead("m2"), teamIds: team("m2", "m5"), value: 120_000, billing: { mode: "flat", flatFee: 2_800 }, openedAt: d(-5),
      parties: [{ role: "client", name: "Green Energy Solutions, s. r. o." }, { role: "other", name: "Nadobúdateľ: Ing. Milan Čierny" }],
      tags: ["M&A", "obchodný podiel", "due diligence"],
      summary: "Prevod 40 % obchodného podielu na nového spoločníka. Potrebná zmluva o prevode, súhlas valného zhromaždenia a zápis do OR.",
      nextStep: "Návrh zmluvy o prevode obchodného podielu.", risk: "low", researchIds: [],
    },
    {
      id: "k11", number: "2025/0094", title: "Nová Stavba — reklamácia stavebných prác (Dom Levice)", clientId: "c1", area: "civil", type: "litigation",
      stage: "appeal", leadId: lead("m2"), teamIds: team("m2"), court: "Krajský súd Nitra", courtFileNumber: "5Co/120/2026",
      value: 21_300, billing: { mode: "hourly", hourlyRate: 130 }, openedAt: d(-330),
      parties: [{ role: "client", name: "Nová Stavba, s. r. o." }, { role: "opponent", name: "Manželia Fekete" }, { role: "court", name: "Krajský súd Nitra" }],
      tags: ["vady diela", "odvolanie"],
      summary: "Objednávatelia žalujú zľavu z ceny diela pre vady. Súd prvej inštancie vyhovel čiastočne; obe strany podali odvolanie.",
      nextStep: "Vyjadrenie k odvolaniu protistrany.", risk: "medium", researchIds: [],
    },
    {
      id: "k12", number: "2025/0071", title: "Kováč — susedský spor o hranicu pozemku", clientId: "c2", area: "civil", type: "litigation",
      stage: "closed", leadId: lead("m3"), teamIds: team("m3"), court: "Okresný súd Trnava", courtFileNumber: "9C/18/2025",
      value: 3_200, billing: { mode: "tariff" }, openedAt: d(-400), closedAt: d(-40),
      parties: [{ role: "client", name: "Ing. Ján Kováč" }, { role: "opponent", name: "Jozef Baláž" }, { role: "court", name: "Okresný súd Trnava" }],
      tags: ["pozemok", "zmier"],
      summary: "Spor o priebeh hranice pozemku ukončený súdnym zmierom; geodetické zameranie na náklady oboch strán.",
      risk: "low", researchIds: [],
    },
  ];
  return solo ? all.filter((m) => ["k1", "k2", "k3", "k5", "k8", "k11", "k12"].includes(m.id)) : all;
}

function statutory(id: string, matterId: string, title: string, preset: Exclude<DeadlinePreset, "custom">, startDate: string, responsibleId: string, status: Deadline["status"] = "open", note?: string): Deadline {
  const rule = DEADLINE_RULES[preset];
  const computed = computeDeadline(startDate, rule.amount, rule.unit);
  return { id, matterId, title, preset, startDate, amount: rule.amount, unit: rule.unit, dueDate: computed.dueDate, shifted: computed.shifted, responsibleId, status, note };
}

function custom(id: string, matterId: string, title: string, startDate: string, days: number, responsibleId: string, status: Deadline["status"] = "open", note?: string): Deadline {
  const computed = computeDeadline(startDate, days, "days");
  return { id, matterId, title, preset: "custom", startDate, amount: days, unit: "days", dueDate: computed.dueDate, shifted: computed.shifted, responsibleId, status, note };
}

function deadlines(d: (n: number) => string, solo: boolean): Deadline[] {
  const who = (id: string) => (solo ? "m1" : id);
  const all = [
    statutory("l1", "k1", "Vyjadrenie k odporu žalovaného", "statementCourtSet", d(-9), who("m2"), "open", "Výzva súdu doručená do e-schránky."),
    custom("l2", "k2", "Doplnenie listinných dôkazov pred pojednávaním", d(-6), 7, who("m3"), "open", "Uznesenie súdu — predložiť e-mailovú komunikáciu."),
    statutory("l3", "k11", "Vyjadrenie k odvolaniu protistrany", "statementCourtSet", d(-18), who("m2"), "open", "Výzva odvolacieho súdu."),
    statutory("l4", "k7", "Replika k vyjadreniu žalovaného", "statementCourtSet", d(-10), who("m2")),
    custom("l5", "k9", "Doplnenie zoznamu majetku pre správcu", d(-3), 15, who("m3"), "open"),
    custom("l6", "k6", "Podanie žaloby o vypratanie", d(0), 20, who("m3"), "open", "Interný termín — klient žiada podanie do konca mesiaca."),
    statutory("l7", "k5", "Sťažnosť proti uzneseniu o zamietnutí návrhu na doplnenie dokazovania", "complaintCriminal", d(-12), who("m1"), "done", "Podaná v lehote."),
    statutory("l8", "k12", "Odvolanie proti rozsudku", "appealCsp", d(-70), who("m3"), "done", "Nepodané — uzavretý zmier."),
    custom("l9", "k3", "Predloženie správy školy a stanoviska kolízneho opatrovníka", d(-2), 10, who("m1")),
    custom("l10", "k8", "Odovzdanie stanoviska klientovi", d(-13), 17, who("m1"), "open", "Zmluvný termín."),
  ];
  const mine = new Set(matters(d, solo).map((m) => m.id));
  return all.filter((l) => mine.has(l.matterId));
}

function checklist(items: [string, boolean][]): HearingPrep["checklist"] {
  return items.map(([text, done], i) => ({ id: `c${i + 1}`, text, done }));
}

const EMPTY_PREP: HearingPrep = {
  checklist: checklist([["Skontrolovať spis a posledné podania", false], ["Pripraviť klienta (priebeh, otázky súdu)", false], ["Overiť doručenie predvolania všetkým účastníkom", false], ["Plnomocenstvo a doklady v origináli", false]]),
  chronology: [], evidence: [], witnesses: [], arguments: [], questions: [],
};

function hearings(d: (n: number) => string, solo: boolean): Hearing[] {
  const who = (...ids: string[]) => (solo ? ["m1"] : ids);
  const all: Hearing[] = [
    {
      id: "h1", matterId: "k2", kind: "hearing", date: d(2), time: "09:00", durationMinutes: 90, location: "Okresný súd Trnava", room: "č. 14, 2. poschodie", judge: "JUDr. E. Gáborová", attendeeIds: who("m3", "m5"), status: "scheduled",
      prep: {
        checklist: checklist([["Skontrolovať spis a posledné podania", true], ["Pripraviť klienta na výsluch", true], ["Overiť doručenie predvolania svedkovi Mikušovi", true], ["Originály: kúpna zmluva, doklad o zálohe, odstúpenie", true], ["Vytlačiť e-mailovú komunikáciu s predajcom (12 strán)", false], ["Návrh na náhradu trov — vyčíslenie podľa tarify", false]]),
        chronology: [
          { date: d(-250), event: "Podpis kúpnej zmluvy na vozidlo, zaplatenie zálohy 8 900 €", evidenceRef: "D1, D2" },
          { date: d(-190), event: "Dohodnutý termín dodania márne uplynul", evidenceRef: "D1" },
          { date: d(-175), event: "E-mailová urgencia klienta, predajca sľubuje dodanie do 14 dní", evidenceRef: "D3" },
          { date: d(-150), event: "Písomné odstúpenie od zmluvy doručené predajcovi", evidenceRef: "D4" },
          { date: d(-120), event: "Podanie žaloby o vrátenie zálohy", evidenceRef: "Spis" },
        ],
        evidence: [
          { id: "D1", label: "Kúpna zmluva č. 2025/118", kind: "document", status: "filed" },
          { id: "D2", label: "Doklad o úhrade zálohy (výpis z účtu)", kind: "document", status: "filed" },
          { id: "D3", label: "E-mailová komunikácia s predajcom (12 strán)", kind: "document", status: "toFile", note: "Priložiť k doplneniu dôkazov do lehoty." },
          { id: "D4", label: "Odstúpenie od zmluvy s doručenkou", kind: "document", status: "filed" },
          { id: "S1", label: "Výsluch svedka Petra Mikuša (predajca)", kind: "witness", status: "requested" },
        ],
        witnesses: [
          { name: "Peter Mikuš", side: "theirs", topic: "Údajná ústna dohoda o posunutí termínu dodania", status: "summoned" },
          { name: "Ing. Ján Kováč (klient)", side: "ours", topic: "Priebeh komunikácie, odstúpenie od zmluvy", status: "confirmed" },
          { name: "Eva Kováčová", side: "ours", topic: "Prítomná pri podpise zmluvy a telefonátoch s predajcom", status: "toSummon" },
        ],
        arguments: [
          { claim: "Termín dodania bol podstatnou náležitosťou; jeho márne uplynutie zakladá právo odstúpiť (§ 517 OZ).", support: "Kúpna zmluva čl. III, e-maily D3.", risk: "Protistrana tvrdí ústnu dohodu o posune — zmluva vyžaduje písomnú formu zmien (čl. VIII)." },
          { claim: "Odstúpenie bolo platne doručené; zmluva sa od začiatku zrušila a záloha je bezdôvodným obohatením (§ 451 OZ).", support: "Odstúpenie D4 s doručenkou.", risk: "Nízke." },
          { claim: "Úroky z omeškania odo dňa nasledujúceho po doručení odstúpenia.", support: "§ 517 ods. 2 OZ, nariadenie vlády 87/1995.", risk: "Súd môže priznať až od výzvy na vrátenie." },
        ],
        questions: [
          "Pán Mikuš, kedy a akou formou ste klientovi oznámili posun termínu dodania?",
          "Existuje o dohode o posune termínu písomný záznam?",
          "Aké vozidlo malo byť dodané a kedy ho predajca objednal u výrobcu?",
          "Prečo predajca zálohu nevrátil po doručení odstúpenia?",
        ],
      },
    },
    {
      id: "h2", matterId: "k5", kind: "hearing", date: d(5), time: "08:30", durationMinutes: 180, location: "Okresný súd Nitra", room: "č. 3", judge: "JUDr. P. Kollár", attendeeIds: who("m1", "m5"), status: "scheduled", note: "Hlavné pojednávanie — výsluch znalca.",
      prep: {
        checklist: checklist([["Preštudovať znalecký posudok a doplnok", true], ["Pripraviť otázky znalcovi (rýchlosť, brzdná dráha, výhľad)", true], ["Návrh na doplnenie dokazovania — kamerový záznam križovatky", false], ["Pripraviť klienta: právo nevypovedať, záverečná reč", false]]),
        chronology: [
          { date: d(-230), event: "Dopravná nehoda na križovatke, zranenie chodca", evidenceRef: "Spis — záznam PZ" },
          { date: d(-200), event: "Vznesenie obvinenia", evidenceRef: "Uznesenie" },
          { date: d(-110), event: "Znalecký posudok z odboru cestná doprava", evidenceRef: "ZP1" },
          { date: d(-60), event: "Podanie obžaloby", evidenceRef: "Obžaloba" },
        ],
        evidence: [
          { id: "ZP1", label: "Znalecký posudok Ing. Révay", kind: "expert", status: "filed" },
          { id: "K1", label: "Kamerový záznam z križovatky (mesto)", kind: "document", status: "requested", note: "Vyžiadané od mestskej polície." },
          { id: "O1", label: "Ohliadka miesta nehody za zníženej viditeľnosti", kind: "inspection", status: "toFile" },
        ],
        witnesses: [
          { name: "Ing. D. Révay", side: "court", topic: "Rýchlosť vozidla, možnosť zabrániť zrážke", status: "summoned" },
          { name: "Poškodený chodec", side: "theirs", topic: "Spôsob prechádzania vozovky", status: "summoned" },
        ],
        arguments: [
          { claim: "Poškodený vstúpil do vozovky mimo priechodu bez rozhliadnutia — spoluzavinenie.", support: "Výpoveď svedka, náčrt miesta nehody.", risk: "Znalec nevylučuje, že vodič mohol zrážke zabrániť pri dovolenej rýchlosti." },
          { claim: "Rozpor v posudku: brzdná dráha počítaná pre suchú vozovku, v čase nehody pršalo.", support: "Záznam PZ o stave vozovky.", risk: "Stredné." },
        ],
        questions: ["Pán znalec, s akým koeficientom adhézie ste počítali brzdnú dráhu?", "Bral posudok do úvahy zníženú viditeľnosť a mokrú vozovku?", "Akú rýchlosť by vodič musel mať, aby zrážke zabránil pri reakcii chodca 0,8 s?"],
      },
    },
    { id: "h3", matterId: "k1", kind: "hearing", date: d(9), time: "10:30", durationMinutes: 120, location: "Mestský súd Bratislava III", room: "č. 27", judge: "JUDr. M. Benedikt", attendeeIds: who("m2", "m4"), status: "scheduled", note: "Prvé pojednávanie vo veci samej.", prep: EMPTY_PREP },
    { id: "h4", matterId: "k3", kind: "hearing", date: d(16), time: "13:00", durationMinutes: 120, location: "Okresný súd Bratislava II", room: "č. 8", attendeeIds: who("m1", "m4"), status: "scheduled", prep: EMPTY_PREP },
    { id: "h5", matterId: "k8", kind: "consultation", date: d(1), time: "14:00", durationMinutes: 60, location: "Kancelária — zasadačka 2", attendeeIds: who("m1", "m4"), status: "scheduled", note: "Prezentácia zistení GDPR auditu vedeniu klienta.", prep: EMPTY_PREP },
    { id: "h6", matterId: "k4", kind: "negotiation", date: d(3), time: "16:00", durationMinutes: 90, location: "Online (videohovor)", attendeeIds: who("m2"), status: "scheduled", note: "Rokovanie o zmieri s právnym zástupcom zamestnanca.", prep: EMPTY_PREP },
    { id: "h7", matterId: "k10", kind: "meeting", date: d(0), time: "11:00", durationMinutes: 45, location: "Kancelária — zasadačka 1", attendeeIds: who("m2", "m5"), status: "scheduled", note: "Úvodné stretnutie: harmonogram prevodu podielu.", prep: EMPTY_PREP },
    { id: "h8", matterId: "k11", kind: "hearing", date: d(-20), time: "09:30", durationMinutes: 60, location: "Okresný súd Levice", attendeeIds: who("m2"), status: "done", note: "Vyhlásenie rozsudku.", prep: EMPTY_PREP },
    { id: "h9", matterId: "k5", kind: "hearing", date: d(-35), time: "08:30", durationMinutes: 120, location: "Okresný súd Nitra", room: "č. 3", attendeeIds: who("m1"), status: "adjourned", note: "Odročené — znalec sa ospravedlnil.", prep: EMPTY_PREP },
  ];
  const mine = new Set(matters(d, solo).map((m) => m.id));
  return all.filter((h) => mine.has(h.matterId));
}

function tasks(d: (n: number) => string, solo: boolean): Task[] {
  const who = (id: string) => (solo ? "m1" : id);
  const all: Task[] = [
    { id: "t1", matterId: "k2", title: "Vytlačiť a zoradiť e-mailovú komunikáciu ako dôkaz D3", dueDate: d(1), assigneeId: who("m5"), status: "doing", priority: "high" },
    { id: "t2", matterId: "k1", title: "Osloviť znalca z odboru stavebníctvo — cenová ponuka", dueDate: d(4), assigneeId: who("m4"), status: "todo", priority: "normal" },
    { id: "t3", matterId: "k8", title: "Finalizovať stanovisko k GDPR auditu", dueDate: d(3), assigneeId: who("m1"), status: "doing", priority: "high" },
    { id: "t4", matterId: "k6", title: "Pripraviť zmluvu o poskytovaní právnych služieb a plnomocenstvo", dueDate: d(2), assigneeId: who("m6"), status: "todo", priority: "normal" },
    { id: "t5", matterId: "k10", title: "Návrh zmluvy o prevode obchodného podielu — 1. verzia", dueDate: d(8), assigneeId: who("m2"), status: "todo", priority: "normal" },
    { id: "t6", matterId: "k3", title: "Vyžiadať správu zo školy detí", dueDate: d(5), assigneeId: who("m4"), status: "todo", priority: "normal" },
    { id: "t7", title: "Mesačná kontrola AML — exspirované doklady klientov", dueDate: d(6), assigneeId: who("m6"), status: "todo", priority: "low" },
    { id: "t8", matterId: "k9", title: "Zoznam majetku a veriteľov pre správcu", dueDate: d(10), assigneeId: who("m4"), status: "todo", priority: "normal" },
    { id: "t9", matterId: "k5", title: "Vyžiadať kamerový záznam z križovatky", dueDate: d(-1), assigneeId: who("m5"), status: "doing", priority: "high" },
    { id: "t10", matterId: "k4", title: "Analýza § 68 ZP — lehoty a prerokovanie so zástupcami zamestnancov", dueDate: d(-3), assigneeId: who("m4"), status: "done", priority: "high" },
    { id: "t11", title: "Fakturácia za predchádzajúci mesiac — kontrola výkazov", dueDate: d(2), assigneeId: who("m1"), status: "todo", priority: "normal" },
  ];
  const mine = new Set(matters(d, solo).map((m) => m.id));
  return all.filter((t) => !t.matterId || mine.has(t.matterId));
}

function timeEntries(d: (n: number) => string, solo: boolean): TimeEntry[] {
  const rate = (id: string) => (solo ? 120 : ({ m1: 150, m2: 130, m3: 120, m4: 80, m5: 50, m6: 0 } as Record<string, number>)[id] ?? 100);
  const who = (id: string) => (solo ? "m1" : id);
  const rows: [string, string, number, number, TimeEntry["activity"], string, boolean, string?][] = [
    ["k1", "m2", -1, 90, "drafting", "Vyjadrenie k odporu — koncept argumentácie k vadám diela", true],
    ["k1", "m4", -2, 150, "research", "Judikatúra NS SR k preberacím protokolom bez výhrad", true],
    ["k1", "m2", -5, 45, "call", "Telefonát s konateľom klienta — stav sporu, znalec", true],
    ["k1", "m4", -12, 120, "drafting", "Zhrnutie listinných dôkazov pre znalca", true],
    ["k2", "m3", -1, 120, "hearing", "Príprava na pojednávanie — výsluch svedka, chronológia", true],
    ["k2", "m5", -2, 60, "internal", "Kompletizácia dôkazov D1–D4, kópie pre súd", false],
    ["k2", "m3", -8, 60, "consultation", "Konzultácia s klientom pred pojednávaním", true],
    ["k3", "m1", -3, 90, "consultation", "Konzultácia s klientkou — návrh úpravy styku", true],
    ["k3", "m4", -4, 75, "drafting", "Doplnenie návrhu — skutkové okolnosti starostlivosti", true],
    ["k4", "m4", -3, 180, "research", "Analýza § 68 ZP, judikatúra k dvojmesačnej lehote", true],
    ["k4", "m2", -2, 60, "drafting", "Stanovisko klientovi: riziká, odporúčanie zmieru", true],
    ["k5", "m1", -4, 150, "drafting", "Otázky pre znalca; návrh na doplnenie dokazovania", true],
    ["k5", "m5", -6, 45, "email", "Žiadosť mestskej polícii o kamerový záznam", true],
    ["k5", "m1", -35, 150, "hearing", "Hlavné pojednávanie (odročené) — účasť", true],
    ["k7", "m2", -6, 120, "drafting", "Replika — procesné postavenie účastníka, zatienenie", true],
    ["k8", "m1", -2, 180, "drafting", "Stanovisko k GDPR auditu — spracovateľské zmluvy, retenčné lehoty", true],
    ["k8", "m4", -7, 240, "research", "Audit CRM: právne základy spracovania, súhlasy", true],
    ["k8", "m1", -16, 60, "consultation", "Úvodné stretnutie s vedením klienta", true],
    ["k9", "m4", -5, 45, "email", "Komunikácia so správcom konkurznej podstaty", true],
    ["k10", "m2", -4, 60, "consultation", "Úvodná konzultácia — štruktúra transakcie", true],
    ["k10", "m5", -3, 90, "research", "Výpis z OR, zakladateľská listina, prevoditeľnosť podielu", true],
    ["k11", "m2", -15, 120, "drafting", "Odvolanie proti rozsudku — výrok o zľave z ceny", true],
    ["k11", "m2", -20, 60, "hearing", "Vyhlásenie rozsudku — účasť", true],
    ["k6", "m3", -8, 60, "consultation", "Úvodná konzultácia s predsedom družstva", true],
    ["k1", "m2", -26, 120, "drafting", "Žaloba o zaplatenie — finalizácia", true, "f2"],
    ["k1", "m4", -28, 180, "drafting", "Žaloba o zaplatenie — koncept, výpočet úrokov", true, "f2"],
    ["k2", "m3", -45, 90, "drafting", "Žaloba o vrátenie zálohy", true, "f1"],
    ["k2", "m3", -50, 60, "consultation", "Prevzatie veci, analýza zmluvy", true, "f1"],
    ["k7", "m2", -40, 240, "drafting", "Správna žaloba — vypracovanie", true, "f3"],
    ["k7", "m2", -48, 60, "consultation", "Konzultácia s klientom, prevzatie podkladov", true, "f3"],
    ["k11", "m2", -60, 180, "hearing", "Pojednávanie — výsluch znalca", true, "f4"],
    ["k11", "m2", -75, 90, "drafting", "Vyjadrenie k žalobe", true, "f4"],
  ];
  const mine = new Set(matters(d, solo).map((m) => m.id));
  return rows
    .filter(([matterId]) => mine.has(matterId))
    .map(([matterId, memberId, day, minutes, activity, description, billable, invoiceId], i) => ({
      id: `e${i + 1}`, matterId, memberId: who(memberId), date: d(day), minutes, activity, description, billable, rate: rate(who(memberId)), invoiceId,
    }));
}

function invoices(d: (n: number) => string, solo: boolean): Invoice[] {
  const all: Invoice[] = [
    { id: "f1", number: "2026/0041", clientId: "c2", matterId: "k2", issuedAt: d(-44), dueAt: d(-30), lines: [{ description: "Právne služby — žaloba o vrátenie zálohy (2 úkony podľa tarify)", quantity: 2, unit: "act", unitPrice: 240.3 }, { description: "Režijný paušál", quantity: 2, unit: "act", unitPrice: 15.86 }], vatRate: 20, status: "paid", paidAt: d(-33) },
    { id: "f2", number: "2026/0046", clientId: "c1", matterId: "k1", issuedAt: d(-24), dueAt: d(-10), lines: [{ description: "Právne služby — žaloba o zaplatenie (koncept, finalizácia)", quantity: 5, unit: "h", unitPrice: 130 }, { description: "Súdny poplatok (6 % z 48 500 €, elektronické podanie)", quantity: 1, unit: "item", unitPrice: 2860 }], vatRate: 20, status: "sent" },
    { id: "f3", number: "2026/0038", clientId: "c7", matterId: "k7", issuedAt: d(-70), dueAt: d(-56), lines: [{ description: "Právne služby — správna žaloba", quantity: 5, unit: "h", unitPrice: 130 }], vatRate: 20, status: "overdue" },
    { id: "f4", number: "2026/0022", clientId: "c1", matterId: "k11", issuedAt: d(-95), dueAt: d(-81), lines: [{ description: "Právne služby — pojednávanie, vyjadrenie k žalobe", quantity: 4.5, unit: "h", unitPrice: 130 }], vatRate: 20, status: "paid", paidAt: d(-78) },
    { id: "f5", number: "2026/0052", clientId: "c8", matterId: "k8", issuedAt: d(0), dueAt: d(14), lines: [{ description: "Paušálna odmena — GDPR audit a revízia zmlúv (1. splátka 50 %)", quantity: 1, unit: "item", unitPrice: 2250 }], vatRate: 20, status: "draft" },
  ];
  const mine = new Set(matters(d, solo).map((m) => m.id));
  return all.filter((f) => mine.has(f.matterId));
}

function documents(d: (n: number) => string, solo: boolean): MatterDocument[] {
  const who = (id: string) => (solo ? "m1" : id);
  const all: MatterDocument[] = [
    { id: "d1", matterId: "k1", title: "Žaloba o zaplatenie 48 500 € s prísl.", kind: "submission", version: 3, updatedAt: d(-26), authorId: who("m2"), status: "filed", sizeKb: 412 },
    { id: "d2", matterId: "k1", title: "Odpor žalovaného (doručený)", kind: "correspondence", version: 1, updatedAt: d(-9), authorId: who("m6"), status: "final", sizeKb: 1380 },
    { id: "d3", matterId: "k1", title: "Vyjadrenie k odporu — koncept", kind: "submission", version: 2, updatedAt: d(-1), authorId: who("m2"), status: "draft", sizeKb: 96 },
    { id: "d4", matterId: "k2", title: "Žaloba o vrátenie zálohy", kind: "submission", version: 2, updatedAt: d(-45), authorId: who("m3"), status: "filed", sizeKb: 210 },
    { id: "d5", matterId: "k2", title: "E-mailová komunikácia s predajcom (D3)", kind: "evidence", version: 1, updatedAt: d(-2), authorId: who("m5"), status: "final", sizeKb: 2450 },
    { id: "d6", matterId: "k3", title: "Návrh na rozvod a úpravu výkonu rodičovských práv", kind: "submission", version: 4, updatedAt: d(-30), authorId: who("m4"), status: "filed", sizeKb: 330 },
    { id: "d7", matterId: "k4", title: "Stanovisko — okamžité skončenie PP (§ 68 ZP)", kind: "memo", version: 1, updatedAt: d(-2), authorId: who("m2"), status: "draft", sizeKb: 88 },
    { id: "d8", matterId: "k5", title: "Znalecký posudok Ing. Révay", kind: "evidence", version: 1, updatedAt: d(-110), authorId: who("m6"), status: "final", sizeKb: 5120 },
    { id: "d9", matterId: "k5", title: "Návrh na doplnenie dokazovania", kind: "submission", version: 1, updatedAt: d(-3), authorId: who("m1"), status: "draft", sizeKb: 64 },
    { id: "d10", matterId: "k7", title: "Správna žaloba", kind: "submission", version: 3, updatedAt: d(-40), authorId: who("m2"), status: "filed", sizeKb: 290 },
    { id: "d11", matterId: "k8", title: "GDPR audit — správa a odporúčania", kind: "memo", version: 2, updatedAt: d(-2), authorId: who("m1"), status: "draft", sizeKb: 540 },
    { id: "d12", matterId: "k11", title: "Rozsudok OS Levice 7C/45/2025", kind: "decision", version: 1, updatedAt: d(-20), authorId: who("m6"), status: "final", sizeKb: 760 },
    { id: "d13", matterId: "k11", title: "Odvolanie proti rozsudku", kind: "submission", version: 2, updatedAt: d(-14), authorId: who("m2"), status: "filed", sizeKb: 180 },
    { id: "d14", matterId: "k10", title: "Výpis z obchodného registra a zakladateľská listina", kind: "evidence", version: 1, updatedAt: d(-3), authorId: who("m5"), status: "final", sizeKb: 920 },
    { id: "d15", title: "Šablóna — Zmluva o poskytovaní právnych služieb", kind: "template", version: 7, updatedAt: d(-90), authorId: who("m1"), status: "final", sizeKb: 72 },
    { id: "d16", title: "Šablóna — Plnomocenstvo (všeobecné)", kind: "template", version: 4, updatedAt: d(-200), authorId: who("m1"), status: "final", sizeKb: 24 },
    { id: "d17", title: "Šablóna — Odpor proti platobnému rozkazu", kind: "template", version: 3, updatedAt: d(-120), authorId: who("m3"), status: "final", sizeKb: 40 },
    { id: "d18", title: "Šablóna — Odvolanie (civilné konanie)", kind: "template", version: 5, updatedAt: d(-60), authorId: who("m2"), status: "final", sizeKb: 48 },
    { id: "d19", title: "Šablóna — Záznam o identifikácii klienta (AML)", kind: "template", version: 2, updatedAt: d(-150), authorId: who("m6"), status: "final", sizeKb: 30 },
  ];
  const mine = new Set(matters(d, solo).map((m) => m.id));
  return all.filter((x) => !x.matterId || mine.has(x.matterId));
}

function activities(d: (n: number) => string, solo: boolean): Activity[] {
  const who = (id: string) => (solo ? "m1" : id);
  const all: Activity[] = [
    { id: "a1", at: `${d(0)}T08:12:00`, memberId: who("m2"), matterId: "k1", text: "Upravil koncept vyjadrenia k odporu (v2)." },
    { id: "a2", at: `${d(-1)}T16:40:00`, memberId: who("m5"), matterId: "k2", text: "Nahral dôkaz D3 — e-mailová komunikácia (12 strán)." },
    { id: "a3", at: `${d(-1)}T11:05:00`, memberId: who("m1"), matterId: "k8", text: "Zapísal 3 h — stanovisko k GDPR auditu." },
    { id: "a4", at: `${d(-2)}T14:30:00`, memberId: who("m4"), matterId: "k4", text: "Dokončila analýzu § 68 ZP; úloha uzavretá." },
    { id: "a5", at: `${d(-2)}T09:20:00`, memberId: who("m6"), matterId: "k1", text: "Zaevidovala doručený odpor žalovaného z e-schránky." },
    { id: "a6", at: `${d(-3)}T17:10:00`, memberId: who("m3"), matterId: "k6", text: "Otvoril spis 2026/0045 po úvodnej konzultácii; kontrola konfliktu bez nálezu." },
    { id: "a7", at: `${d(-4)}T10:00:00`, memberId: who("m2"), matterId: "k10", text: "Nový spis 2026/0050 — prevod obchodného podielu." },
    { id: "a8", at: `${d(-5)}T15:45:00`, memberId: who("m1"), matterId: "k5", text: "Pridal lehotu: sťažnosť proti uzneseniu — podaná." },
  ];
  const mine = new Set(matters(d, solo).map((m) => m.id));
  return all.filter((a) => !a.matterId || mine.has(a.matterId));
}

export function seedWorkspace(kind: WorkspaceKind, today: string): Workspace {
  const d = (n: number) => addDays(today, n);
  const solo = kind === "solo";
  const year = Number(today.slice(0, 4));
  const base = tariffBaseFor(year in { 2025: 1, 2026: 1 } ? year : 2026);
  const ms = matters(d, solo);
  const usedClients = new Set(ms.map((m) => m.clientId));
  return {
    version: 1,
    kind,
    seededAt: today,
    firm: solo
      ? { name: "JUDr. Martin Hronec, advokát", address: "Dunajská 14, 811 08 Bratislava" }
      : { name: "Hronec & Partners, s. r. o., advokátska kancelária", address: "Dunajská 14, 811 08 Bratislava" },
    currentMemberId: "m1",
    members: solo ? SOLO_MEMBERS : FIRM_MEMBERS,
    clients: clients(d).filter((c) => usedClients.has(c.id)),
    matters: ms,
    deadlines: deadlines(d, solo),
    hearings: hearings(d, solo),
    tasks: tasks(d, solo),
    timeEntries: timeEntries(d, solo),
    invoices: invoices(d, solo),
    documents: documents(d, solo),
    activities: activities(d, solo),
    settings: { tariffBase: base, tariffYear: year in { 2025: 1, 2026: 1 } ? year : 2026, defaultHourlyRate: solo ? 120 : 130, vatRate: 20, currency: "EUR" },
  };
}
