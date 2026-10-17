/**
 * The land map's words, per language. They live here and not in `prototype.config.json`
 * because the section is this prototype's own (it replaces the template's `listings`), and
 * the config schema has no slice for it.
 */
import type { MetricId } from "./land";

export interface LandMapCopy {
  heading: string;
  intro: string;
  openMap: string;
  loading: string;
  loadError: string;
  layerLabel: string;
  metrics: Record<MetricId, { label: string; legend: string }>;
  noData: string;
  pickHint: string;
  detail: {
    locality: string;
    group: string;
    groupHint: string;
    culture: string;
    cell: string;
  };
  notice: string;
  sourcesLabel: string;
  cultures: Record<string, string>;
}

const EN: LandMapCopy = {
  heading: "Slovakia's farmland, hexagon by hexagon",
  intro:
    "Every hexagon aggregates the state's open soil and land-use data: 141,665 BPEJ soil units and 197,506 LPIS land blocks. Zoom in for hexagons of about 5 km².",
  openMap: "Open the map",
  loading: "Loading the map…",
  loadError: "The map could not load. Check your connection and try again.",
  layerLabel: "Map layer",
  metrics: {
    bh: { label: "Soil quality", legend: "BPEJ production potential, points 0–100" },
    arableShare: { label: "Arable share", legend: "Arable land as a share of farmland" },
    avgBlockHa: { label: "Block size", legend: "Average farmed block, hectares" },
    agriShare: { label: "Farmland share", legend: "Farmland as a share of the hexagon" },
  },
  noData: "no data",
  pickHint: "Tap a hexagon to read its numbers.",
  detail: {
    locality: "Locality",
    group: "Quality group",
    groupHint: "1 best – 9 worst",
    culture: "Main culture",
    cell: "Hexagon",
  },
  notice: "No prices or rents: no public data source carries them, so the map does not guess.",
  sourcesLabel: "Sources",
  cultures: {
    "orná pôda": "arable land",
    "trvalý trávny porast": "permanent grassland",
    vinica: "vineyard",
    "ovocný sad": "orchard",
    "trvalé plodiny": "permanent crops",
    chmelnica: "hop garden",
    "zalesnená poľnohospodárska pôda": "afforested farmland",
  },
};

const SK: LandMapCopy = {
  heading: "Pôda Slovenska po hexagónoch",
  intro:
    "Každý hexagón spája otvorené dáta štátu o pôde a jej využití: 141 665 jednotiek BPEJ a 197 506 dielov pôdnych blokov LPIS. Pri priblížení sa mapa rozpadne na hexagóny s plochou asi 5 km².",
  openMap: "Otvoriť mapu",
  loading: "Načítavam mapu…",
  loadError: "Mapu sa nepodarilo načítať. Skontrolujte pripojenie a skúste to znova.",
  layerLabel: "Vrstva mapy",
  metrics: {
    bh: { label: "Kvalita pôdy", legend: "Produkčný potenciál BPEJ, body 0–100" },
    arableShare: { label: "Podiel ornej pôdy", legend: "Orná pôda z poľnohospodárskej pôdy" },
    avgBlockHa: { label: "Veľkosť dielov", legend: "Priemerný obhospodarovaný diel, hektáre" },
    agriShare: { label: "Podiel poľnohosp. pôdy", legend: "Poľnohospodárska pôda z plochy hexagónu" },
  },
  noData: "bez dát",
  pickHint: "Ťuknite na hexagón a uvidíte jeho čísla.",
  detail: {
    locality: "Lokalita",
    group: "Skupina kvality",
    groupHint: "1 najlepšia – 9 najhoršia",
    culture: "Prevažujúca kultúra",
    cell: "Hexagón",
  },
  notice: "Žiadne ceny ani nájomné: nemá ich žiadny verejný zdroj, a tak ich mapa neháda.",
  sourcesLabel: "Zdroje",
  cultures: {},
};

export function landMapCopy(locale: string): LandMapCopy {
  return locale === "sk" ? SK : EN;
}

/** A culture's name in the reader's language; the source's Slovak name is the fallback. */
export function cultureLabel(copy: LandMapCopy, culture: string | null): string {
  if (culture === null) return "–";
  return Object.hasOwn(copy.cultures, culture) ? copy.cultures[culture] : culture;
}
