/**
 * documents.ts — a generated document, rendered from its template and the record it is
 * linked to. Demo-grade clauses in both languages, filled with the deal's, listing's or
 * lease's real numbers; every rendering carries the "not legal advice" line. Pure.
 */
import type { WorkspaceCopy } from "./copy";
import { formatDate, formatMoney } from "./format";
import { commissionAmount } from "./metrics";
import { fullName, type Contact, type Deal, type DocumentItem, type Lease, type Property, type Workspace, type WorkspaceLocale } from "./model";

export interface RenderedDocument {
  title: string;
  subtitle: string;
  parties: { role: string; name: string; detail: string }[];
  clauses: { heading: string; body: string }[];
  signatures: string[];
}

interface Ctx {
  ws: Workspace;
  locale: WorkspaceLocale;
  c: WorkspaceCopy;
  property: Property | undefined;
  deal: Deal | undefined;
  lease: Lease | undefined;
  contact: Contact | undefined;
  buyer: Contact | undefined;
  seller: Contact | undefined;
}

const name = (x: Contact | undefined) => (x ? fullName(x) : "—");
const detail = (x: Contact | undefined) => (x ? [x.email, x.phone, x.city].filter(Boolean).join(" · ") : "");

function propertyLine(ctx: Ctx): string {
  const p = ctx.property;
  if (!p) return "—";
  const place = [p.street, p.district, p.city].filter(Boolean).join(", ");
  const cadastre = p.cadastre ? ` (${p.cadastre.titleDeed}, ${ctx.locale === "sk" ? "parc. č." : "parcel"} ${p.cadastre.parcel}, ${ctx.locale === "sk" ? "k. ú." : "cadastral area"} ${p.cadastre.municipality})` : "";
  return `${p.title}, ${place}, ${p.area} m²${cadastre}`;
}

export function renderDocument(ws: Workspace, doc: DocumentItem, locale: WorkspaceLocale, c: WorkspaceCopy): RenderedDocument {
  const find = <T extends { id: string }>(items: T[], id: string | null | undefined) => (id ? items.find((x) => x.id === id) : undefined);
  const deal = doc.link.kind === "deal" ? find(ws.deals, doc.link.id) : undefined;
  const lease = doc.link.kind === "lease" ? find(ws.leases, doc.link.id) : undefined;
  const property = doc.link.kind === "property" ? find(ws.properties, doc.link.id) : find(ws.properties, deal?.propertyId ?? lease?.propertyId);
  const contact = doc.link.kind === "contact" ? find(ws.contacts, doc.link.id) : undefined;
  const buyer = find(ws.contacts, deal?.buyerId ?? lease?.tenantId);
  const seller = find(ws.contacts, deal?.sellerId ?? lease?.landlordId ?? property?.ownerId);
  const ctx: Ctx = { ws, locale, c, property, deal, lease, contact, buyer, seller };
  const sk = locale === "sk";
  const agency = `${ws.settings.agencyName}, ${sk ? "IČO" : "Company ID"} ${ws.settings.ico}, ${ws.settings.address}`;
  const money = (n: number) => formatMoney(n, locale);
  const date = (iso: string | null | undefined) => (iso ? formatDate(iso, locale) : "—");
  const price = deal?.agreedPrice ?? lease?.rent ?? property?.price ?? 0;
  const commission = deal ? commissionAmount(deal.commission, deal.agreedPrice) : property ? commissionAmount(property.commission, property.price) : 0;
  const agencyParty = { role: c.documents.agencyLabel, name: ws.settings.agencyName, detail: agency };
  const sign = (...names: string[]) => [...names, ws.settings.agencyName];

  const title = c.template[doc.templateId];
  switch (doc.templateId) {
    case "brokerageExclusive":
    case "brokerageNonExclusive": {
      const exclusive = doc.templateId === "brokerageExclusive";
      const until = property?.exclusivity.until;
      return {
        title, subtitle: propertyLine(ctx),
        parties: [{ role: c.contactRole.owner, name: name(seller), detail: detail(seller) }, agencyParty],
        clauses: [
          { heading: sk ? "Predmet zmluvy" : "Subject", body: sk ? `Kancelária sa zaväzuje vyvíjať činnosť smerujúcu k tomu, aby mal vlastník príležitosť uzavrieť zmluvu o prevode nehnuteľnosti: ${propertyLine(ctx)}. Ponúkaná cena: ${money(price)}.` : `The agency undertakes to procure an opportunity for the owner to conclude a transfer of the property: ${propertyLine(ctx)}. Asking price: ${money(price)}.` },
          { heading: sk ? "Výhradnosť" : "Exclusivity", body: exclusive ? (sk ? `Vlastník poveruje sprostredkovaním výlučne kanceláriu, a to do ${date(until)}. Počas tejto doby nebude nehnuteľnosť ponúkať sám ani cez tretie osoby.` : `The owner appoints the agency exclusively until ${date(until)} and will not market the property alone or through third parties during that period.`) : (sk ? "Vlastník môže nehnuteľnosť ponúkať aj sám alebo prostredníctvom iných sprostredkovateľov. Provízia patrí kancelárii len vtedy, ak záujemcu privedie ona." : "The owner may market the property alone or through other agents. The commission is due only when the buyer was introduced by the agency.") },
          { heading: sk ? "Provízia" : "Commission", body: sk ? `Provízia je ${property?.commission.basis === "percent" ? `${property.commission.value} % z kúpnej ceny` : money(commission)} (${money(commission)} pri ponúkanej cene) a je splatná pri podpise kúpnej zmluvy. V provízii je zahrnutá inzercia, obhliadky, príprava zmlúv advokátom a návrh na vklad.` : `The commission is ${property?.commission.basis === "percent" ? `${property.commission.value} % of the purchase price` : money(commission)} (${money(commission)} at the asking price), due on signing the purchase contract, and covers advertising, viewings, contract drafting by a lawyer and the cadastre filing.` },
          { heading: sk ? "Povinnosti vlastníka" : "Owner's duties", body: sk ? "Vlastník predloží list vlastníctva, energetický certifikát a doklady o ťarchách, umožní obhliadky a oznámi kancelárii každú ponuku prijatú mimo nej." : "The owner provides the title deed, the energy certificate and documents on encumbrances, enables viewings and informs the agency of any offer received outside it." },
          { heading: sk ? "Ochrana osobných údajov a AML" : "Data protection and AML", body: sk ? "Kancelária spracúva osobné údaje vlastníka na účel plnenia tejto zmluvy a vykoná jeho identifikáciu podľa zákona č. 297/2008 Z. z." : "The agency processes the owner's personal data to perform this agreement and identifies the owner under Act 297/2008 Coll." },
        ],
        signatures: sign(name(seller)),
      };
    }
    case "reservation":
      return {
        title, subtitle: propertyLine(ctx),
        parties: [{ role: c.deals.buyer, name: name(buyer), detail: detail(buyer) }, { role: c.deals.seller, name: name(seller), detail: detail(seller) }, agencyParty],
        clauses: [
          { heading: sk ? "Rezervácia" : "Reservation", body: sk ? `Kancelária rezervuje pre záujemcu nehnuteľnosť ${propertyLine(ctx)} do ${date(deal?.reservation?.until)} a nebude ju v tejto lehote ponúkať tretím osobám.` : `The agency reserves the property ${propertyLine(ctx)} for the buyer until ${date(deal?.reservation?.until)} and will not offer it to third parties in that period.` },
          { heading: sk ? "Kúpna cena a depozit" : "Price and deposit", body: sk ? `Dohodnutá kúpna cena je ${money(price)}. Záujemca skladá rezervačný depozit ${money(deal?.reservation?.deposit ?? 0)}, ktorý sa započíta do kúpnej ceny.` : `The agreed purchase price is ${money(price)}. The buyer pays a reservation deposit of ${money(deal?.reservation?.deposit ?? 0)}, credited against the purchase price.` },
          { heading: sk ? "Sankcia" : "Penalty", body: sk ? "Ak záujemca v rezervačnej lehote bez dôvodu na strane predávajúceho neuzavrie kúpnu zmluvu, depozit prepadá v prospech predávajúceho a kancelárie v pomere dohodnutom v tejto zmluve. Ak odstúpi predávajúci, vráti depozit v dvojnásobnej výške." : "If the buyer fails to sign the purchase contract within the period for reasons not attributable to the seller, the deposit is forfeited to the seller and the agency in the agreed proportion. If the seller withdraws, the deposit is returned twofold." },
          { heading: sk ? "Ďalší postup" : "Next steps", body: sk ? `Kúpnu zmluvu pripraví advokát; predpokladaný podpis do ${date(deal?.expectedClose)}. Obe strany boli identifikované podľa zákona č. 297/2008 Z. z.` : `A lawyer drafts the purchase contract; signing is expected by ${date(deal?.expectedClose)}. Both parties were identified under Act 297/2008 Coll.` },
        ],
        signatures: sign(name(buyer), name(seller)),
      };
    case "purchase":
      return {
        title, subtitle: propertyLine(ctx),
        parties: [{ role: c.deals.seller, name: name(seller), detail: detail(seller) }, { role: c.deals.buyer, name: name(buyer), detail: detail(buyer) }],
        clauses: [
          { heading: sk ? "Predmet prevodu" : "Subject of transfer", body: sk ? `Predávajúci prevádza na kupujúceho vlastnícke právo k nehnuteľnosti ${propertyLine(ctx)} so všetkými súčasťami a príslušenstvom.` : `The seller transfers to the buyer the ownership of ${propertyLine(ctx)} with all fixtures and appurtenances.` },
          { heading: sk ? "Kúpna cena" : "Purchase price", body: sk ? `Kúpna cena je ${money(price)}. Depozit ${money(deal?.reservation?.deposit ?? 0)} je započítaný; zvyšok sa uhradí ${deal?.financing ? `z hypotekárneho úveru (${deal.financing.bank}) po zápise záložného práva` : "z vlastných zdrojov do notárskej úschovy"} a uvoľní sa po povolení vkladu.` : `The purchase price is ${money(price)}. The deposit of ${money(deal?.reservation?.deposit ?? 0)} is credited; the balance is paid ${deal?.financing ? `from a mortgage loan (${deal.financing.bank}) after the lien is registered` : "from own funds into notarial escrow"} and released once the cadastre registers the transfer.` },
          { heading: sk ? "Vyhlásenia" : "Representations", body: sk ? "Predávajúci vyhlasuje, že na nehnuteľnosti neviaznu ťarchy okrem tých uvedených na liste vlastníctva, a odovzdá platný energetický certifikát." : "The seller represents that the property carries no encumbrances beyond those on the title deed and will hand over a valid energy certificate." },
          { heading: sk ? "Vklad a odovzdanie" : "Registration and handover", body: sk ? `Návrh na vklad podá kancelária. Nehnuteľnosť sa odovzdá protokolom so stavmi meračov do 5 dní od úhrady kúpnej ceny; predpokladané uzavretie ${date(deal?.expectedClose)}.` : `The agency files the cadastre application. The property is handed over with a protocol and meter readings within 5 days of payment; closing expected ${date(deal?.expectedClose)}.` },
        ],
        signatures: sign(name(seller), name(buyer)),
      };
    case "lease": {
      const rent = lease?.rent ?? price;
      const deposit = lease?.deposit ?? deal?.reservation?.deposit ?? rent;
      return {
        title, subtitle: propertyLine(ctx),
        parties: [{ role: c.deals.landlord, name: name(seller), detail: detail(seller) }, { role: c.deals.tenant, name: name(buyer), detail: detail(buyer) }],
        clauses: [
          { heading: sk ? "Predmet nájmu" : "Premises", body: sk ? `Prenajímateľ prenecháva nájomcovi do užívania ${propertyLine(ctx)} na účel bývania.` : `The landlord lets ${propertyLine(ctx)} to the tenant for residential use.` },
          { heading: sk ? "Doba nájmu" : "Term", body: sk ? `Nájom sa dojednáva od ${date(lease?.start)} do ${date(lease?.end)} s výpovednou lehotou ${lease?.noticeMonths ?? 3} mesiace.` : `The lease runs from ${date(lease?.start)} to ${date(lease?.end)} with a notice period of ${lease?.noticeMonths ?? 3} months.` },
          { heading: sk ? "Nájomné a kaucia" : "Rent and deposit", body: sk ? `Mesačné nájomné je ${money(rent)}, splatné do 5. dňa mesiaca; energie ${lease?.utilitiesIncluded ? "sú zahrnuté" : "sa účtujú osobitne podľa skutočnej spotreby"}. Kaucia ${money(deposit)} sa vráti do 30 dní po skončení nájmu po započítaní nedoplatkov a škôd.` : `Monthly rent is ${money(rent)}, due by the 5th; utilities ${lease?.utilitiesIncluded ? "are included" : "are billed separately by actual consumption"}. The deposit of ${money(deposit)} is returned within 30 days of the end of the lease, net of arrears and damage.` },
          { heading: sk ? "Odovzdanie" : "Handover", body: sk ? "Byt sa odovzdáva a preberá protokolom so stavmi meračov a počtom kľúčov; prenajímateľ odovzdá kópiu energetického certifikátu." : "The premises are handed over and returned with a protocol recording meter readings and keys; the landlord provides a copy of the energy certificate." },
        ],
        signatures: sign(name(seller), name(buyer)),
      };
    }
    case "handover": {
      const protocol = lease?.protocols[lease.protocols.length - 1];
      const meters = protocol ? `${sk ? "elektrina" : "electricity"} ${protocol.meters.electricity} kWh, ${sk ? "plyn" : "gas"} ${protocol.meters.gas} m³, ${sk ? "voda" : "water"} ${protocol.meters.water} m³` : sk ? "stavy meračov sa doplnia pri odovzdaní" : "meter readings to be recorded at handover";
      return {
        title, subtitle: propertyLine(ctx),
        parties: [{ role: sk ? "Odovzdávajúci" : "Handing over", name: name(seller), detail: detail(seller) }, { role: sk ? "Preberajúci" : "Taking over", name: name(buyer), detail: detail(buyer) }],
        clauses: [
          { heading: sk ? "Stavy meračov" : "Meter readings", body: `${protocol ? `${date(protocol.date)}: ` : ""}${meters}.` },
          { heading: sk ? "Kľúče" : "Keys", body: sk ? `Odovzdané kľúče: ${protocol?.keys ?? "—"} ks.` : `Keys handed over: ${protocol?.keys ?? "—"}.` },
          { heading: sk ? "Stav nehnuteľnosti" : "Condition", body: protocol?.condition || (sk ? "Bez zjavných závad." : "No visible defects.") },
          { heading: sk ? "Vyhlásenie" : "Declaration", body: sk ? "Strany potvrdzujú správnosť uvedených údajov a prevzatie nehnuteľnosti v uvedenom stave." : "The parties confirm the figures above and the takeover of the property in the stated condition." },
        ],
        signatures: [name(seller), name(buyer)],
      };
    }
    case "cadastreFiling":
      return {
        title, subtitle: propertyLine(ctx),
        parties: [{ role: sk ? "Navrhovateľ (predávajúci)" : "Applicant (seller)", name: name(seller), detail: detail(seller) }, { role: sk ? "Navrhovateľ (kupujúci)" : "Applicant (buyer)", name: name(buyer), detail: detail(buyer) }],
        clauses: [
          { heading: sk ? "Adresát" : "Addressee", body: sk ? `Okresný úrad, katastrálny odbor — ${property?.cadastre?.municipality ?? property?.city ?? "—"}.` : `District Office, Cadastre Department — ${property?.cadastre?.municipality ?? property?.city ?? "—"}.` },
          { heading: sk ? "Návrh" : "Application", body: sk ? `Navrhovatelia žiadajú o povolenie vkladu vlastníckeho práva k nehnuteľnosti ${propertyLine(ctx)} v prospech kupujúceho na základe kúpnej zmluvy zo dňa ${date(deal?.stageHistory.find((s) => s.stage === "contracts")?.at)}.` : `The applicants request registration of the buyer's ownership of ${propertyLine(ctx)} under the purchase contract dated ${date(deal?.stageHistory.find((s) => s.stage === "contracts")?.at)}.` },
          { heading: sk ? "Prílohy" : "Attachments", body: sk ? "Kúpna zmluva (2×, osvedčené podpisy predávajúceho), potvrdenie o úhrade správneho poplatku, prípadne záložná zmluva banky." : "Purchase contract (2 copies, seller's signatures notarised), proof of the administrative fee, bank lien agreement where applicable." },
        ],
        signatures: [name(seller), name(buyer)],
      };
    case "gdprConsent": {
      const who = contact ?? buyer;
      return {
        title, subtitle: name(who),
        parties: [{ role: sk ? "Dotknutá osoba" : "Data subject", name: name(who), detail: detail(who) }, agencyParty],
        clauses: [
          { heading: sk ? "Účel" : "Purpose", body: sk ? "Evidencia klienta, párovanie dopytu s ponukami, komunikácia o nehnuteľnostiach a plnenie zákonných povinností kancelárie." : "Keeping the client record, matching demand with listings, communication about properties and the agency's statutory duties." },
          { heading: sk ? "Doba uchovávania" : "Retention", body: sk ? `${ws.settings.consentMonths} mesiacov od udelenia súhlasu, resp. po dobu trvania zmluvného vzťahu a zákonných lehôt.` : `${ws.settings.consentMonths} months from consent, or for the duration of the contractual relationship and statutory periods.` },
          { heading: sk ? "Práva" : "Rights", body: sk ? "Prístup k údajom, oprava, výmaz, obmedzenie spracúvania, prenosnosť a odvolanie súhlasu kedykoľvek; sťažnosť na Úrad na ochranu osobných údajov SR." : "Access, rectification, erasure, restriction, portability and withdrawal of consent at any time; complaint to the Slovak Data Protection Office." },
          { heading: sk ? "Marketing" : "Marketing", body: who?.consent.marketing ? (sk ? "Dotknutá osoba súhlasí so zasielaním ponúk e-mailom." : "The data subject agrees to receive offers by e-mail.") : (sk ? "Bez súhlasu so zasielaním marketingových ponúk." : "No consent to marketing offers.") },
        ],
        signatures: [name(who)],
      };
    }
    case "amlForm": {
      const who = contact ?? buyer;
      return {
        title, subtitle: name(who),
        parties: [{ role: sk ? "Klient" : "Client", name: name(who), detail: detail(who) }, agencyParty],
        clauses: [
          { heading: sk ? "Identifikácia" : "Identification", body: sk ? `Spôsob: ${who?.aml.method ? c.amlMethod[who.aml.method] : "—"}. Doklad: ${who?.aml.document ? c.idDocument[who.aml.document] : "—"}. Dátum: ${date(who?.aml.identifiedAt)}.` : `Method: ${who?.aml.method ? c.amlMethod[who.aml.method] : "—"}. Document: ${who?.aml.document ? c.idDocument[who.aml.document] : "—"}. Date: ${date(who?.aml.identifiedAt)}.` },
          { heading: sk ? "Politicky exponovaná osoba" : "Politically exposed person", body: who?.aml.pep ? (sk ? "Áno — uplatní sa zvýšená starostlivosť." : "Yes — enhanced due diligence applies.") : (sk ? "Nie." : "No.") },
          { heading: sk ? "Účel a povaha obchodu" : "Purpose and nature of the transaction", body: sk ? `${who?.roles.map((r) => c.contactRole[r]).join(", ") || "—"}; zdroj prostriedkov podľa vyhlásenia klienta.` : `${who?.roles.map((r) => c.contactRole[r]).join(", ") || "—"}; source of funds per the client's declaration.` },
          { heading: sk ? "Právny základ" : "Legal basis", body: sk ? "Zákon č. 297/2008 Z. z. o ochrane pred legalizáciou príjmov z trestnej činnosti, § 10 základná starostlivosť." : "Act 297/2008 Coll. on protection against money laundering, § 10 basic due diligence." },
        ],
        signatures: [name(who), ws.settings.agencyName],
      };
    }
    case "powerOfAttorney":
      return {
        title, subtitle: propertyLine(ctx),
        parties: [{ role: sk ? "Splnomocniteľ" : "Principal", name: name(seller), detail: detail(seller) }, { role: sk ? "Splnomocnenec" : "Attorney", name: ws.settings.agencyName, detail: agency }],
        clauses: [
          { heading: sk ? "Rozsah" : "Scope", body: sk ? `Splnomocnenec je oprávnený prijať rezervačný depozit, zastupovať splnomocniteľa pri rokovaniach o predaji nehnuteľnosti ${propertyLine(ctx)} a vyžiadať výpis z listu vlastníctva.` : `The attorney may receive the reservation deposit, represent the principal in negotiations on the sale of ${propertyLine(ctx)} and obtain title deed extracts.` },
          { heading: sk ? "Trvanie" : "Duration", body: sk ? `Do ${date(property?.exclusivity.until)} alebo do odvolania.` : `Until ${date(property?.exclusivity.until)} or until revoked.` },
        ],
        signatures: [name(seller)],
      };
  }
}
