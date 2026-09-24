import { test, expect } from "@playwright/test";
import {
  COUNTRY_CODES,
  ENTITY_KINDS,
  REVENUE_MAX,
  REVENUE_MIN,
  TAX_HIGHLIGHTS,
  estimateTax,
  type TaxEstimate,
} from "../lib/data/tax";

/**
 * BizLaunch CEE tax & levy comparison (OTH-90). Pure — no browser, no Firestore.
 *
 * Expected euro amounts were computed by hand from the 2026 rates recorded in
 * `lib/data/tax.ts`; a changed rate or a changed formula moves one of them, which is the
 * point. Assertions are to the euro (`toBeCloseTo(x, 0)`), not to the cent, because the
 * page shows whole euros.
 */

function eligible(estimate: TaxEstimate) {
  if (!estimate.eligible) throw new Error(`expected an eligible regime, got: ${estimate.reason.en}`);
  return estimate;
}

test.describe("Slovakia", () => {
  test("a company pays 10 % CIT up to €100k revenue, then 7 % on the dividend", () => {
    const e = eligible(estimateTax("SK", "company", 50_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(5_000 + 3_150, 0);
    expect(e.netEur).toBeCloseTo(50_000 - 8_150, 0);
  });

  test("a company above €100k revenue pays 21 % CIT", () => {
    const e = eligible(estimateTax("SK", "company", 150_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(31_500 + 8_295, 0);
  });

  test("a sole trader uses 60 % flat expenses capped at €20k, 15 % PIT and 33.15 % + 16 % levies", () => {
    const e = eligible(estimateTax("SK", "sole", 50_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(12_039.21, 0);
  });

  test("a low-revenue sole trader still pays the minimum monthly contributions", () => {
    const e = eligible(estimateTax("SK", "sole", 10_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(5_100.36, 0);
  });
});

test.describe("Czechia", () => {
  test("a company pays 21 % CIT and 15 % on the dividend", () => {
    const e = eligible(estimateTax("CZ", "company", 100_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(21_000 + 11_850, 0);
  });

  test("a sole trader in the first flat-tax band pays CZK 9,162 a month", () => {
    const e = eligible(estimateTax("CZ", "sole", 40_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(4_506.09, 0);
    expect(e.regime.en).toMatch(/flat tax/i);
  });

  test("above CZK 1.5M revenue the flat tax band is closed and the standard regime applies", () => {
    const e = eligible(estimateTax("CZ", "sole", 100_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(17_950.17, 0);
    expect(e.regime.en).not.toMatch(/flat tax/i);
  });
});

test.describe("Poland", () => {
  test("a company pays 9 % small-taxpayer CIT and 19 % on the dividend", () => {
    const e = eligible(estimateTax("PL", "company", 100_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(9_000 + 17_290, 0);
  });

  test("a sole trader on the 12 % IT ryczałt pays full ZUS and the banded health levy", () => {
    const e = eligible(estimateTax("PL", "sole", 50_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(12_447.14, 0);
    expect(e.regime.en).toMatch(/ryczałt/i);
  });
});

test.describe("Hungary", () => {
  test("a company pays 9 % CIT, 15 % PIT on the dividend and 13 % SZOCHO up to its cap", () => {
    const e = eligible(estimateTax("HU", "company", 100_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(25_400.61, 0);
  });

  test("a sole trader on átalányadó deducts 40 % costs and pays 15 % + 18.5 % + 13 %", () => {
    const e = eligible(estimateTax("HU", "sole", 40_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(8_700.32, 0);
  });

  test("átalányadó is closed above ten times the annual minimum wage", () => {
    const e = estimateTax("HU", "sole", 120_000);
    expect(e.eligible).toBe(false);
  });
});

test.describe("Ukraine", () => {
  test("a TOV pays 18 % CIT, then 5 % PIT and 5 % military levy on the dividend", () => {
    const e = eligible(estimateTax("UA", "company", 100_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(18_000 + 8_200, 0);
  });

  test("a group-3 FOP pays 5 % single tax, 1 % military levy and the fixed ESV", () => {
    const e = eligible(estimateTax("UA", "sole", 50_000));
    expect(e.taxAndLeviesEur).toBeCloseTo(3_446.54, 0);
  });

  test("group 3 is closed above the UAH 10,091,049 revenue limit", () => {
    const e = estimateTax("UA", "sole", 200_000);
    expect(e.eligible).toBe(false);
  });
});

test.describe("every country and entity type", () => {
  const revenues = [REVENUE_MIN, 25_000, 60_000, 99_000, 101_000, 150_000, REVENUE_MAX];

  test("net plus tax is the revenue, and the effective rate is a share of it", () => {
    for (const country of COUNTRY_CODES) {
      for (const entity of ENTITY_KINDS) {
        for (const revenue of revenues) {
          const e = estimateTax(country, entity, revenue);
          if (!e.eligible) continue;
          const label = `${country}/${entity}/${revenue}`;
          expect(e.netEur + e.taxAndLeviesEur, label).toBeCloseTo(revenue, 6);
          expect(e.effectiveRate, label).toBeCloseTo(e.taxAndLeviesEur / revenue, 9);
          expect(e.effectiveRate, label).toBeGreaterThan(0);
          expect(e.effectiveRate, label).toBeLessThan(1);
        }
      }
    }
  });

  test("every result names its regime, or why it is closed, in English and Slovak", () => {
    for (const country of COUNTRY_CODES) {
      for (const entity of ENTITY_KINDS) {
        for (const revenue of revenues) {
          const e = estimateTax(country, entity, revenue);
          const text = e.eligible ? e.regime : e.reason;
          expect(text.en.trim(), `${country}/${entity}/${revenue}`).not.toBe("");
          expect(text.sk.trim(), `${country}/${entity}/${revenue}`).not.toBe("");
        }
      }
    }
  });

  test("every country and entity type lists its key specifics in both languages", () => {
    for (const country of COUNTRY_CODES) {
      for (const entity of ENTITY_KINDS) {
        const items = TAX_HIGHLIGHTS[country][entity];
        expect(items.length, `${country}/${entity}`).toBeGreaterThan(0);
        for (const item of items) {
          expect(item.en.trim()).not.toBe("");
          expect(item.sk.trim()).not.toBe("");
        }
      }
    }
  });
});
