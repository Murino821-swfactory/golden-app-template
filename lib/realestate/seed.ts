/**
 * seed.ts — the demo desk a visitor opens: a fictional Bratislava agency with four people,
 * fourteen listings, twenty-one contacts, demand in every stage, viewings today, deals on
 * every station of the rail, three leases and the paperwork around them.
 *
 * Every date is relative to "now", so the overview always has a viewing today, a
 * reservation about to expire, a lease ending soon and a rent that is overdue. Names,
 * companies and addresses are invented; districts and towns are real.
 */
import {
  WORKSPACE_VERSION, addDays, addMonths, emptyDocuments, emptyPortals, freshChecklist, isoDate,
  type Activity, type Agent, type ChecklistKey, type Contact, type Deal, type DealStage, type Demand, type DocumentItem,
  type Lease, type Payment, type Portal, type Property, type PropertyDocKind, type SyndicationState, type Task,
  type Viewing, type Workspace, type WorkspaceLocale,
} from "./model";

type T = (en: string, sk: string) => string;

export function seedWorkspace(locale: WorkspaceLocale): Workspace {
  const now = new Date();
  const t: T = (en, sk) => (locale === "sk" ? sk : en);
  const day = (offset: number) => isoDate(addDays(now, offset));
  const at = (offset: number, time = "10:00") => {
    const d = addDays(now, offset);
    const [h, m] = time.split(":").map(Number);
    d.setHours(h ?? 10, m ?? 0, 0, 0);
    return d.toISOString();
  };
  const month = (offset: number) => {
    const d = addMonths(new Date(now.getFullYear(), now.getMonth(), 1, 12), offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const agents: Agent[] = [
    { id: "ag-kollarova", firstName: "Zuzana", lastName: "Kollárová", role: "owner", email: "zuzana@nabrezie.example", phone: "+421 900 100 001", split: 100, since: "2019-03-01" },
    { id: "ag-balaz", firstName: "Martin", lastName: "Baláž", role: "agent", email: "martin@nabrezie.example", phone: "+421 900 100 002", split: 60, since: "2021-06-01" },
    { id: "ag-hudecova", firstName: "Petra", lastName: "Hudecová", role: "agent", email: "petra@nabrezie.example", phone: "+421 900 100 003", split: 65, since: "2022-09-01" },
    { id: "ag-rybar", firstName: "Tomáš", lastName: "Rybár", role: "assistant", email: "tomas@nabrezie.example", phone: "+421 900 100 004", split: 0, since: "2025-02-01" },
  ];

  const consentGranted = (monthsAgo: number, marketing = true) => ({ status: "granted" as const, grantedAt: isoDate(addMonths(now, -monthsAgo)), expiresAt: isoDate(addMonths(now, 36 - monthsAgo)), marketing });
  const amlNone = { status: "none" as const, method: null, document: null, identifiedAt: null, pep: false };
  const amlIdentified = (daysAgo: number) => ({ status: "identified" as const, method: "inPerson" as const, document: "idCard" as const, identifiedAt: day(-daysAgo), pep: false });
  const amlVerified = (daysAgo: number) => ({ status: "verified" as const, method: "inPerson" as const, document: "idCard" as const, identifiedAt: day(-daysAgo), pep: false });

  const person = (id: string, firstName: string, lastName: string, extra: Partial<Contact>): Contact => ({
    id, kind: "person", firstName, lastName, company: "", email: `${firstName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${lastName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@example.com`,
    phone: "+421 9", roles: [], source: "referral", tags: [], agentId: "ag-balaz", consent: consentGranted(6), aml: amlNone, city: "Bratislava", notes: "", createdAt: at(-90), ...extra,
  });

  const contacts: Contact[] = [
    person("c-kovacova", "Helena", "Kováčová", { phone: "+421 905 111 201", roles: ["owner"], source: "referral", tags: [t("seller", "predávajúca")], aml: amlVerified(74), consent: consentGranted(3), createdAt: at(-76), notes: t("Selling after moving to her daughter in Trnava. Prefers calls after 17:00.", "Predáva po presťahovaní k dcére do Trnavy. Preferuje telefonát po 17:00.") }),
    person("c-novak", "Peter", "Novák", { phone: "+421 905 111 202", roles: ["owner"], source: "website", agentId: "ag-kollarova", aml: amlIdentified(100), consent: consentGranted(4), createdAt: at(-112), city: "Senec" }),
    person("c-sedlak", "Ján", "Sedlák", { phone: "+421 905 111 203", roles: ["owner"], source: "phone", tags: [t("plot", "pozemok")], consent: consentGranted(2), createdAt: at(-47), city: "Modra" }),
    { ...person("c-dvorska", "Mária", "Dvorská", { phone: "+421 905 111 204", roles: ["owner", "landlord"], source: "repeat", agentId: "ag-kollarova", aml: amlVerified(200), consent: consentGranted(8), createdAt: at(-400) }), kind: "company", company: "DVORSKÁ Development s.r.o.", email: "office@dvorska-dev.example" },
    person("c-horvathova", "Eva", "Horváthová", { phone: "+421 905 111 205", roles: ["owner"], source: "portal", agentId: "ag-hudecova", consent: consentGranted(1), createdAt: at(-22), city: "Košice" }),
    person("c-lukac", "Richard", "Lukáč", { phone: "+421 905 111 206", roles: ["owner"], source: "referral", agentId: "ag-hudecova", aml: amlIdentified(130), consent: consentGranted(5), createdAt: at(-142), city: "Trnava" }),
    person("c-maly", "Igor", "Malý", { phone: "+421 905 111 207", roles: ["owner"], source: "website", agentId: "ag-hudecova", aml: amlIdentified(25), consent: consentGranted(1), createdAt: at(-30) }),
    person("c-vavro", "Jozef", "Vavro", { phone: "+421 905 111 208", roles: ["owner"], source: "referral", aml: amlVerified(90), consent: consentGranted(4), createdAt: at(-97) }),
    person("c-zahorska", "Dana", "Záhorská", { phone: "+421 905 111 209", roles: ["owner"], source: "portal", agentId: "ag-hudecova", aml: amlVerified(120), consent: consentGranted(5), createdAt: at(-150) }),
    person("c-polak", "Andrej", "Polák", { phone: "+421 905 111 210", roles: ["landlord", "investor"], source: "repeat", tags: [t("2 flats", "2 byty")], aml: amlVerified(300), consent: consentGranted(12), createdAt: at(-420), notes: t("Owns two rental flats; wants quarterly statements.", "Vlastní dva byty na prenájom; chce štvrťročné vyúčtovanie.") }),
    person("c-benova", "Katarína", "Beňová", { phone: "+421 905 111 211", roles: ["landlord"], source: "referral", agentId: "ag-hudecova", aml: amlIdentified(60), consent: consentGranted(2), createdAt: at(-65) }),
    person("c-urban", "Lukáš", "Urban", { phone: "+421 905 111 212", roles: ["buyer"], source: "portal", agentId: "ag-hudecova", consent: consentGranted(0), createdAt: at(-12), notes: t("Mortgage pre-approved up to 230 000 €.", "Hypotéka predschválená do 230 000 €.") }),
    person("c-marekova", "Simona", "Mareková", { phone: "+421 905 111 213", roles: ["buyer"], source: "website", agentId: "ag-kollarova", consent: { status: "granted", grantedAt: isoDate(addMonths(now, -35)), expiresAt: day(20), marketing: true }, createdAt: at(-30), tags: [t("family", "rodina")] }),
    person("c-farkas", "Dávid", "Farkaš", { phone: "+421 905 111 214", roles: ["buyer"], source: "portal", aml: amlIdentified(18), consent: consentGranted(1), createdAt: at(-40) }),
    person("c-kralik", "Ondrej", "Králik", { phone: "+421 905 111 215", roles: ["buyer"], source: "referral", agentId: "ag-kollarova", aml: amlVerified(48), consent: consentGranted(3), createdAt: at(-80), city: "Senec" }),
    person("c-tothova", "Alena", "Tóthová", { phone: "+421 905 111 216", roles: ["investor", "buyer"], source: "repeat", agentId: "ag-hudecova", consent: consentGranted(10), createdAt: at(-300), tags: [t("investor", "investorka")] }),
    person("c-svec", "Michal", "Švec", { phone: "+421 905 111 217", roles: ["tenant"], source: "portal", aml: amlIdentified(190), consent: consentGranted(6), createdAt: at(-195) }),
    person("c-gajdosova", "Nina", "Gajdošová", { phone: "+421 905 111 218", roles: ["tenant"], source: "portal", agentId: "ag-kollarova", aml: amlIdentified(325), consent: consentGranted(11), createdAt: at(-330), city: "Nitra" }),
    person("c-bielik", "Filip", "Bielik", { phone: "+421 905 111 219", roles: ["tenant"], source: "portal", agentId: "ag-hudecova", consent: { status: "pending", grantedAt: null, expiresAt: null, marketing: false }, createdAt: at(-2, "08:30") }),
    person("c-zelenak", "Marek", "Zeleňák", { phone: "+421 905 111 220", roles: ["buyer"], source: "social", agentId: "ag-hudecova", consent: consentGranted(2), createdAt: at(-60) }),
    { ...person("c-oravec", "Branislav", "Oravec", { phone: "+421 905 111 221", roles: ["tenant"], source: "phone", agentId: "ag-kollarova", consent: consentGranted(0), createdAt: at(0, "07:40") }), kind: "company", company: "Oravec Logistics s.r.o.", email: "info@oravec-logistics.example" },
    person("c-hric", "Branislav", "Hric", { phone: "+421 905 111 222", roles: ["buyer"], source: "walkIn", consent: consentGranted(0), createdAt: at(-2) }),
    person("c-kucerova", "Lenka", "Kučerová", { phone: "+421 905 111 223", roles: ["buyer"], source: "portal", aml: amlVerified(40), consent: consentGranted(3), createdAt: at(-85) }),
    person("c-pavlik", "Roman", "Pavlík", { phone: "+421 905 111 224", roles: ["buyer"], source: "referral", agentId: "ag-hudecova", aml: amlVerified(80), consent: consentGranted(5), createdAt: at(-130) }),
    person("c-weiss", "Tomáš", "Weiss", { phone: "+421 905 111 225", roles: ["tenant"], source: "portal", agentId: "ag-hudecova", aml: amlIdentified(400), consent: consentGranted(14), createdAt: at(-410) }),
  ];

  const portals = (live: Portal[], queued: Portal[] = []): Record<Portal, SyndicationState> => {
    const out = emptyPortals();
    for (const p of live) out[p] = "live";
    for (const p of queued) out[p] = "queued";
    return out;
  };
  const docs = (missing: PropertyDocKind[] = []) => emptyDocuments().map((d) => ({ ...d, done: !missing.includes(d.kind) }));

  const property = (id: string, title: string, extra: Partial<Property> & Pick<Property, "transaction" | "type" | "status" | "price" | "area" | "rooms" | "ownerId" | "agentId" | "listedAt">): Property => ({
    id, title, priceHistory: [{ at: extra.listedAt, price: extra.price }], city: "Bratislava", district: "", street: "", region: t("Bratislava Region", "Bratislavský kraj"),
    landArea: null, floor: null, totalFloors: null, condition: "good", energyClass: "C", yearBuilt: null, features: [], description: "",
    exclusivity: { type: "nonExclusive", until: null }, commission: { basis: "percent", value: 3 }, portals: emptyPortals(), documents: docs(), photos: 10,
    stats: { views: 0, inquiries: 0 }, cadastre: null, notes: "", createdAt: extra.listedAt, updatedAt: at(-1), ...extra,
  });

  const properties: Property[] = [
    property("p-panenska-2i", t("2-room apartment, Old Town – Panenská", "2-izbový byt, Staré Mesto – Panenská"), {
      transaction: "sale", type: "apartment", status: "reserved", price: 189000, priceHistory: [{ at: at(-75), price: 198000 }, { at: at(-40), price: 189000 }],
      district: t("Old Town", "Staré Mesto"), street: "Panenská", area: 65, rooms: 2, floor: 3, totalFloors: 5, condition: "renovated", energyClass: "B", yearBuilt: 1935,
      features: ["balcony", "cityCentre", "lift", "cellar"], ownerId: "c-kovacova", agentId: "ag-balaz", exclusivity: { type: "exclusive", until: day(60) },
      listedAt: at(-75), portals: portals(["nehnutelnosti", "reality", "topreality", "website"]), photos: 18, stats: { views: 1240, inquiries: 9 },
      cadastre: { titleDeed: "LV 1234", parcel: "7890/2", municipality: t("Staré Mesto", "Staré Mesto") },
      description: t("Bright two-room apartment on the third floor of a renovated 1935 building, balcony to a quiet courtyard, original parquet, new windows.", "Svetlý dvojizbový byt na 3. poschodí zrekonštruovaného domu z roku 1935, balkón do tichého dvora, pôvodné parkety, nové okná."),
    }),
    property("p-travniky-3i", t("3-room apartment, Ružinov – Trávniky", "3-izbový byt, Ružinov – Trávniky"), {
      transaction: "sale", type: "apartment", status: "active", price: 215000, district: "Ružinov", street: "Rezedová", area: 82, rooms: 3, floor: 6, totalFloors: 8, condition: "good", energyClass: "missing", yearBuilt: 1978,
      features: ["loggia", "parking", "nearSchool", "nearTransport"], ownerId: "c-maly", agentId: "ag-hudecova", listedAt: at(-28), portals: portals(["nehnutelnosti", "reality", "website"], ["topreality"]), documents: docs(["energyCertificate"]), photos: 12, stats: { views: 530, inquiries: 4 },
      cadastre: { titleDeed: "LV 2210", parcel: "15296/1", municipality: "Ružinov" },
      description: t("Spacious three-room flat close to schools, shops and the tram, with a parking space; the energy certificate is being arranged.", "Priestranný trojizbový byt pri školách, obchodoch a električke, s parkovacím miestom; energetický certifikát sa vybavuje."),
    }),
    property("p-vysehradska-rent", t("2-room flat to rent, Petržalka – Vyšehradská", "2-izbový byt na prenájom, Petržalka – Vyšehradská"), {
      transaction: "rent", type: "apartment", status: "rented", price: 850, district: "Petržalka", street: "Vyšehradská", area: 55, rooms: 2, floor: 4, totalFloors: 12, condition: "renovated", energyClass: "D", yearBuilt: 1985,
      features: ["furnished", "lift", "nearTransport", "loggia"], ownerId: "c-polak", agentId: "ag-balaz", commission: { basis: "months", value: 1 }, listedAt: at(-200), photos: 10, stats: { views: 980, inquiries: 14 },
      description: t("Furnished two-room flat with a loggia, five minutes from the bus terminal.", "Zariadený dvojizbový byt s lodžiou, päť minút od autobusového terminálu."),
    }),
    property("p-mierova-rent", t("1-room flat to rent, Ružinov – Mierová", "1-izbový byt na prenájom, Ružinov – Mierová"), {
      transaction: "rent", type: "apartment", status: "active", price: 720, district: "Ružinov", street: "Mierová", area: 38, rooms: 1, floor: 2, totalFloors: 4, condition: "new", energyClass: "B", yearBuilt: 2016,
      features: ["furnished", "newBuilding", "parking", "balcony"], ownerId: "c-benova", agentId: "ag-hudecova", commission: { basis: "months", value: 1 }, listedAt: at(-9), portals: portals(["nehnutelnosti", "byty", "website"]), documents: docs(["floorPlan"]), photos: 9, stats: { views: 310, inquiries: 6 },
      description: t("Furnished one-room flat in a 2016 building with a parking space and a balcony; available from the 1st of next month.", "Zariadený jednoizbový byt v novostavbe z roku 2016 s parkovaním a balkónom; voľný od 1. budúceho mesiaca."),
    }),
    property("p-senec-dom", t("Family house, Senec – Slnečné jazerá", "Rodinný dom, Senec – Slnečné jazerá"), {
      transaction: "sale", type: "house", status: "reserved", price: 320000, city: "Senec", district: t("Sunny Lakes", "Slnečné jazerá"), street: "Jazerná", area: 145, landArea: 620, rooms: 4, condition: "new", energyClass: "A1", yearBuilt: 2019,
      features: ["garden", "garage", "quiet", "solar", "terrace"], ownerId: "c-novak", agentId: "ag-kollarova", exclusivity: { type: "exclusive", until: day(20) }, listedAt: at(-110), portals: portals(["nehnutelnosti", "reality", "topreality", "website"]), photos: 24, stats: { views: 2890, inquiries: 17 },
      cadastre: { titleDeed: "LV 5678", parcel: "1234/5", municipality: "Senec" },
      description: t("Detached four-bedroom house from 2019 with a garden, double garage and solar panels, on a quiet street by the lakes.", "Samostatne stojaci štvorizbový dom z roku 2019 so záhradou, dvojgarážou a solárnymi panelmi, v tichej ulici pri jazerách."),
    }),
    property("p-modranka-dom", t("Family house, Trnava – Modranka", "Rodinný dom, Trnava – Modranka"), {
      transaction: "sale", type: "house", status: "active", price: 285000, priceHistory: [{ at: at(-140), price: 299000 }, { at: at(-60), price: 285000 }], city: "Trnava", district: "Modranka", street: "Seredská", region: t("Trnava Region", "Trnavský kraj"), area: 180, landArea: 840, rooms: 5, condition: "original", energyClass: "D", yearBuilt: 1996,
      features: ["garden", "garage", "cellar", "quiet"], ownerId: "c-lukac", agentId: "ag-hudecova", commission: { basis: "percent", value: 2.5 }, listedAt: at(-140), portals: portals(["nehnutelnosti", "reality", "topreality"]), photos: 16, stats: { views: 2100, inquiries: 7 },
      cadastre: { titleDeed: "LV 889", parcel: "402/7", municipality: "Modranka" },
      description: t("Generous five-bedroom house with a large garden and a double garage; needs cosmetic updates.", "Veľkorysý päťizbový dom s veľkou záhradou a dvojgarážou; vyžaduje kozmetické úpravy."),
    }),
    property("p-modra-pozemok", t("Building plot, Modra – Kráľová", "Stavebný pozemok, Modra – Kráľová"), {
      transaction: "sale", type: "land", status: "active", price: 68000, city: "Modra", district: "Kráľová", street: "", area: 1200, landArea: 1200, rooms: 0, condition: "good", energyClass: "missing", features: ["utilities", "quiet"],
      ownerId: "c-sedlak", agentId: "ag-balaz", exclusivity: { type: "exclusive", until: day(120) }, commission: { basis: "percent", value: 4 }, listedAt: at(-45), portals: portals(["nehnutelnosti", "reality"]), documents: docs(["ownerId", "energyCertificate"]), photos: 6, stats: { views: 410, inquiries: 3 },
      cadastre: { titleDeed: "LV 3012", parcel: "6677/3", municipality: "Modra" },
      description: t("Flat plot with planning permission for a family house, utilities at the boundary, access road in place.", "Rovinatý pozemok so stavebným povolením na rodinný dom, siete na hranici, prístupová cesta hotová."),
    }),
    property("p-kosice-1i", t("1-room apartment, Košice – Old Town", "1-izbový byt, Košice – Staré Mesto"), {
      transaction: "sale", type: "apartment", status: "active", price: 95000, city: "Košice", district: t("Old Town", "Staré Mesto"), street: "Zbrojničná", region: t("Košice Region", "Košický kraj"), area: 42, rooms: 1, floor: 1, totalFloors: 4, condition: "renovated", energyClass: "C", yearBuilt: 1962,
      features: ["cityCentre", "nearTransport"], ownerId: "c-horvathova", agentId: "ag-hudecova", listedAt: at(-20), portals: portals(["nehnutelnosti", "reality", "website"]), photos: 11, stats: { views: 720, inquiries: 5 },
      description: t("Fully renovated in 2024; suitable for a young professional or as a buy-to-let.", "Kompletne zrekonštruovaný v roku 2024; vhodný pre mladého profesionála alebo na investíciu."),
    }),
    property("p-chrenova-rent", t("2-room flat to rent, Nitra – Chrenová", "2-izbový byt na prenájom, Nitra – Chrenová"), {
      transaction: "rent", type: "apartment", status: "rented", price: 650, city: "Nitra", district: "Chrenová", street: "Výstavná", region: t("Nitra Region", "Nitriansky kraj"), area: 52, rooms: 2, floor: 3, totalFloors: 7, condition: "good", energyClass: "C", yearBuilt: 1980,
      features: ["lift", "nearSchool", "loggia"], ownerId: "c-polak", agentId: "ag-kollarova", commission: { basis: "months", value: 1 }, listedAt: at(-400), photos: 8, stats: { views: 640, inquiries: 11 },
    }),
    property("p-dubravka-3i", t("3-room apartment, Dúbravka – new build Pod záhradami", "3-izbový byt, Dúbravka – novostavba Pod záhradami"), {
      transaction: "sale", type: "apartment", status: "preparation", price: 268000, district: "Dúbravka", street: "Pod záhradami", area: 78, rooms: 3, floor: 5, totalFloors: 7, condition: "new", energyClass: "A0", yearBuilt: 2026,
      features: ["balcony", "parking", "lift", "newBuilding"], ownerId: "c-dvorska", agentId: "ag-kollarova", exclusivity: { type: "exclusive", until: day(180) }, commission: { basis: "percent", value: 2.5 }, listedAt: at(-3), documents: docs(["titleDeed", "energyCertificate", "photos"]), photos: 0,
      description: t("Developer's unit in a 2026 building; photos and the energy certificate arrive this week.", "Byt od developera v novostavbe z roku 2026; fotografie a energetický certifikát prídu tento týždeň."),
    }),
    property("p-hečkova-2i", t("2-room apartment, Rača – Hečkova", "2-izbový byt, Rača – Hečkova"), {
      transaction: "sale", type: "apartment", status: "sold", price: 172000, district: "Rača", street: "Hečkova", area: 58, rooms: 2, floor: 2, totalFloors: 8, condition: "good", energyClass: "C", yearBuilt: 1982,
      features: ["loggia", "cellar", "nearTransport"], ownerId: "c-vavro", agentId: "ag-balaz", listedAt: at(-95), photos: 14, stats: { views: 1560, inquiries: 12 },
    }),
    property("p-molecova-garaz", t("Garage, Karlova Ves – Molecova", "Garáž, Karlova Ves – Molecova"), {
      transaction: "sale", type: "garage", status: "active", price: 24000, district: "Karlova Ves", street: "Molecova", area: 18, rooms: 0, condition: "good", energyClass: "missing", features: [],
      ownerId: "c-maly", agentId: "ag-balaz", commission: { basis: "fixed", value: 900 }, listedAt: at(-12), portals: portals(["nehnutelnosti"]), documents: docs(["energyCertificate", "floorPlan"]), photos: 4, stats: { views: 150, inquiries: 2 },
    }),
    property("p-polus-office", t("Office to rent, Nové Mesto – Polus", "Kancelária na prenájom, Nové Mesto – Polus"), {
      transaction: "rent", type: "office", status: "active", price: 1450, district: t("Nové Mesto", "Nové Mesto"), street: "Vajnorská", area: 92, rooms: 3, floor: 7, totalFloors: 15, condition: "good", energyClass: "B", yearBuilt: 2008,
      features: ["parking", "lift", "nearTransport"], ownerId: "c-dvorska", agentId: "ag-kollarova", commission: { basis: "months", value: 1 }, listedAt: at(-18), portals: portals(["nehnutelnosti", "website"]), photos: 7, stats: { views: 260, inquiries: 3 },
      description: t("Three-room office on the 7th floor with two parking spaces; open plan possible.", "Trojmiestna kancelária na 7. poschodí s dvoma parkovacími miestami; možný open space."),
    }),
    property("p-jasovska-3i", t("3-room apartment, Petržalka – Jasovská", "3-izbový byt, Petržalka – Jasovská"), {
      transaction: "sale", type: "apartment", status: "sold", price: 205000, district: "Petržalka", street: "Jasovská", area: 74, rooms: 3, floor: 5, totalFloors: 12, condition: "renovated", energyClass: "C", yearBuilt: 1988,
      features: ["loggia", "lift", "nearSchool"], ownerId: "c-zahorska", agentId: "ag-hudecova", listedAt: at(-150), photos: 15, stats: { views: 1980, inquiries: 15 },
    }),
  ];

  const demands: Demand[] = [
    { id: "d-urban", contactId: "c-urban", transaction: "sale", types: ["apartment"], locations: ["Bratislava", "Ružinov", "Nové Mesto"], budgetMin: 160000, budgetMax: 230000, roomsMin: 2, areaMin: 60, mustHaves: ["parking"], status: "qualified", source: "portal", agentId: "ag-hudecova", receivedAt: at(-12, "09:12"), firstResponseAt: at(-12, "10:05"), propertyId: "p-travniky-3i", notes: t("Wants to move by spring; parking is a must.", "Chce sa sťahovať do jari; parkovanie je podmienka."), lostReason: null },
    { id: "d-marekova", contactId: "c-marekova", transaction: "sale", types: ["house"], locations: ["Senec", "Pezinok", "Trnava", "Bratislava"], budgetMin: null, budgetMax: 350000, roomsMin: 4, areaMin: 130, mustHaves: ["garden", "garage"], status: "viewing", source: "website", agentId: "ag-kollarova", receivedAt: at(-30, "19:40"), firstResponseAt: at(-29, "08:15"), propertyId: null, notes: t("Two children, works in Bratislava; commute matters.", "Dve deti, pracuje v Bratislave; dôležitý je dojazd."), lostReason: null },
    { id: "d-tothova", contactId: "c-tothova", transaction: "sale", types: ["apartment"], locations: ["Košice", "Bratislava"], budgetMin: null, budgetMax: 120000, roomsMin: 1, areaMin: null, mustHaves: [], status: "contacted", source: "repeat", agentId: "ag-hudecova", receivedAt: at(-5, "11:00"), firstResponseAt: at(-5, "11:30"), propertyId: "p-kosice-1i", notes: t("Buy-to-let; yield above 5 % expected.", "Investícia na prenájom; očakáva výnos nad 5 %."), lostReason: null },
    { id: "d-bielik", contactId: "c-bielik", transaction: "rent", types: ["apartment"], locations: ["Bratislava", "Petržalka", "Ružinov"], budgetMin: null, budgetMax: 900, roomsMin: 1, areaMin: null, mustHaves: ["furnished"], status: "new", source: "portal", agentId: "ag-hudecova", receivedAt: at(-2, "08:30"), firstResponseAt: null, propertyId: "p-mierova-rent", notes: t("Inquiry from the portal about Mierová: \"Is it still available from the 1st?\"", "Dopyt z portálu na Mierovú: „Je ešte voľný od 1.?“"), lostReason: null },
    { id: "d-farkas", contactId: "c-farkas", transaction: "sale", types: ["apartment"], locations: [t("Old Town", "Staré Mesto"), "Bratislava"], budgetMin: null, budgetMax: 200000, roomsMin: 2, areaMin: 55, mustHaves: ["balcony"], status: "offer", source: "portal", agentId: "ag-balaz", receivedAt: at(-40, "13:20"), firstResponseAt: at(-40, "14:00"), propertyId: "p-panenska-2i", notes: "", lostReason: null },
    { id: "d-kralik", contactId: "c-kralik", transaction: "sale", types: ["house"], locations: ["Senec"], budgetMin: null, budgetMax: 330000, roomsMin: 4, areaMin: null, mustHaves: ["garage"], status: "offer", source: "referral", agentId: "ag-kollarova", receivedAt: at(-80, "16:00"), firstResponseAt: at(-80, "16:20"), propertyId: "p-senec-dom", notes: "", lostReason: null },
    { id: "d-zelenak", contactId: "c-zelenak", transaction: "sale", types: ["apartment"], locations: ["Bratislava"], budgetMin: null, budgetMax: 180000, roomsMin: 2, areaMin: null, mustHaves: [], status: "lost", source: "social", agentId: "ag-hudecova", receivedAt: at(-60), firstResponseAt: at(-60, "12:00"), propertyId: null, notes: "", lostReason: t("Bought through another agency", "Kúpil cez inú kanceláriu") },
    { id: "d-oravec", contactId: "c-oravec", transaction: "rent", types: ["office", "commercial"], locations: ["Bratislava"], budgetMin: null, budgetMax: 1600, roomsMin: null, areaMin: 80, mustHaves: ["parking"], status: "new", source: "phone", agentId: "ag-kollarova", receivedAt: at(0, "07:40"), firstResponseAt: null, propertyId: null, notes: t("Logistics company, 6 people, needs parking for two vans.", "Logistická firma, 6 ľudí, potrebuje parkovanie pre dve dodávky."), lostReason: null },
    { id: "d-hric", contactId: "c-hric", transaction: "sale", types: ["land"], locations: ["Modra", "Pezinok"], budgetMin: null, budgetMax: 80000, roomsMin: null, areaMin: 800, mustHaves: ["utilities"], status: "qualified", source: "walkIn", agentId: "ag-balaz", receivedAt: at(-2, "15:00"), firstResponseAt: at(-2, "15:00"), propertyId: "p-modra-pozemok", notes: "", lostReason: null },
  ];

  const viewings: Viewing[] = [
    { id: "v-urban-travniky", propertyId: "p-travniky-3i", contactId: "c-urban", demandId: "d-urban", agentId: "ag-hudecova", start: at(0, "10:00"), durationMin: 45, status: "scheduled", outcome: null, feedback: "" },
    { id: "v-marekova-modranka", propertyId: "p-modranka-dom", contactId: "c-marekova", demandId: "d-marekova", agentId: "ag-kollarova", start: at(0, "16:30"), durationMin: 60, status: "scheduled", outcome: null, feedback: "" },
    { id: "v-bielik-mierova", propertyId: "p-mierova-rent", contactId: "c-bielik", demandId: "d-bielik", agentId: "ag-hudecova", start: at(1, "17:00"), durationMin: 30, status: "scheduled", outcome: null, feedback: "" },
    { id: "v-hric-modra", propertyId: "p-modra-pozemok", contactId: "c-hric", demandId: "d-hric", agentId: "ag-balaz", start: at(4, "14:00"), durationMin: 45, status: "scheduled", outcome: null, feedback: "" },
    { id: "v-marekova-senec", propertyId: "p-senec-dom", contactId: "c-marekova", demandId: "d-marekova", agentId: "ag-kollarova", start: at(-6, "11:00"), durationMin: 60, status: "done", outcome: "undecided", feedback: t("Loved the garden; hesitant about the commute to Bratislava.", "Záhrada sa im páčila; váhajú kvôli dojazdu do Bratislavy.") },
    { id: "v-farkas-panenska", propertyId: "p-panenska-2i", contactId: "c-farkas", demandId: "d-farkas", agentId: "ag-balaz", start: at(-35, "17:30"), durationMin: 45, status: "done", outcome: "offer", feedback: t("Second viewing with parents; offered 185 000 €.", "Druhá obhliadka s rodičmi; ponúkol 185 000 €.") },
    { id: "v-tothova-kosice", propertyId: "p-kosice-1i", contactId: "c-tothova", demandId: "d-tothova", agentId: "ag-hudecova", start: at(-2, "09:00"), durationMin: 30, status: "noShow", outcome: null, feedback: "" },
  ];

  const stageHistory = (stages: DealStage[], offsets: number[]) => stages.map((stage, i) => ({ stage, at: at(offsets[i] ?? 0) }));
  const checklist = (transaction: Deal["transaction"], done: ChecklistKey[], doneAtOffset = -5) =>
    freshChecklist(transaction).map((item) => (done.includes(item.key) ? { ...item, done: true, doneAt: at(doneAtOffset) } : item));

  const deals: Deal[] = [
    {
      id: "deal-panenska-farkas", propertyId: "p-panenska-2i", demandId: "d-farkas", buyerId: "c-farkas", sellerId: "c-kovacova", transaction: "sale", stage: "reservation", status: "open",
      stageHistory: stageHistory(["offer", "reservation"], [-20, -14]), agreedPrice: 185000, commission: { basis: "percent", value: 3, payer: "seller" }, expectedClose: day(45), agentId: "ag-balaz",
      checklist: checklist("sale", ["offerAccepted", "amlBuyer", "amlSeller", "reservationAgreement", "depositPaid"], -14), reservation: { deposit: 5000, until: day(5) }, financing: null, lostReason: null, closedAt: null,
      notes: t("Buyer pays cash; title deed check pending with the lawyer.", "Kupujúci platí v hotovosti; kontrola listu vlastníctva čaká u advokáta."), createdAt: at(-20),
    },
    {
      id: "deal-senec-kralik", propertyId: "p-senec-dom", demandId: "d-kralik", buyerId: "c-kralik", sellerId: "c-novak", transaction: "sale", stage: "financing", status: "open",
      stageHistory: stageHistory(["offer", "reservation", "contracts", "financing"], [-50, -42, -21, -15]), agreedPrice: 312000, commission: { basis: "percent", value: 3, payer: "seller" }, expectedClose: day(30), agentId: "ag-kollarova",
      checklist: checklist("sale", ["offerAccepted", "amlBuyer", "amlSeller", "reservationAgreement", "depositPaid", "titleDeedChecked", "purchaseContract", "contractsSigned", "mortgageApplied"], -15), reservation: { deposit: 10000, until: day(-20) }, financing: { bank: "Tatra banka", approved: false }, lostReason: null, closedAt: null,
      notes: t("Mortgage decision promised for next week.", "Rozhodnutie o hypotéke prisľúbené na budúci týždeň."), createdAt: at(-50),
    },
    {
      id: "deal-polus-oravec", propertyId: "p-polus-office", demandId: "d-oravec", buyerId: "c-oravec", sellerId: "c-dvorska", transaction: "rent", stage: "offer", status: "open",
      stageHistory: stageHistory(["offer"], [-1]), agreedPrice: 1450, commission: { basis: "months", value: 1, payer: "landlord" }, expectedClose: day(21), agentId: "ag-kollarova",
      checklist: checklist("rent", ["offerAccepted"], -1), reservation: null, financing: null, lostReason: null, closedAt: null, notes: "", createdAt: at(-1),
    },
    {
      id: "deal-heckova-kucerova", propertyId: "p-hečkova-2i", demandId: null, buyerId: "c-kucerova", sellerId: "c-vavro", transaction: "sale", stage: "closed", status: "won",
      stageHistory: stageHistory(["offer", "reservation", "contracts", "financing", "cadastre", "handover", "closed"], [-80, -74, -62, -58, -45, -33, -32]), agreedPrice: 170000, commission: { basis: "percent", value: 3, payer: "seller" }, expectedClose: day(-32), agentId: "ag-balaz",
      checklist: freshChecklist("sale").map((i) => ({ ...i, done: true, doneAt: at(-32) })), reservation: { deposit: 5000, until: day(-60) }, financing: { bank: "VÚB", approved: true }, lostReason: null, closedAt: at(-32, "15:00"), notes: "", createdAt: at(-80),
    },
    {
      id: "deal-jasovska-pavlik", propertyId: "p-jasovska-3i", demandId: null, buyerId: "c-pavlik", sellerId: "c-zahorska", transaction: "sale", stage: "closed", status: "won",
      stageHistory: stageHistory(["offer", "reservation", "contracts", "financing", "cadastre", "handover", "closed"], [-125, -118, -105, -100, -85, -71, -70]), agreedPrice: 205000, commission: { basis: "percent", value: 3, payer: "seller" }, expectedClose: day(-70), agentId: "ag-hudecova",
      checklist: freshChecklist("sale").map((i) => ({ ...i, done: true, doneAt: at(-70) })), reservation: { deposit: 6000, until: day(-100) }, financing: { bank: "Slovenská sporiteľňa", approved: true }, lostReason: null, closedAt: at(-70, "11:00"), notes: "", createdAt: at(-125),
    },
    {
      id: "deal-vysehradska-svec", propertyId: "p-vysehradska-rent", demandId: null, buyerId: "c-svec", sellerId: "c-polak", transaction: "rent", stage: "closed", status: "won",
      stageHistory: stageHistory(["offer", "reservation", "contracts", "handover", "closed"], [-195, -193, -188, -185, -185]), agreedPrice: 850, commission: { basis: "months", value: 1, payer: "landlord" }, expectedClose: day(-185), agentId: "ag-balaz",
      checklist: freshChecklist("rent").map((i) => ({ ...i, done: true, doneAt: at(-185) })), reservation: null, financing: null, lostReason: null, closedAt: at(-185, "12:00"), notes: "", createdAt: at(-195),
    },
    {
      id: "deal-travniky-zelenak", propertyId: "p-travniky-3i", demandId: "d-zelenak", buyerId: "c-zelenak", sellerId: "c-maly", transaction: "sale", stage: "offer", status: "lost",
      stageHistory: stageHistory(["offer"], [-55]), agreedPrice: 205000, commission: { basis: "percent", value: 3, payer: "seller" }, expectedClose: day(-20), agentId: "ag-hudecova",
      checklist: checklist("sale", ["offerAccepted"], -55), reservation: null, financing: null, lostReason: t("Bought through another agency", "Kúpil cez inú kanceláriu"), closedAt: at(-48), notes: "", createdAt: at(-55),
    },
  ];

  const payments = (startMonthOffset: number, months: number, rent: number, unpaidMonths: string[]): Payment[] =>
    Array.from({ length: months }, (_, i) => {
      const key = month(startMonthOffset + i);
      return { id: `pay-${key}`, month: key, due: `${key}-05`, amount: rent, paidAt: unpaidMonths.includes(key) ? null : `${key}-03` };
    });

  const leases: Lease[] = [
    {
      id: "lease-vysehradska-svec", propertyId: "p-vysehradska-rent", tenantId: "c-svec", landlordId: "c-polak", agentId: "ag-balaz", rent: 850, deposit: 850, start: `${month(-6)}-01`, end: `${month(5)}-30`, noticeMonths: 3, utilitiesIncluded: false, status: "active",
      payments: payments(-6, 7, 850, [month(0)]), protocols: [{ id: "prot-svec-in", kind: "moveIn", date: `${month(-6)}-01`, meters: { electricity: 14520, gas: 0, water: 312 }, keys: 3, condition: t("Renovated, no defects; fridge and washing machine included.", "Zrekonštruovaný, bez závad; chladnička a práčka v cene.") , notes: "" }],
      notes: t("Rent for this month not yet received — reminder sent.", "Nájom za tento mesiac ešte neprišiel — poslaná upomienka."),
    },
    {
      id: "lease-chrenova-gajdosova", propertyId: "p-chrenova-rent", tenantId: "c-gajdosova", landlordId: "c-polak", agentId: "ag-kollarova", rent: 650, deposit: 650, start: `${month(-11)}-01`, end: day(45), noticeMonths: 2, utilitiesIncluded: true, status: "ending",
      payments: payments(-11, 12, 650, []), protocols: [{ id: "prot-gajdosova-in", kind: "moveIn", date: `${month(-11)}-01`, meters: { electricity: 8211, gas: 1540, water: 98 }, keys: 2, condition: t("Good condition, worn kitchen worktop noted.", "Dobrý stav, poznamenaná opotrebovaná kuchynská doska."), notes: "" }],
      notes: t("Tenant interested in renewing for another year.", "Nájomníčka má záujem predĺžiť o ďalší rok."),
    },
    {
      id: "lease-mierova-weiss", propertyId: "p-mierova-rent", tenantId: "c-weiss", landlordId: "c-benova", agentId: "ag-hudecova", rent: 700, deposit: 700, start: `${month(-13)}-01`, end: day(-20), noticeMonths: 2, utilitiesIncluded: false, status: "ended",
      payments: payments(-13, 12, 700, []), protocols: [
        { id: "prot-weiss-in", kind: "moveIn", date: `${month(-13)}-01`, meters: { electricity: 2210, gas: 0, water: 44 }, keys: 2, condition: t("New flat, first tenant.", "Nový byt, prvý nájomník."), notes: "" },
        { id: "prot-weiss-out", kind: "moveOut", date: day(-20), meters: { electricity: 4890, gas: 0, water: 131 }, keys: 2, condition: t("Minor scuffs on the hallway wall; deposit returned in full.", "Drobné odery na stene v chodbe; kaucia vrátená v plnej výške."), notes: "" },
      ],
      notes: "",
    },
  ];

  const documents: DocumentItem[] = [
    { id: "doc-panenska-brokerage", templateId: "brokerageExclusive", link: { kind: "property", id: "p-panenska-2i" }, status: "signed", createdAt: at(-75), signedAt: day(-75) },
    { id: "doc-panenska-reservation", templateId: "reservation", link: { kind: "deal", id: "deal-panenska-farkas" }, status: "signed", createdAt: at(-14), signedAt: day(-14) },
    { id: "doc-senec-purchase", templateId: "purchase", link: { kind: "deal", id: "deal-senec-kralik" }, status: "signed", createdAt: at(-21), signedAt: day(-21) },
    { id: "doc-senec-cadastre", templateId: "cadastreFiling", link: { kind: "deal", id: "deal-senec-kralik" }, status: "draft", createdAt: at(-2), signedAt: null },
    { id: "doc-vysehradska-lease", templateId: "lease", link: { kind: "lease", id: "lease-vysehradska-svec" }, status: "signed", createdAt: at(-186), signedAt: day(-186) },
    { id: "doc-mierova-handover", templateId: "handover", link: { kind: "lease", id: "lease-mierova-weiss" }, status: "signed", createdAt: at(-20), signedAt: day(-20) },
    { id: "doc-marekova-gdpr", templateId: "gdprConsent", link: { kind: "contact", id: "c-marekova" }, status: "signed", createdAt: at(-30), signedAt: day(-30) },
    { id: "doc-kralik-aml", templateId: "amlForm", link: { kind: "contact", id: "c-kralik" }, status: "signed", createdAt: at(-48), signedAt: day(-48) },
    { id: "doc-modranka-brokerage", templateId: "brokerageNonExclusive", link: { kind: "property", id: "p-modranka-dom" }, status: "sent", createdAt: at(-3), signedAt: null },
    { id: "doc-polus-lease", templateId: "lease", link: { kind: "deal", id: "deal-polus-oravec" }, status: "draft", createdAt: at(-1), signedAt: null },
  ];

  const tasks: Task[] = [
    { id: "task-lv-panenska", title: t("Check the title deed – Panenská (Farkaš)", "Overiť list vlastníctva – Panenská (Farkaš)"), due: day(-1), done: false, priority: "high", agentId: "ag-balaz", link: { kind: "deal", id: "deal-panenska-farkas" }, createdAt: at(-5) },
    { id: "task-call-bielik", title: t("Call Mr Bielik – Mierová inquiry", "Zavolať p. Bielikovi – dopyt Mierová"), due: day(0), done: false, priority: "high", agentId: "ag-hudecova", link: { kind: "demand", id: "d-bielik" }, createdAt: at(-1) },
    { id: "task-energy-travniky", title: t("Order the energy certificate – Trávniky", "Objednať energetický certifikát – Trávniky"), due: day(2), done: false, priority: "normal", agentId: "ag-hudecova", link: { kind: "property", id: "p-travniky-3i" }, createdAt: at(-3) },
    { id: "task-cadastre-senec", title: t("Prepare the cadastre filing – Senec", "Pripraviť návrh na vklad – Senec"), due: day(3), done: false, priority: "normal", agentId: "ag-kollarova", link: { kind: "deal", id: "deal-senec-kralik" }, createdAt: at(-2) },
    { id: "task-photos-dubravka", title: t("Photo shoot – Dúbravka new build", "Fotenie – novostavba Dúbravka"), due: day(5), done: false, priority: "normal", agentId: "ag-rybar", link: { kind: "property", id: "p-dubravka-3i" }, createdAt: at(-3) },
    { id: "task-renewal-chrenova", title: t("Lease renewal – Gajdošová (Chrenová)", "Predĺženie nájmu – Gajdošová (Chrenová)"), due: day(7), done: false, priority: "normal", agentId: "ag-kollarova", link: { kind: "lease", id: "lease-chrenova-gajdosova" }, createdAt: at(-4) },
    { id: "task-price-modranka", title: t("Propose a price review – Modranka (140 days)", "Navrhnúť úpravu ceny – Modranka (140 dní)"), due: day(0), done: false, priority: "low", agentId: "ag-hudecova", link: { kind: "property", id: "p-modranka-dom" }, createdAt: at(-1) },
    { id: "task-statement-heckova", title: t("Send the commission statement – Hečkova", "Odoslať vyúčtovanie provízie – Hečkova"), due: day(-30), done: true, priority: "normal", agentId: "ag-balaz", link: { kind: "deal", id: "deal-heckova-kucerova" }, createdAt: at(-32) },
  ];

  const activities: Activity[] = [
    { id: "act-1", at: at(0, "07:45"), type: "call", text: t("Oravec Logistics called: office for six, two vans, from January.", "Volal Oravec Logistics: kancelária pre šiestich, dve dodávky, od januára."), link: { kind: "demand", id: "d-oravec" }, agentId: "ag-kollarova" },
    { id: "act-2", at: at(-2, "08:30"), type: "system", text: t("New inquiry from the portal about Mierová.", "Nový dopyt z portálu na Mierovú."), link: { kind: "demand", id: "d-bielik" }, agentId: "ag-hudecova" },
    { id: "act-3", at: at(-1, "14:10"), type: "email", text: t("Sent the non-exclusive brokerage agreement to Mr Lukáč for signature.", "Odoslaná nevýhradná sprostredkovateľská zmluva p. Lukáčovi na podpis."), link: { kind: "property", id: "p-modranka-dom" }, agentId: "ag-hudecova" },
    { id: "act-4", at: at(-2, "09:15"), type: "meeting", text: t("No-show: Ms Tóthová did not come to Zbrojničná.", "Neprišla: p. Tóthová sa na Zbrojničnú nedostavila."), link: { kind: "contact", id: "c-tothova" }, agentId: "ag-hudecova" },
    { id: "act-5", at: at(-3, "16:00"), type: "note", text: t("Developer confirmed the photo shoot and the energy certificate for this week.", "Developer potvrdil fotenie a energetický certifikát na tento týždeň."), link: { kind: "property", id: "p-dubravka-3i" }, agentId: "ag-kollarova" },
    { id: "act-6", at: at(-5, "11:30"), type: "call", text: t("Ms Tóthová: wants a yield above 5 %, Košice preferred.", "P. Tóthová: chce výnos nad 5 %, preferuje Košice."), link: { kind: "demand", id: "d-tothova" }, agentId: "ag-hudecova" },
    { id: "act-7", at: at(-6, "12:30"), type: "meeting", text: t("Viewing in Senec with the Mareks: undecided, commute is the concern.", "Obhliadka v Senci s Marekovcami: váhajú, obava z dojazdu."), link: { kind: "contact", id: "c-marekova" }, agentId: "ag-kollarova" },
    { id: "act-8", at: at(-6, "09:00"), type: "system", text: t("Rent reminder sent to Mr Švec (this month unpaid).", "Upomienka nájmu odoslaná p. Švecovi (tento mesiac neuhradený)."), link: { kind: "lease", id: "lease-vysehradska-svec" }, agentId: "ag-balaz" },
    { id: "act-9", at: at(-14, "17:00"), type: "stage", text: t("Reservation agreement signed; deposit 5 000 € received.", "Podpísaná rezervačná zmluva; prijatý depozit 5 000 €."), link: { kind: "deal", id: "deal-panenska-farkas" }, agentId: "ag-balaz" },
    { id: "act-10", at: at(-15, "10:00"), type: "stage", text: t("Senec: mortgage application filed with Tatra banka.", "Senec: žiadosť o hypotéku podaná v Tatra banke."), link: { kind: "deal", id: "deal-senec-kralik" }, agentId: "ag-kollarova" },
    { id: "act-11", at: at(-20, "13:00"), type: "system", text: t("Move-out protocol signed with Mr Weiss; deposit returned.", "Podpísaný odovzdávací protokol s p. Weissom; kaucia vrátená."), link: { kind: "lease", id: "lease-mierova-weiss" }, agentId: "ag-hudecova" },
    { id: "act-12", at: at(-32, "15:30"), type: "stage", text: t("Hečkova closed: keys handed over, commission 5 100 € invoiced.", "Hečkova uzavretá: kľúče odovzdané, provízia 5 100 € vyfakturovaná."), link: { kind: "deal", id: "deal-heckova-kucerova" }, agentId: "ag-balaz" },
    { id: "act-13", at: at(-40, "10:00"), type: "system", text: t("Panenská: price reduced from 198 000 € to 189 000 €.", "Panenská: cena znížená zo 198 000 € na 189 000 €."), link: { kind: "property", id: "p-panenska-2i" }, agentId: "ag-balaz" },
    { id: "act-14", at: at(-48, "09:00"), type: "stage", text: t("Lost: Mr Zeleňák bought through another agency.", "Stratené: p. Zeleňák kúpil cez inú kanceláriu."), link: { kind: "deal", id: "deal-travniky-zelenak" }, agentId: "ag-hudecova" },
  ];

  return {
    version: WORKSPACE_VERSION,
    seededLocale: locale,
    seededAt: now.toISOString(),
    updatedAt: now.toISOString(),
    settings: {
      agencyName: "Reality Nábrežie",
      ico: "12 345 678",
      address: "Dunajská 12, 811 08 Bratislava",
      mode: "agency",
      currentAgentId: "ag-kollarova",
      saleCommissionPct: 3,
      rentCommissionMonths: 1,
      vatPct: 23,
      leadSlaHours: 24,
      staleDealDays: 14,
      consentMonths: 36,
      portals: ["nehnutelnosti", "reality", "topreality", "byty", "website"],
    },
    agents,
    properties,
    contacts,
    demands,
    viewings,
    deals,
    leases,
    documents,
    tasks,
    activities,
  };
}
