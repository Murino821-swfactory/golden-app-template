import type { Localized } from "./localized";
import type { CountryCode, EntityKind } from "./tax";

/**
 * BizLaunch CEE registration checklists: five countries × company / sole trader, in
 * chronological order, each linking the official portal where the step is done.
 *
 * Deadlines appear only where the statutory term is certain; a step without one is not
 * "no deadline", it is "check with the authority". Links are pinned to an allowlist of
 * official hosts by `tests/bizlaunch-checklists.spec.ts`.
 */

export interface ChecklistStep {
  id: string;
  title: Localized;
  detail: Localized;
  deadline?: Localized;
  portal?: { name: string; url: string };
}

export const COUNTRIES: Record<CountryCode, { name: Localized; flag: string }> = {
  SK: { name: { en: "Slovakia", sk: "Slovensko" }, flag: "🇸🇰" },
  CZ: { name: { en: "Czechia", sk: "Česko" }, flag: "🇨🇿" },
  PL: { name: { en: "Poland", sk: "Poľsko" }, flag: "🇵🇱" },
  HU: { name: { en: "Hungary", sk: "Maďarsko" }, flag: "🇭🇺" },
  UA: { name: { en: "Ukraine", sk: "Ukrajina" }, flag: "🇺🇦" },
};

/** The local name of each legal form — never translated, it is what the forms call it. */
export const ENTITY_NAMES: Record<CountryCode, Record<EntityKind, string>> = {
  SK: { company: "s.r.o.", sole: "Živnosť" },
  CZ: { company: "s.r.o.", sole: "OSVČ" },
  PL: { company: "Sp. z o.o.", sole: "JDG" },
  HU: { company: "Kft.", sole: "Egyéni vállalkozó" },
  UA: { company: "TOV", sole: "FOP" },
};

const BEFORE_TRADING: Localized = {
  en: "Before you start trading",
  sk: "Pred začatím podnikania",
};

const PORTAL = {
  slovenskoSk: { name: "Slovensko.sk", url: "https://www.slovensko.sk" },
  orsr: { name: "Obchodný register SR", url: "https://www.orsr.sk" },
  financnaSprava: { name: "Finančná správa SR", url: "https://www.financnasprava.sk" },
  socpoist: { name: "Sociálna poisťovňa", url: "https://www.socpoist.sk" },
  orJustice: { name: "Obchodní rejstřík", url: "https://or.justice.cz" },
  esm: { name: "Evidence skutečných majitelů", url: "https://esm.justice.cz" },
  rzp: { name: "Registr živnostenského podnikání", url: "https://rzp.gov.cz" },
  mojeDane: { name: "Moje daně", url: "https://adisspr.mfcr.cz" },
  financniSprava: { name: "Finanční správa ČR", url: "https://financnisprava.gov.cz" },
  cssz: { name: "ČSSZ", url: "https://www.cssz.gov.cz" },
  datovka: { name: "Datové schránky", url: "https://datovka.gov.cz" },
  krs: { name: "Portal Rejestrów Sądowych (S24)", url: "https://prs.ms.gov.pl/krs" },
  crbr: { name: "CRBR", url: "https://crbr.podatki.gov.pl" },
  podatki: { name: "Podatki.gov.pl", url: "https://www.podatki.gov.pl" },
  biznes: { name: "Biznes.gov.pl (CEIDG)", url: "https://www.biznes.gov.pl" },
  zus: { name: "ZUS", url: "https://www.zus.pl" },
  cegjegyzek: { name: "e-cegjegyzek.hu", url: "https://www.e-cegjegyzek.hu" },
  nav: { name: "NAV", url: "https://nav.gov.hu" },
  ugyfelkapu: { name: "Ügyfélkapu+", url: "https://ugyfelkapu.gov.hu" },
  diia: { name: "Diia", url: "https://diia.gov.ua" },
  taxCabinet: { name: "Електронний кабінет ДПС", url: "https://cabinet.tax.gov.ua" },
} as const;

export const CHECKLISTS: Record<CountryCode, Record<EntityKind, ChecklistStep[]>> = {
  SK: {
    company: [
      {
        id: "name-check",
        title: { en: "Check the company name", sk: "Overte obchodné meno" },
        detail: {
          en: "The name must be unique in the Business Register and end with “s.r.o.” or “spol. s r.o.”.",
          sk: "Meno musí byť v Obchodnom registri jedinečné a končiť „s.r.o.“ alebo „spol. s r.o.“.",
        },
        portal: PORTAL.orsr,
      },
      {
        id: "founding-deed",
        title: {
          en: "Sign the founding deed and pay in the capital",
          sk: "Podpíšte zakladateľskú listinu a splaťte vklad",
        },
        detail: {
          en: "Minimum share capital is €5,000, at least €750 per shareholder. One founder signs a founding deed, several sign a memorandum of association.",
          sk: "Minimálne základné imanie je 5 000 €, vklad spoločníka aspoň 750 €. Jeden zakladateľ podpisuje zakladateľskú listinu, viacerí spoločenskú zmluvu.",
        },
      },
      {
        id: "trade-licence",
        title: { en: "Obtain the trade licence", sk: "Získajte živnostenské oprávnenie" },
        detail: {
          en: "Free trades need only a notification; regulated trades need proof of qualification. File it electronically.",
          sk: "Pri voľných živnostiach stačí ohlásenie, pri remeselných a viazaných treba doklad o odbornej spôsobilosti. Podáva sa elektronicky.",
        },
        portal: PORTAL.slovenskoSk,
      },
      {
        id: "business-register",
        title: {
          en: "File the Business Register application",
          sk: "Podajte návrh na zápis do Obchodného registra",
        },
        detail: {
          en: "Filed electronically, including the beneficial owner. The registration court decides within 2 working days.",
          sk: "Podáva sa elektronicky vrátane údajov o konečnom užívateľovi výhod. Registrový súd rozhodne do 2 pracovných dní.",
        },
        deadline: {
          en: "Within 90 days of signing the founding deed",
          sk: "Do 90 dní od podpisu zakladateľskej listiny",
        },
        portal: PORTAL.slovenskoSk,
      },
      {
        id: "tax-mailbox",
        title: {
          en: "Activate e-communication with the Financial Administration",
          sk: "Aktivujte elektronickú komunikáciu s finančnou správou",
        },
        detail: {
          en: "The company is registered for income tax from the register data; a company must file and receive tax mail electronically.",
          sk: "Registrácia k dani z príjmov prebehne z údajov registra; spoločnosť musí s finančnou správou komunikovať elektronicky.",
        },
        portal: PORTAL.financnaSprava,
      },
      {
        id: "vat",
        title: { en: "Register for VAT when required", sk: "Registrujte sa za platiteľa DPH, keď treba" },
        detail: {
          en: "Registration is due once 12-month turnover exceeds €50,000; above €62,500 you become a VAT payer immediately.",
          sk: "Povinnosť vzniká, keď obrat za 12 mesiacov presiahne 50 000 €; nad 62 500 € sa stávate platiteľom okamžite.",
        },
        portal: PORTAL.financnaSprava,
      },
    ],
    sole: [
      {
        id: "notify-trade",
        title: { en: "Notify your trade", sk: "Ohláste živnosť" },
        detail: {
          en: "One electronic form also registers you for income tax and health insurance.",
          sk: "Jeden elektronický formulár vás zároveň zaregistruje k dani z príjmov a na zdravotné poistenie.",
        },
        deadline: BEFORE_TRADING,
        portal: PORTAL.slovenskoSk,
      },
      {
        id: "health",
        title: { en: "Start health insurance advances", sk: "Začnite platiť preddavky na zdravotné poistenie" },
        detail: {
          en: "Your health insurer sets the monthly advance; the 2026 minimum is €121.92.",
          sk: "Výšku preddavku určí zdravotná poisťovňa; minimum v roku 2026 je 121,92 €.",
        },
      },
      {
        id: "social",
        title: {
          en: "Check your social insurance obligation",
          sk: "Overte si povinnosť platiť sociálne poistenie",
        },
        detail: {
          en: "The Social Insurance Agency sets when your obligation starts and its amount; the standard 2026 minimum is €303.11 a month.",
          sk: "Sociálna poisťovňa určí vznik povinnosti a výšku poistného; štandardné minimum v roku 2026 je 303,11 € mesačne.",
        },
        portal: PORTAL.socpoist,
      },
      {
        id: "tax-mailbox",
        title: { en: "Activate your tax e-mailbox", sk: "Aktivujte si daňovú elektronickú schránku" },
        detail: {
          en: "Needed to file tax returns and receive tax mail electronically.",
          sk: "Potrebná na elektronické podávanie priznaní a doručovanie od finančnej správy.",
        },
        portal: PORTAL.financnaSprava,
      },
      {
        id: "records",
        title: { en: "Keep simple tax records", sk: "Veďte daňovú evidenciu" },
        detail: {
          en: "With 60 % flat expenses you record only income and receivables.",
          sk: "Pri 60 % paušálnych výdavkoch evidujete len príjmy a pohľadávky.",
        },
      },
      {
        id: "tax-return",
        title: { en: "File the annual tax return (type B)", sk: "Podajte daňové priznanie typ B" },
        detail: {
          en: "Can be extended by up to three months with a notice filed by the same date.",
          sk: "Lehotu možno predĺžiť až o tri mesiace oznámením podaným do toho istého dňa.",
        },
        deadline: { en: "By 31 March of the following year", sk: "Do 31. marca nasledujúceho roka" },
        portal: PORTAL.financnaSprava,
      },
    ],
  },
  CZ: {
    company: [
      {
        id: "name-check",
        title: { en: "Check the company name", sk: "Overte obchodnú firmu" },
        detail: {
          en: "The name must be distinguishable in the Commercial Register and include “s.r.o.” or “spol. s r.o.”.",
          sk: "Firma sa nesmie dať v Obchodnom registri zameniť s inou a musí obsahovať „s.r.o.“ alebo „spol. s r.o.“.",
        },
        portal: PORTAL.orJustice,
      },
      {
        id: "notarial-deed",
        title: { en: "Have a notary draw up the founding deed", sk: "Nechajte spísať zakladateľskú listinu u notára" },
        detail: {
          en: "It must be a notarial deed; minimum capital is CZK 1. The notary can file the registration for you.",
          sk: "Musí mať formu notárskej zápisnice; základný kapitál je od 1 Kč. Zápis môže podať priamo notár.",
        },
      },
      {
        id: "trade-licence",
        title: { en: "Obtain the trade licence", sk: "Získajte živnostenské oprávnenie" },
        detail: {
          en: "Apply at any trade licensing office with the single registration form.",
          sk: "Žiadosť podáte na ktoromkoľvek živnostenskom úrade cez jednotný registračný formulár.",
        },
        portal: PORTAL.rzp,
      },
      {
        id: "commercial-register",
        title: { en: "Register in the Commercial Register", sk: "Zapíšte spoločnosť do Obchodného registra" },
        detail: {
          en: "The company exists from the day of entry; a data box is set up for it automatically.",
          sk: "Spoločnosť vzniká dňom zápisu; dátová schránka sa jej zriadi automaticky.",
        },
        deadline: { en: "Within 90 days of founding", sk: "Do 90 dní od založenia" },
        portal: PORTAL.orJustice,
      },
      {
        id: "beneficial-owner",
        title: { en: "Record the beneficial owner", sk: "Zapíšte skutočného majiteľa" },
        detail: {
          en: "Every company must list its beneficial owners in the register of beneficial owners.",
          sk: "Každá spoločnosť musí uviesť skutočných majiteľov v evidencii skutočných majiteľov.",
        },
        portal: PORTAL.esm,
      },
      {
        id: "tax-registration",
        title: { en: "Register with the tax office", sk: "Zaregistrujte sa na finančnom úrade" },
        detail: {
          en: "File the registration through Moje daně or the data box.",
          sk: "Prihlášku podáte cez Moje daně alebo dátovú schránku.",
        },
        deadline: { en: "Within 30 days of registration", sk: "Do 30 dní od zápisu" },
        portal: PORTAL.mojeDane,
      },
    ],
    sole: [
      {
        id: "trade-licence",
        title: { en: "Obtain the trade licence", sk: "Získajte živnostenské oprávnenie" },
        detail: {
          en: "The single registration form also registers you with the tax office, social security and your health insurer.",
          sk: "Jednotný registračný formulár vás zároveň prihlási na finančný úrad, ČSSZ aj do zdravotnej poisťovne.",
        },
        deadline: BEFORE_TRADING,
        portal: PORTAL.rzp,
      },
      {
        id: "social",
        title: { en: "Report the start of business to ČSSZ", sk: "Nahláste začatie činnosti na ČSSZ" },
        detail: {
          en: "Social security advances start from the month you begin trading.",
          sk: "Zálohy na sociálne poistenie platíte od mesiaca začatia činnosti.",
        },
        deadline: {
          en: "By the 8th day of the month after you start",
          sk: "Do 8. dňa mesiaca po začatí činnosti",
        },
        portal: PORTAL.cssz,
      },
      {
        id: "health",
        title: { en: "Report to your health insurer", sk: "Nahláste sa zdravotnej poisťovni" },
        detail: {
          en: "The 2026 minimum health advance is CZK 3,306 a month.",
          sk: "Minimálna záloha na zdravotné poistenie v roku 2026 je 3 306 Kč mesačne.",
        },
        deadline: { en: "Within 8 days of starting", sk: "Do 8 dní od začatia činnosti" },
      },
      {
        id: "flat-tax",
        title: { en: "Decide on the flat tax (paušální daň)", sk: "Rozhodnite sa pre paušálnu daň" },
        detail: {
          en: "One monthly payment covers income tax, social and health insurance, and the annual returns disappear.",
          sk: "Jedna mesačná platba pokrýva daň, sociálne aj zdravotné poistenie a odpadajú ročné priznania.",
        },
        deadline: {
          en: "By 10 January, or by the 10th of the month after you start",
          sk: "Do 10. januára, alebo do 10. dňa mesiaca po začatí činnosti",
        },
        portal: PORTAL.financniSprava,
      },
      {
        id: "data-box",
        title: { en: "Start using your data box", sk: "Začnite používať dátovú schránku" },
        detail: {
          en: "Sole traders get a data box automatically; official mail is delivered there.",
          sk: "Podnikateľ dostane dátovú schránku automaticky; doručuje sa do nej úradná pošta.",
        },
        portal: PORTAL.datovka,
      },
      {
        id: "tax-return",
        title: { en: "File the annual tax return", sk: "Podajte ročné daňové priznanie" },
        detail: {
          en: "Not needed in the flat-tax regime. Filed electronically, the deadline moves a month later.",
          sk: "V paušálnom režime netreba. Pri elektronickom podaní sa lehota posúva o mesiac.",
        },
        deadline: { en: "By 1 April of the following year", sk: "Do 1. apríla nasledujúceho roka" },
        portal: PORTAL.mojeDane,
      },
    ],
  },
  PL: {
    company: [
      {
        id: "s24",
        title: { en: "Register online via S24 or with a notary", sk: "Zaregistrujte spoločnosť cez S24 alebo u notára" },
        detail: {
          en: "The S24 template agreement is the fastest route; minimum share capital is PLN 5,000.",
          sk: "Vzorová zmluva v S24 je najrýchlejšia cesta; minimálny základný kapitál je 5 000 PLN.",
        },
        portal: PORTAL.krs,
      },
      {
        id: "capital",
        title: { en: "Pay in the share capital", sk: "Splaťte základný kapitál" },
        detail: {
          en: "A company registered via S24 pays the capital in after registration.",
          sk: "Spoločnosť zapísaná cez S24 spláca kapitál až po zápise.",
        },
        deadline: { en: "Within 7 days of registration (S24)", sk: "Do 7 dní od zápisu (S24)" },
      },
      {
        id: "crbr",
        title: { en: "Report beneficial owners to CRBR", sk: "Nahláste skutočných majiteľov do CRBR" },
        detail: {
          en: "Filed electronically by a person authorised to represent the company.",
          sk: "Podáva elektronicky osoba oprávnená zastupovať spoločnosť.",
        },
        deadline: { en: "Within 14 days of registration", sk: "Do 14 dní od zápisu" },
        portal: PORTAL.crbr,
      },
      {
        id: "nip-8",
        title: { en: "File NIP-8 with the tax office", sk: "Podajte NIP-8 na daňový úrad" },
        detail: {
          en: "Supplementary data, including the company bank account.",
          sk: "Doplňujúce údaje vrátane bankového účtu spoločnosti.",
        },
        deadline: { en: "Within 21 days of registration", sk: "Do 21 dní od zápisu" },
        portal: PORTAL.podatki,
      },
      {
        id: "vat",
        title: { en: "Decide on VAT registration (VAT-R)", sk: "Rozhodnite o registrácii k DPH (VAT-R)" },
        detail: {
          en: "Register before your first taxable sale unless you use the small-business exemption.",
          sk: "Registrujte sa pred prvým zdaniteľným plnením, ak nevyužívate oslobodenie pre malých podnikateľov.",
        },
        portal: PORTAL.podatki,
      },
      {
        id: "zus-shareholder",
        title: { en: "Sole shareholder: register with ZUS", sk: "Jediný spoločník: prihláste sa do ZUS" },
        detail: {
          en: "The only shareholder of a single-member company pays social contributions like a sole trader.",
          sk: "Jediný spoločník jednoosobovej spoločnosti platí sociálne odvody ako živnostník.",
        },
        deadline: { en: "Within 7 days of registration", sk: "Do 7 dní od zápisu" },
        portal: PORTAL.zus,
      },
    ],
    sole: [
      {
        id: "ceidg",
        title: { en: "Register the business in CEIDG", sk: "Zaregistrujte podnikanie v CEIDG" },
        detail: {
          en: "Free and online; the same form notifies the tax office and ZUS and records your tax choice.",
          sk: "Zadarmo a online; ten istý formulár informuje daňový úrad aj ZUS a zaznamená voľbu zdanenia.",
        },
        deadline: BEFORE_TRADING,
        portal: PORTAL.biznes,
      },
      {
        id: "ryczalt",
        title: { en: "Choose ryczałt as your tax form", sk: "Zvoľte ryczałt ako formu zdanenia" },
        detail: {
          en: "IT services are taxed at 12 % of revenue, with no cost deduction.",
          sk: "IT služby sa zdaňujú 12 % z obratu, bez odpočtu nákladov.",
        },
        deadline: {
          en: "By the 20th of the month after your first revenue",
          sk: "Do 20. dňa mesiaca po prvom príjme",
        },
        portal: PORTAL.podatki,
      },
      {
        id: "zus",
        title: { en: "Register with ZUS", sk: "Prihláste sa do ZUS" },
        detail: {
          en: "New businesses may skip social contributions for 6 months (ulga na start), then pay reduced ZUS for 24 months.",
          sk: "Nový podnikateľ môže 6 mesiacov neplatiť sociálne odvody (ulga na start) a potom 24 mesiacov platiť znížený ZUS.",
        },
        deadline: { en: "Within 7 days of starting", sk: "Do 7 dní od začatia činnosti" },
        portal: PORTAL.zus,
      },
      {
        id: "vat",
        title: { en: "Check whether you must register for VAT", sk: "Overte, či sa musíte registrovať k DPH" },
        detail: {
          en: "Small businesses may use the VAT exemption up to the statutory revenue limit; some services never qualify.",
          sk: "Malý podnikateľ môže využiť oslobodenie od DPH do zákonného limitu obratu; niektoré služby nárok nemajú.",
        },
        portal: PORTAL.podatki,
      },
      {
        id: "pit-28",
        title: { en: "File the annual PIT-28 return", sk: "Podajte ročné priznanie PIT-28" },
        detail: {
          en: "The ryczałt return; filed online.",
          sk: "Priznanie pre ryczałt; podáva sa online.",
        },
        deadline: { en: "By the end of February", sk: "Do konca februára" },
        portal: PORTAL.podatki,
      },
    ],
  },
  HU: {
    company: [
      {
        id: "lawyer",
        title: { en: "Appoint a lawyer for the registration", sk: "Poverte advokáta registráciou" },
        detail: {
          en: "Company registration is electronic and requires legal representation.",
          sk: "Registrácia spoločnosti je elektronická a vyžaduje právne zastúpenie.",
        },
      },
      {
        id: "capital",
        title: { en: "Provide the share capital", sk: "Zabezpečte základné imanie" },
        detail: {
          en: "Minimum share capital is HUF 3,000,000.",
          sk: "Minimálne základné imanie je 3 000 000 HUF.",
        },
      },
      {
        id: "court-of-registration",
        title: { en: "Register with the Court of Registration", sk: "Zapíšte spoločnosť na registrovom súde" },
        detail: {
          en: "Your lawyer files electronically; the company extract is published on e-cegjegyzek.hu.",
          sk: "Advokát podáva elektronicky; výpis spoločnosti sa zverejní na e-cegjegyzek.hu.",
        },
        portal: PORTAL.cegjegyzek,
      },
      {
        id: "company-gate",
        title: { en: "Set up the company gate (Cégkapu)", sk: "Zriaďte firemnú bránu (Cégkapu)" },
        detail: {
          en: "The mandatory official electronic mailbox of every company.",
          sk: "Povinná úradná elektronická schránka každej spoločnosti.",
        },
      },
      {
        id: "nav",
        title: { en: "Complete the tax registration with NAV", sk: "Dokončite daňovú registráciu na NAV" },
        detail: {
          en: "The tax number is issued at registration; report the bank account and later changes to NAV.",
          sk: "Daňové číslo pridelia pri registrácii; bankový účet a neskoršie zmeny nahlasujete NAV.",
        },
        portal: PORTAL.nav,
      },
      {
        id: "local-tax",
        title: { en: "Register for local business tax (HIPA)", sk: "Prihláste sa k miestnej dani z podnikania (HIPA)" },
        detail: {
          en: "Report to the municipality of the registered seat.",
          sk: "Prihlásite sa na obci podľa sídla spoločnosti.",
        },
      },
    ],
    sole: [
      {
        id: "client-gate",
        title: { en: "Create your Ügyfélkapu+ account", sk: "Založte si účet Ügyfélkapu+" },
        detail: {
          en: "Needed for every electronic filing with the Hungarian state.",
          sk: "Potrebný na každé elektronické podanie voči maďarskému štátu.",
        },
        portal: PORTAL.ugyfelkapu,
      },
      {
        id: "register",
        title: { en: "Register as a sole trader", sk: "Zaregistrujte sa ako živnostník" },
        detail: {
          en: "Online and free via NAV; you choose your taxation at registration.",
          sk: "Online a zadarmo cez NAV; spôsob zdanenia zvolíte pri registrácii.",
        },
        deadline: BEFORE_TRADING,
        portal: PORTAL.nav,
      },
      {
        id: "tax-choice",
        title: { en: "Choose átalányadó or KATA", sk: "Zvoľte átalányadó alebo KATA" },
        detail: {
          en: "KATA is only for traders selling to private individuals; most IT freelancers choose átalányadó.",
          sk: "KATA je len pre predaj súkromným osobám; väčšina IT freelancerov volí átalányadó.",
        },
      },
      {
        id: "chamber",
        title: { en: "Register with the chamber of commerce", sk: "Zaregistrujte sa v obchodnej komore" },
        detail: {
          en: "Mandatory for every business; the annual fee is HUF 5,000.",
          sk: "Povinné pre každého podnikateľa; ročný poplatok je 5 000 HUF.",
        },
      },
      {
        id: "local-tax",
        title: { en: "Register for local business tax (HIPA)", sk: "Prihláste sa k miestnej dani z podnikania (HIPA)" },
        detail: {
          en: "Report to the municipality where your business is registered.",
          sk: "Prihlásite sa na obci, kde je podnikanie registrované.",
        },
      },
      {
        id: "tax-return",
        title: { en: "File the annual SZJA return", sk: "Podajte ročné priznanie SZJA" },
        detail: {
          en: "The personal income tax return, filed online with NAV.",
          sk: "Priznanie k dani z príjmov fyzických osôb, podáva sa online na NAV.",
        },
        deadline: { en: "By 20 May of the following year", sk: "Do 20. mája nasledujúceho roka" },
        portal: PORTAL.nav,
      },
    ],
  },
  UA: {
    company: [
      {
        id: "register",
        title: { en: "Register the TOV via Diia", sk: "Zaregistrujte TOV cez Diia" },
        detail: {
          en: "Online registration with a model charter needs a qualified e-signature; a state registrar or notary is the offline route.",
          sk: "Online registrácia so vzorovým štatútom vyžaduje kvalifikovaný e-podpis; offline cesta vedie cez štátneho registrátora alebo notára.",
        },
        portal: PORTAL.diia,
      },
      {
        id: "beneficial-owner",
        title: { en: "Submit beneficial ownership information", sk: "Uveďte informácie o konečných vlastníkoch" },
        detail: {
          en: "Part of the registration package; update it whenever the structure changes.",
          sk: "Súčasť registračného balíka; aktualizuje sa pri každej zmene štruktúry.",
        },
      },
      {
        id: "tax-system",
        title: { en: "Choose the tax system", sk: "Zvoľte daňový systém" },
        detail: {
          en: "The general system (18 % CIT) or, where eligible, the single tax group 3.",
          sk: "Všeobecný systém (18 % daň PO) alebo, ak spĺňate podmienky, jednotná daň 3. skupiny.",
        },
        portal: PORTAL.taxCabinet,
      },
      {
        id: "bank",
        title: { en: "Open a bank account", sk: "Otvorte bankový účet" },
        detail: {
          en: "The bank reports the new account to the tax service itself.",
          sk: "Banka nahlási nový účet daňovej službe sama.",
        },
      },
      {
        id: "vat",
        title: { en: "Register for VAT if required", sk: "Registrujte sa k DPH, ak treba" },
        detail: {
          en: "Mandatory once taxable supplies exceed UAH 1 million over 12 months.",
          sk: "Povinné, keď zdaniteľné plnenia za 12 mesiacov presiahnu 1 milión UAH.",
        },
        portal: PORTAL.taxCabinet,
      },
    ],
    sole: [
      {
        id: "register",
        title: { en: "Register as a FOP in Diia", sk: "Zaregistrujte sa ako FOP v Diia" },
        detail: {
          en: "Takes minutes online; you can apply for the single tax in the same step.",
          sk: "Online za pár minút; o jednotnú daň môžete požiadať v tom istom kroku.",
        },
        deadline: BEFORE_TRADING,
        portal: PORTAL.diia,
      },
      {
        id: "single-tax",
        title: { en: "Apply for single tax group 3", sk: "Požiadajte o jednotnú daň 3. skupiny" },
        detail: {
          en: "Filed with registration it applies from day one; filed later it applies from the next quarter.",
          sk: "Pri registrácii platí od prvého dňa; podaná neskôr platí od nasledujúceho štvrťroka.",
        },
        portal: PORTAL.taxCabinet,
      },
      {
        id: "account",
        title: { en: "Open a FOP bank account", sk: "Otvorte si podnikateľský účet FOP" },
        detail: {
          en: "Business income should arrive on the FOP account, not a personal one.",
          sk: "Príjmy z podnikania by mali chodiť na účet FOP, nie na súkromný.",
        },
      },
      {
        id: "esv",
        title: { en: "Pay ESV every quarter", sk: "Plaťte ESV každý štvrťrok" },
        detail: {
          en: "UAH 1,902.34 a month in 2026, due even without income.",
          sk: "1 902,34 UAH mesačne v roku 2026, splatné aj bez príjmu.",
        },
        deadline: {
          en: "By the 20th of the month after each quarter",
          sk: "Do 20. dňa mesiaca po skončení štvrťroka",
        },
        portal: PORTAL.taxCabinet,
      },
      {
        id: "declaration",
        title: { en: "File the quarterly single-tax declaration", sk: "Podajte štvrťročné priznanie k jednotnej dani" },
        detail: {
          en: "Filed through the taxpayer's electronic cabinet.",
          sk: "Podáva sa cez elektronický kabinet daňovníka.",
        },
        deadline: { en: "Within 40 days after each quarter", sk: "Do 40 dní po skončení štvrťroka" },
        portal: PORTAL.taxCabinet,
      },
    ],
  },
};

/** Share of this checklist's steps that are ticked, as a whole percentage. */
export function checklistProgress(steps: ChecklistStep[], done: readonly string[]): number {
  if (steps.length === 0) return 0;
  const ticked = new Set(done);
  const count = steps.filter((step) => ticked.has(step.id)).length;
  return Math.round((count / steps.length) * 100);
}

/** What `localStorage` holds for one checklist — anything unexpected reads as nothing ticked. */
export function parseStoredIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
