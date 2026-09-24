import type { Localized } from "@/lib/data/localized";
import { FX } from "@/lib/data/tax";

export const COPY = {
  tools: { en: "Tools", sk: "Nástroje" },
  tabChecklist: { en: "Registration checklist", sk: "Registračný checklist" },
  tabTax: { en: "Tax comparison", sk: "Porovnanie daní a odvodov" },
  country: { en: "Country", sk: "Krajina" },
  entity: { en: "Legal form", sk: "Typ subjektu" },
  company: { en: "Company", sk: "Spoločnosť s r.o." },
  sole: { en: "Sole trader", sk: "Živnosť / fyzická osoba" },
  savedHere: {
    en: "Ticked steps are saved in this browser.",
    sk: "Odškrtnuté kroky sa ukladajú v tomto prehliadači.",
  },
  revenue: { en: "Annual revenue", sk: "Ročné tržby" },
  youKeep: { en: "You keep", sk: "Zostane vám" },
  taxes: { en: "Taxes and levies", sk: "Dane a odvody" },
  effectiveRate: { en: "effective rate", sk: "efektívna sadzba" },
  lowest: { en: "Lowest burden", sk: "Najnižšie zaťaženie" },
  specifics: { en: "Key specifics", sk: "Kľúčové špecifiká" },
  opensInNewTab: { en: "opens in a new tab", sk: "otvorí sa v novej karte" },
  disclaimer: {
    en: `2026 estimate, not tax advice. It assumes a one-person service business with no costs. A company pays CIT and distributes the rest as a dividend; the owner's own social contributions are not included. A sole trader uses the regime shown, including minimum contributions but not first-year reliefs. Converted at ECB and NBU reference rates of 24 September 2026 (€1 = CZK ${FX.CZK}, PLN ${FX.PLN}, HUF ${FX.HUF}, UAH ${FX.UAH}).`,
    sk: `Odhad pre rok 2026, nie daňové poradenstvo. Predpokladá jednočlenné podnikanie v službách bez nákladov. Spoločnosť zaplatí daň PO a zvyšok vyplatí ako dividendu; vlastné sociálne odvody majiteľa nie sú zahrnuté. Živnostník používa uvedený režim vrátane minimálnych odvodov, bez úľav v prvom roku. Prepočet kurzami ECB a NBÚ z 24. septembra 2026 (1 € = ${FX.CZK} CZK, ${FX.PLN} PLN, ${FX.HUF} HUF, ${FX.UAH} UAH).`,
  },
} satisfies Record<string, Localized>;

export function stepsDone(done: number, total: number, locale: string): string {
  return locale === "sk" ? `Hotovo ${done} z ${total} krokov` : `${done} of ${total} steps done`;
}

export function formatEur(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "sk" ? "sk-SK" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(share: number, locale: string): string {
  return new Intl.NumberFormat(locale === "sk" ? "sk-SK" : "en-GB", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(share);
}
