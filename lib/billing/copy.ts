import type { AgendaId, IncomingIssue, PostmanKind, ReadinessId, VatStatus } from "./compliance";

/** The accountant panel's copy. English is the fallback for any locale without its own block. */
export interface ComplianceCopy {
  title: string;
  intro: string;
  phase: { hybrid: (days: number) => string; mandatory: string; hybridNote: string; mandatoryNote: string };
  readinessTitle: string;
  readinessCount: (done: number, total: number) => string;
  readiness: Record<ReadinessId, { label: string; hint: string }>;
  companyTitle: string;
  vatLabel: string;
  vat: Record<VatStatus, { label: string; note: string }>;
  postmanName: string;
  postmanNamePlaceholder: string;
  postmanKind: string;
  postmanKinds: Record<PostmanKind, string>;
  accountantName: string;
  accountantEmail: string;
  accountantSoftware: string;
  incomingTitle: string;
  incomingIntro: string;
  supplierVatPayer: string;
  yes: string;
  no: string;
  issueDate: string;
  billedTo: string;
  billedToCompany: string;
  billedToPerson: string;
  channel: { peppol: string; asBefore: string };
  issues: Record<IncomingIssue, string>;
  allGood: string;
  agendaTitle: string;
  agendaIntro: string;
  agenda: Record<AgendaId, string>;
  sendAgenda: string;
  agendaSubject: string;
  noEmail: string;
  exportTitle: string;
  exportIntro: (software: string) => string;
  exportCsv: string;
  exportEmpty: string;
  disclaimer: string;
}

const en: ComplianceCopy = {
  title: "Accountant & e-invoicing 2027",
  intro: "Everything your accountant asked for, in one place — and what changes when Slovak e-invoicing becomes mandatory.",
  phase: {
    hybrid: (days) => `Hybrid mode — ${days} days until mandatory e-invoicing`,
    mandatory: "E-invoicing is mandatory",
    hybridNote: "Until 31 December 2026 invoices still travel the old way (PDF, e-mail). Build automation for what comes next, not for what is ending.",
    mandatoryNote: "Invoices from VAT payers now reach you only through your digital postman (Peppol access point).",
  },
  readinessTitle: "Ready for 1 January 2027",
  readinessCount: (done, total) => `${done} of ${total} done`,
  readiness: {
    poa: { label: "Power of attorney for the Financial Administration signed", hint: "A signed PDF sent back by e-mail is enough — no notarised signature needed." },
    companyBilling: { label: "Every supplier bills the company, not you", hint: "Supplier invoices addressed to you as a person cannot be booked by the company." },
    postmanChosen: { label: "Digital postman chosen", hint: "From 2027 invoices from VAT payers arrive only through the access point you pick." },
    postmanAutomation: { label: "Postman supports automation (XML or API)", hint: "Some postmen are only mailboxes with a viewer; automation needs XML files or an API." },
    accountantFormat: { label: "Handoff format agreed with the accountant", hint: "Agree how invoices reach their software (XML import or API) and what a customisation costs." },
    meeting: { label: "Onboarding meeting with the accountant held", hint: "Set up the tax regime together: activities, volumes and jurisdictions." },
  },
  companyTitle: "Company setup",
  vatLabel: "VAT status",
  vat: {
    nonPayer: { label: "Not a VAT payer", note: "Your accountant invoices you from their non-VAT company; your own invoices to Slovak businesses go out as before." },
    payer: { label: "VAT payer", note: "Your accountant switches you to their VAT company; from 2027 your invoices to Slovak businesses leave through your digital postman." },
  },
  postmanName: "Digital postman (provider)",
  postmanNamePlaceholder: "Name of the certified provider",
  postmanKind: "What it can do",
  postmanKinds: { none: "Not chosen yet", mailbox: "Mailbox + viewer only", xml: "XML files", api: "API" },
  accountantName: "Accountant / office",
  accountantEmail: "Accountant's e-mail",
  accountantSoftware: "Accounting software",
  incomingTitle: "Supplier invoice check",
  incomingIntro: "Before you forward a supplier invoice, check how it has to arrive and whether it can be booked.",
  supplierVatPayer: "Supplier is a VAT payer",
  yes: "Yes",
  no: "No",
  issueDate: "Issue date",
  billedTo: "Billed to",
  billedToCompany: "The company",
  billedToPerson: "Me, personally",
  channel: { peppol: "Must arrive through your digital postman (Peppol)", asBefore: "Arrives as before (PDF / e-mail)" },
  issues: {
    badDate: "Enter the invoice's issue date.",
    billedToPerson: "Ask the supplier to reissue it to the company — invoices billed to you personally are not company costs.",
    noPostman: "No digital postman chosen yet — this invoice would have nowhere to arrive.",
    manualPostman: "Your postman is a mailbox only — this invoice will need manual handling.",
  },
  allGood: "Ready to book.",
  agendaTitle: "Agenda for the accountant meeting",
  agendaIntro: "Tick what you have prepared, then send the list to your accountant.",
  agenda: {
    activities: "What the company will do (products, services, customers)",
    volumes: "Expected volumes — invoices per month, revenue",
    jurisdictions: "Jurisdictions — countries of customers and suppliers",
    taxRegime: "Setting up the tax regime in practice",
    vatRegistration: "When VAT registration applies (EU sales, foreign services such as Stripe or cloud)",
    requisites: "Invoice requisites and what to watch for",
    postman: "Which digital postman fits our automation (XML / API)",
  },
  sendAgenda: "E-mail the agenda",
  agendaSubject: "Agenda for our onboarding meeting",
  noEmail: "Add your accountant's e-mail above to send the agenda.",
  exportTitle: "Handoff to the accountant",
  exportIntro: (software) => `CSV of your invoices for ${software || "your accounting software"}. The final import format (XML or API) is what you agree with your accountant.`,
  exportCsv: "Download CSV",
  exportEmpty: "No invoices to export yet.",
  disclaimer: "Guidance, not tax advice — confirm your setup with your accountant.",
};

const sk: ComplianceCopy = {
  title: "Účtovník a eFaktúra 2027",
  intro: "Všetko, čo od vás účtovník potrebuje, na jednom mieste — a čo sa zmení, keď bude elektronická fakturácia povinná.",
  phase: {
    hybrid: (days) => `Hybridný režim — ${days} dní do povinnej eFaktúry`,
    mandatory: "eFaktúra je povinná",
    hybridNote: "Do 31. 12. 2026 faktúry chodia po starom (PDF, e-mail). Automatizáciu stavajte na to, čo príde, nie na to, čo končí.",
    mandatoryNote: "Faktúry od platiteľov DPH vám už prichádzajú len cez vášho digitálneho poštára (prístupový bod Peppol).",
  },
  readinessTitle: "Pripravenosť na 1. 1. 2027",
  readinessCount: (done, total) => `${done} z ${total} hotovo`,
  readiness: {
    poa: { label: "Splnomocnenie na komunikáciu s Finančnou správou podpísané", hint: "Stačí podpísané PDF späť mailom — podpis nemusí byť úradne overený." },
    companyBilling: { label: "Všetci dodávatelia fakturujú na firmu, nie na vás", hint: "Faktúru vystavenú na vás ako osobu si firma nemôže zaúčtovať." },
    postmanChosen: { label: "Digitálny poštár vybraný", hint: "Od 2027 faktúry od platiteľov DPH prídu len cez prístupový bod, ktorý si zvolíte." },
    postmanAutomation: { label: "Poštár podporuje automatizáciu (XML alebo API)", hint: "Niektorí poštári sú len e-mailové schránky s vizualizáciou; automatizácia potrebuje XML alebo API." },
    accountantFormat: { label: "Formát odovzdávania dohodnutý s účtovníkom", hint: "Dohodnite, ako sa faktúry dostanú do jeho softvéru (XML import alebo API) a koľko stojí úprava." },
    meeting: { label: "Úvodné stretnutie s účtovníkom", hint: "Spolu nastavíte daňový režim: čo budete robiť, v akom množstve a v akých krajinách." },
  },
  companyTitle: "Nastavenie firmy",
  vatLabel: "DPH",
  vat: {
    nonPayer: { label: "Neplatiteľ DPH", note: "Účtovník vám fakturuje z bez-DPH firmy; vaše faktúry slovenským firmám idú ako doteraz." },
    payer: { label: "Platiteľ DPH", note: "Účtovník vás prehodí na DPH firmu; od 2027 vaše faktúry slovenským firmám odchádzajú cez digitálneho poštára." },
  },
  postmanName: "Digitálny poštár (poskytovateľ)",
  postmanNamePlaceholder: "Názov certifikovaného poskytovateľa",
  postmanKind: "Čo vie",
  postmanKinds: { none: "Zatiaľ nevybraný", mailbox: "Len schránka + vizualizácia", xml: "XML súbory", api: "API" },
  accountantName: "Účtovník / kancelária",
  accountantEmail: "E-mail účtovníka",
  accountantSoftware: "Účtovný softvér",
  incomingTitle: "Kontrola dodávateľskej faktúry",
  incomingIntro: "Skôr než faktúru pošlete účtovníkovi, overte, ako musí prísť a či sa dá zaúčtovať.",
  supplierVatPayer: "Dodávateľ je platiteľ DPH",
  yes: "Áno",
  no: "Nie",
  issueDate: "Dátum vystavenia",
  billedTo: "Vystavená na",
  billedToCompany: "Firmu",
  billedToPerson: "Mňa osobne",
  channel: { peppol: "Musí prísť cez vášho digitálneho poštára (Peppol)", asBefore: "Príde ako doteraz (PDF / e-mail)" },
  issues: {
    badDate: "Zadajte dátum vystavenia faktúry.",
    billedToPerson: "Požiadajte dodávateľa o vystavenie na firmu — faktúra na vás osobne nie je náklad firmy.",
    noPostman: "Digitálny poštár ešte nie je vybraný — táto faktúra by nemala kam prísť.",
    manualPostman: "Váš poštár je len schránka — túto faktúru budete spracovávať ručne.",
  },
  allGood: "Pripravená na zaúčtovanie.",
  agendaTitle: "Agenda stretnutia s účtovníkom",
  agendaIntro: "Odškrtnite, čo máte pripravené, a pošlite zoznam účtovníkovi.",
  agenda: {
    activities: "Čo bude firma robiť (produkty, služby, zákazníci)",
    volumes: "Očakávané množstvá — faktúry mesačne, obrat",
    jurisdictions: "Jurisdikcie — krajiny zákazníkov a dodávateľov",
    taxRegime: "Praktické nastavenie daňového režimu",
    vatRegistration: "Kedy vzniká registrácia k DPH (predaj do EÚ, zahraničné služby ako Stripe či cloud)",
    requisites: "Náležitosti faktúry a na čo si dať pozor",
    postman: "Ktorý digitálny poštár sa hodí na našu automatizáciu (XML / API)",
  },
  sendAgenda: "Poslať agendu e-mailom",
  agendaSubject: "Agenda nášho úvodného stretnutia",
  noEmail: "Doplňte vyššie e-mail účtovníka, aby ste mohli agendu poslať.",
  exportTitle: "Odovzdanie účtovníkovi",
  exportIntro: (software) => `CSV vašich faktúr pre ${software || "účtovný softvér"}. Konečný formát importu (XML alebo API) dohodnete s účtovníkom.`,
  exportCsv: "Stiahnuť CSV",
  exportEmpty: "Zatiaľ nie sú faktúry na export.",
  disclaimer: "Orientačná pomôcka, nie daňové poradenstvo — nastavenie si potvrďte s účtovníkom.",
};

const es: ComplianceCopy = {
  title: "Contable y factura electrónica 2027",
  intro: "Todo lo que pide tu contable en un solo lugar — y lo que cambia cuando la factura electrónica eslovaca sea obligatoria.",
  phase: {
    hybrid: (days) => `Modo híbrido — ${days} días para la factura electrónica obligatoria`,
    mandatory: "La factura electrónica es obligatoria",
    hybridNote: "Hasta el 31 de diciembre de 2026 las facturas circulan como siempre (PDF, correo). Automatiza para lo que viene, no para lo que termina.",
    mandatoryNote: "Las facturas de sujetos pasivos de IVA solo te llegan a través de tu cartero digital (punto de acceso Peppol).",
  },
  readinessTitle: "Listo para el 1 de enero de 2027",
  readinessCount: (done, total) => `${done} de ${total} hechos`,
  readiness: {
    poa: { label: "Poder para la Administración Tributaria firmado", hint: "Basta con un PDF firmado enviado por correo — no hace falta firma notarial." },
    companyBilling: { label: "Todos los proveedores facturan a la empresa, no a ti", hint: "Una factura a tu nombre no es un gasto de la empresa." },
    postmanChosen: { label: "Cartero digital elegido", hint: "Desde 2027 las facturas de sujetos pasivos llegan solo por el punto de acceso que elijas." },
    postmanAutomation: { label: "El cartero permite automatizar (XML o API)", hint: "Algunos carteros son solo buzones con visor; automatizar requiere XML o API." },
    accountantFormat: { label: "Formato de entrega acordado con el contable", hint: "Acordad cómo llegan las facturas a su software (importación XML o API) y cuánto cuesta adaptarlo." },
    meeting: { label: "Reunión inicial con el contable", hint: "Configurad juntos el régimen fiscal: actividades, volúmenes y jurisdicciones." },
  },
  companyTitle: "Configuración de la empresa",
  vatLabel: "IVA",
  vat: {
    nonPayer: { label: "No sujeto pasivo de IVA", note: "Tu contable te factura desde su empresa sin IVA; tus facturas a empresas eslovacas salen como siempre." },
    payer: { label: "Sujeto pasivo de IVA", note: "Tu contable te pasa a su empresa con IVA; desde 2027 tus facturas a empresas eslovacas salen por tu cartero digital." },
  },
  postmanName: "Cartero digital (proveedor)",
  postmanNamePlaceholder: "Nombre del proveedor certificado",
  postmanKind: "Qué permite",
  postmanKinds: { none: "Aún no elegido", mailbox: "Solo buzón + visor", xml: "Archivos XML", api: "API" },
  accountantName: "Contable / despacho",
  accountantEmail: "Correo del contable",
  accountantSoftware: "Software contable",
  incomingTitle: "Comprobar factura de proveedor",
  incomingIntro: "Antes de reenviar una factura de proveedor, comprueba cómo debe llegar y si se puede contabilizar.",
  supplierVatPayer: "El proveedor es sujeto pasivo de IVA",
  yes: "Sí",
  no: "No",
  issueDate: "Fecha de emisión",
  billedTo: "Facturada a",
  billedToCompany: "La empresa",
  billedToPerson: "A mí personalmente",
  channel: { peppol: "Debe llegar por tu cartero digital (Peppol)", asBefore: "Llega como siempre (PDF / correo)" },
  issues: {
    badDate: "Introduce la fecha de emisión.",
    billedToPerson: "Pide al proveedor que la emita a la empresa — una factura a tu nombre no es gasto de la empresa.",
    noPostman: "Aún no hay cartero digital — esta factura no tendría dónde llegar.",
    manualPostman: "Tu cartero es solo un buzón — esta factura requerirá trabajo manual.",
  },
  allGood: "Lista para contabilizar.",
  agendaTitle: "Agenda de la reunión con el contable",
  agendaIntro: "Marca lo que tienes preparado y envía la lista a tu contable.",
  agenda: {
    activities: "Qué hará la empresa (productos, servicios, clientes)",
    volumes: "Volúmenes previstos — facturas al mes, ingresos",
    jurisdictions: "Jurisdicciones — países de clientes y proveedores",
    taxRegime: "Configuración práctica del régimen fiscal",
    vatRegistration: "Cuándo aplica el alta en IVA (ventas en la UE, servicios extranjeros como Stripe o la nube)",
    requisites: "Requisitos de la factura y en qué fijarse",
    postman: "Qué cartero digital encaja con nuestra automatización (XML / API)",
  },
  sendAgenda: "Enviar la agenda por correo",
  agendaSubject: "Agenda de nuestra reunión inicial",
  noEmail: "Añade arriba el correo de tu contable para enviar la agenda.",
  exportTitle: "Entrega al contable",
  exportIntro: (software) => `CSV de tus facturas para ${software || "tu software contable"}. El formato final (XML o API) es el que acuerdes con tu contable.`,
  exportCsv: "Descargar CSV",
  exportEmpty: "Aún no hay facturas para exportar.",
  disclaimer: "Orientación, no asesoramiento fiscal — confirma tu configuración con tu contable.",
};

const COPY: Record<string, ComplianceCopy> = { en, sk, es };

export function complianceCopy(locale: string): ComplianceCopy {
  return COPY[locale] ?? en;
}
