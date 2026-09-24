import type { Localized } from "./localized";

/**
 * BizLaunch CEE tax & levy estimate — a simplified 2026 model of a one-person service
 * business (e.g. IT or consulting), shown on the dashboard's comparison tab.
 *
 * Model, stated on the page as well:
 *   · company — all revenue is profit (no costs, no salary), CIT is paid and the rest is
 *     paid out as a dividend; the owner's own social contributions are NOT included.
 *   · sole trader — the regime an IT freelancer typically uses; minimum monthly
 *     contributions ARE included, first-year reliefs are not.
 *   · local currency converted at fixed reference rates (below).
 *
 * Rates verified 2026-09-24 against official and professional sources (SK Finančná
 * správa / Sociálna poisťovňa figures, CZ Finanční správa, PL ZUS 2026 amounts,
 * HU 2026 minimum wage, UA DPS 2026 figures).
 */

export const COUNTRY_CODES = ["SK", "CZ", "PL", "HU", "UA"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const ENTITY_KINDS = ["company", "sole"] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export const REVENUE_MIN = 10_000;
export const REVENUE_MAX = 200_000;
export const REVENUE_STEP = 1_000;

/** Units of local currency per euro — ECB reference 2026-09-24, NBU 2026-09-25 for UAH. */
export const FX = { CZK: 24.399, PLN: 4.3823, HUF: 366.15, UAH: 51.122 } as const;
export const FX_DATE = "2026-09-24";

export type TaxEstimate =
  | {
      eligible: true;
      regime: Localized;
      taxAndLeviesEur: number;
      netEur: number;
      effectiveRate: number;
    }
  | { eligible: false; reason: Localized };

function result(revenueEur: number, taxAndLeviesEur: number, regime: Localized): TaxEstimate {
  return {
    eligible: true,
    regime,
    taxAndLeviesEur,
    netEur: revenueEur - taxAndLeviesEur,
    effectiveRate: taxAndLeviesEur / revenueEur,
  };
}

/** CIT on all revenue, then a dividend tax (or several) on what is left. */
function companyTax(revenue: number, cit: number, dividendRate: number): number {
  const corporate = revenue * cit;
  return corporate + (revenue - corporate) * dividendRate;
}

// ── Slovakia ───────────────────────────────────────────────────────────────────

const SK = {
  citReducedLimit: 100_000,
  dividend: 0.07,
  flatExpenseShare: 0.6,
  flatExpenseCap: 20_000,
  assessmentDivisor: 1.486,
  social: 0.3315,
  health: 0.16,
  minSocialMonthly: 303.11,
  minHealthMonthly: 121.92,
  /** Life minimum 2026: €284.13 → 21× / 92.8× / 44.2× / 176.8×. */
  allowanceFull: 5_966.73,
  allowanceFullUpTo: 26_367.26,
  allowanceTaper: 12_558.55,
  pitUpperThreshold: 50_234.18,
};

function slovakia(entity: EntityKind, revenue: number): TaxEstimate {
  const reduced = revenue <= SK.citReducedLimit;

  if (entity === "company") {
    const cit = reduced ? 0.1 : 0.21;
    return result(revenue, companyTax(revenue, cit, SK.dividend), {
      en: `s.r.o.: ${cit * 100} % CIT + 7 % dividend tax`,
      sk: `s.r.o.: ${cit * 100} % daň PO + 7 % daň z dividend`,
    });
  }

  const profit = revenue - Math.min(revenue * SK.flatExpenseShare, SK.flatExpenseCap);
  const base = profit / SK.assessmentDivisor;
  const social = Math.max(base * SK.social, SK.minSocialMonthly * 12);
  const health = Math.max(base * SK.health, SK.minHealthMonthly * 12);
  const taxBase = Math.max(0, profit - social - health);
  const allowance =
    taxBase <= SK.allowanceFullUpTo
      ? SK.allowanceFull
      : Math.max(0, SK.allowanceTaper - taxBase / 4);
  const taxable = Math.max(0, taxBase - allowance);
  const pit = reduced
    ? taxable * 0.15
    : Math.min(taxable, SK.pitUpperThreshold) * 0.19 +
      Math.max(0, taxable - SK.pitUpperThreshold) * 0.25;

  return result(revenue, social + health + pit, {
    en: `Živnosť: 60 % flat expenses, ${reduced ? "15 %" : "19/25 %"} PIT`,
    sk: `Živnosť: 60 % paušálne výdavky, daň ${reduced ? "15 %" : "19/25 %"}`,
  });
}

// ── Czechia ────────────────────────────────────────────────────────────────────

const CZ = {
  cit: 0.21,
  dividend: 0.15,
  /** Band 1 after the July 2026 cut, retroactive to 1 January. */
  flatTaxBand1Monthly: 9_162,
  /** Band 1 is open up to CZK 1.5M for activities with 60 % or 80 % flat expenses. */
  flatTaxBand1Limit: 1_500_000,
  flatExpenseShare: 0.6,
  flatExpenseCap: 1_200_000,
  social: 0.292 * 0.55,
  health: 0.135 * 0.5,
  minSocialMonthly: 5_005,
  minHealthMonthly: 3_306,
  pitUpperThreshold: 1_762_812,
  taxpayerCredit: 30_840,
};

function czechia(entity: EntityKind, revenueEur: number): TaxEstimate {
  if (entity === "company") {
    return result(revenueEur, companyTax(revenueEur, CZ.cit, CZ.dividend), {
      en: "s.r.o.: 21 % CIT + 15 % dividend tax",
      sk: "s.r.o.: 21 % daň PO + 15 % daň z dividend",
    });
  }

  const revenue = revenueEur * FX.CZK;
  const profit = revenue - Math.min(revenue * CZ.flatExpenseShare, CZ.flatExpenseCap);
  const social = Math.max(profit * CZ.social, CZ.minSocialMonthly * 12);
  const health = Math.max(profit * CZ.health, CZ.minHealthMonthly * 12);
  const pit = Math.max(
    0,
    Math.min(profit, CZ.pitUpperThreshold) * 0.15 +
      Math.max(0, profit - CZ.pitUpperThreshold) * 0.23 -
      CZ.taxpayerCredit
  );
  const standard = social + health + pit;
  const flatTax = CZ.flatTaxBand1Monthly * 12;

  if (revenue <= CZ.flatTaxBand1Limit && flatTax < standard) {
    return result(revenueEur, flatTax / FX.CZK, {
      en: "OSVČ flat tax (paušální daň), band 1",
      sk: "OSVČ paušálna daň, 1. pásmo",
    });
  }
  return result(revenueEur, standard / FX.CZK, {
    en: "OSVČ standard regime, 60 % flat expenses",
    sk: "OSVČ bežný režim, 60 % paušálne výdavky",
  });
}

// ── Poland ─────────────────────────────────────────────────────────────────────

const PL = {
  cit: 0.09,
  dividend: 0.19,
  lumpSumIt: 0.12,
  /** Full ZUS 2026 without voluntary sickness insurance. */
  socialMonthly: 1_788.29,
  healthBands: [
    { upTo: 60_000, monthly: 498.35 },
    { upTo: 300_000, monthly: 830.58 },
    { upTo: Infinity, monthly: 1_495.04 },
  ],
};

function poland(entity: EntityKind, revenueEur: number): TaxEstimate {
  if (entity === "company") {
    return result(revenueEur, companyTax(revenueEur, PL.cit, PL.dividend), {
      en: "Sp. z o.o.: 9 % CIT + 19 % dividend tax",
      sk: "Sp. z o.o.: 9 % daň PO + 19 % daň z dividend",
    });
  }

  const revenue = revenueEur * FX.PLN;
  const social = PL.socialMonthly * 12;
  const health = PL.healthBands.find((band) => revenue <= band.upTo)!.monthly * 12;
  const tax = Math.max(0, revenue - social - health / 2) * PL.lumpSumIt;

  return result(revenueEur, (social + health + tax) / FX.PLN, {
    en: "JDG: 12 % ryczałt (IT services)",
    sk: "JDG: 12 % ryczałt (IT služby)",
  });
}

// ── Hungary ────────────────────────────────────────────────────────────────────

const HU_MIN_WAGE = 322_800;
const HU = {
  cit: 0.09,
  dividendPit: 0.15,
  szocho: 0.13,
  szochoCap: HU_MIN_WAGE * 24,
  costShare: 0.4,
  taxFree: (HU_MIN_WAGE * 12) / 2,
  revenueLimit: HU_MIN_WAGE * 12 * 10,
  pit: 0.15,
  pension: 0.185,
  minBase: HU_MIN_WAGE * 12,
};

function hungary(entity: EntityKind, revenueEur: number): TaxEstimate {
  if (entity === "company") {
    const cit = revenueEur * HU.cit;
    const dividend = revenueEur - cit;
    const szocho = Math.min(dividend, HU.szochoCap / FX.HUF) * HU.szocho;
    return result(revenueEur, cit + dividend * HU.dividendPit + szocho, {
      en: "Kft.: 9 % CIT + 15 % PIT and 13 % SZOCHO on dividends",
      sk: "Kft.: 9 % daň PO + 15 % daň a 13 % SZOCHO z dividend",
    });
  }

  const revenue = revenueEur * FX.HUF;
  if (revenue > HU.revenueLimit) {
    return {
      eligible: false,
      reason: {
        en: "Átalányadó is closed above HUF 38.7M revenue — a Kft. is the usual next step.",
        sk: "Átalányadó sa nedá použiť nad obrat 38,7 mil. HUF — ďalším krokom býva Kft.",
      },
    };
  }

  const taxable = Math.max(0, revenue * (1 - HU.costShare) - HU.taxFree);
  const total =
    taxable * HU.pit +
    Math.max(taxable, HU.minBase) * HU.pension +
    Math.max(taxable, HU.minBase) * HU.szocho;

  return result(revenueEur, total / FX.HUF, {
    en: "Sole trader: átalányadó (40 % deemed costs)",
    sk: "Živnostník: átalányadó (40 % paušálne náklady)",
  });
}

// ── Ukraine ────────────────────────────────────────────────────────────────────

const UA = {
  cit: 0.18,
  dividend: 0.05 + 0.05,
  singleTax: 0.05,
  militaryLevy: 0.01,
  esvMonthly: 1_902.34,
  group3Limit: 10_091_049,
};

function ukraine(entity: EntityKind, revenueEur: number): TaxEstimate {
  if (entity === "company") {
    return result(revenueEur, companyTax(revenueEur, UA.cit, UA.dividend), {
      en: "TOV: 18 % CIT + 5 % PIT and 5 % military levy on dividends",
      sk: "TOV: 18 % daň PO + 5 % daň a 5 % vojenský poplatok z dividend",
    });
  }

  const revenue = revenueEur * FX.UAH;
  if (revenue > UA.group3Limit) {
    return {
      eligible: false,
      reason: {
        en: "Group 3 is closed above UAH 10.09M revenue — a TOV is the usual next step.",
        sk: "3. skupina sa nedá použiť nad obrat 10,09 mil. UAH — ďalším krokom býva TOV.",
      },
    };
  }

  const total = revenue * (UA.singleTax + UA.militaryLevy) + UA.esvMonthly * 12;
  return result(revenueEur, total / FX.UAH, {
    en: "FOP group 3: 5 % single tax + 1 % military levy",
    sk: "FOP 3. skupina: 5 % jednotná daň + 1 % vojenský poplatok",
  });
}

const BY_COUNTRY: Record<CountryCode, (entity: EntityKind, revenueEur: number) => TaxEstimate> = {
  SK: slovakia,
  CZ: czechia,
  PL: poland,
  HU: hungary,
  UA: ukraine,
};

export function estimateTax(
  country: CountryCode,
  entity: EntityKind,
  revenueEur: number
): TaxEstimate {
  return BY_COUNTRY[country](entity, revenueEur);
}

export const TAX_HIGHLIGHTS: Record<CountryCode, Record<EntityKind, Localized[]>> = {
  SK: {
    company: [
      {
        en: "10 % CIT while revenue stays within €100,000, 21 % above it",
        sk: "10 % daň PO pri obrate do 100 000 €, nad ním 21 %",
      },
      {
        en: "Dividends from 2025+ profits: 7 % withholding tax, no health levy",
        sk: "Dividendy zo zisku od roku 2025: 7 % zrážková daň, bez zdravotných odvodov",
      },
      { en: "Minimum share capital €5,000", sk: "Minimálne základné imanie 5 000 €" },
    ],
    sole: [
      {
        en: "15 % income tax while revenue stays within €100,000",
        sk: "15 % daň z príjmov pri obrate do 100 000 €",
      },
      {
        en: "Flat expenses: 60 % of revenue, capped at €20,000 a year",
        sk: "Paušálne výdavky: 60 % z príjmov, najviac 20 000 € ročne",
      },
      {
        en: "Minimum 2026 levies: €303.11 social + €121.92 health a month",
        sk: "Minimálne odvody 2026: 303,11 € sociálne + 121,92 € zdravotné mesačne",
      },
    ],
  },
  CZ: {
    company: [
      {
        en: "21 % CIT, 15 % withholding tax on dividends",
        sk: "21 % daň PO, 15 % zrážková daň z dividend",
      },
      {
        en: "Founding deed must be a notarial deed; minimum capital CZK 1",
        sk: "Zakladateľská listina vo forme notárskej zápisnice; základné imanie od 1 Kč",
      },
    ],
    sole: [
      {
        en: "Flat tax band 1: CZK 9,162 a month covers income tax, social and health",
        sk: "Paušálna daň 1. pásmo: 9 162 Kč mesačne pokrýva daň, sociálne aj zdravotné",
      },
      {
        en: "Band 1 is open up to CZK 1.5M revenue for 60 % flat-expense trades such as IT",
        sk: "1. pásmo platí do obratu 1,5 mil. Kč pri živnostiach so 60 % paušálom (napr. IT)",
      },
      {
        en: "Standard regime: 60 % flat expenses, 15 % PIT, CZK 30,840 taxpayer credit",
        sk: "Bežný režim: 60 % paušálne výdavky, 15 % daň, zľava na poplatníka 30 840 Kč",
      },
    ],
  },
  PL: {
    company: [
      {
        en: "9 % CIT for small taxpayers, 19 % tax on dividends",
        sk: "9 % daň PO pre malých daňovníkov, 19 % daň z dividend",
      },
      {
        en: "A sole shareholder pays ZUS like a sole trader — not included here",
        sk: "Jediný spoločník platí ZUS ako živnostník — v odhade nie je zahrnuté",
      },
    ],
    sole: [
      {
        en: "Ryczałt: 12 % of revenue for IT services, no cost deduction",
        sk: "Ryczałt: 12 % z obratu pri IT službách, bez odpočtu nákladov",
      },
      {
        en: "Full ZUS PLN 1,788.29 a month; new businesses get 6 months free, then 24 months reduced",
        sk: "Plný ZUS 1 788,29 PLN mesačne; nový podnikateľ má 6 mesiacov úľavu a 24 mesiacov znížený ZUS",
      },
      {
        en: "Health levy by revenue band: PLN 498.35 / 830.58 / 1,495.04 a month, half deductible",
        sk: "Zdravotné podľa pásma obratu: 498,35 / 830,58 / 1 495,04 PLN mesačne, polovica odpočítateľná",
      },
    ],
  },
  HU: {
    company: [
      { en: "9 % CIT — one of the lowest in the EU", sk: "9 % daň PO — jedna z najnižších v EÚ" },
      {
        en: "Dividends: 15 % PIT + 13 % SZOCHO until income reaches HUF 7,747,200",
        sk: "Dividendy: 15 % daň + 13 % SZOCHO, kým príjem nedosiahne 7 747 200 HUF",
      },
      {
        en: "Local business tax (up to 2 %) is not included in this estimate",
        sk: "Miestna daň z podnikania (do 2 %) v odhade nie je zahrnutá",
      },
    ],
    sole: [
      {
        en: "Átalányadó: 40 % of revenue counts as costs, the first HUF 1,936,800 of income is tax-free",
        sk: "Átalányadó: 40 % obratu sú náklady, prvých 1 936 800 HUF príjmu je oslobodených",
      },
      {
        en: "Revenue limit HUF 38,736,000 a year (10× the annual minimum wage)",
        sk: "Limit obratu 38 736 000 HUF ročne (10-násobok ročnej minimálnej mzdy)",
      },
      {
        en: "KATA (HUF 50,000 a month) is open only to traders selling to private individuals",
        sk: "KATA (50 000 HUF mesačne) je len pre živnostníkov predávajúcich súkromným osobám",
      },
    ],
  },
  UA: {
    company: [
      { en: "18 % CIT on the general system", sk: "18 % daň PO vo všeobecnom systéme" },
      {
        en: "Dividends: 5 % PIT + 5 % military levy",
        sk: "Dividendy: 5 % daň + 5 % vojenský poplatok",
      },
    ],
    sole: [
      {
        en: "Group 3: 5 % single tax + 1 % military levy on revenue",
        sk: "3. skupina: 5 % jednotná daň + 1 % vojenský poplatok z obratu",
      },
      {
        en: "ESV UAH 1,902.34 a month regardless of income",
        sk: "ESV 1 902,34 UAH mesačne bez ohľadu na príjem",
      },
      {
        en: "Revenue limit UAH 10,091,049 in 2026",
        sk: "Limit obratu 10 091 049 UAH v roku 2026",
      },
    ],
  },
};
