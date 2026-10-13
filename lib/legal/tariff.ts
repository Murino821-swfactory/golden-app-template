/**
 * Advokátska tarifa — vyhláška MS SR č. 655/2004 Z. z. — and court fees, zákon č. 71/1992 Zb.,
 * as pure functions. Numbers carry their statute reference; the UI labels every result as an
 * orientation figure to be checked against the current text (the decree is amended, and the
 * výpočtový základ changes every January).
 *
 * [FAKT 2026-10-13] Výpočtový základ: the average monthly wage in the first half of the
 * previous year (§ 1 ods. 3): 1 586 € for 2026 (H1 2025, ŠÚ SR), 1 484 € for 2025.
 * [OVERIŤ] The § 10 ods. 1 bands below are the decree's long-standing euro amounts; confirm
 * them on Slov-Lex before quoting a client.
 */

export const TARIFF_BASE_BY_YEAR: Record<number, number> = { 2025: 1484, 2026: 1586 };

export function tariffBaseFor(year: number): number {
  const base = TARIFF_BASE_BY_YEAR[year];
  if (!base) throw new Error(`no výpočtový základ for ${year}`);
  return base;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** § 10 ods. 1: basic rate of the tariff fee for one act, by the value of the matter. */
export function basicRateByValue(value: number): number {
  if (!(value >= 0)) throw new Error("value must be a non-negative number");
  if (value <= 165.97) return 16.6;
  if (value <= 663.88) return round2(16.6 + 1.66 * Math.ceil((value - 165.97) / 33.19));
  if (value <= 6638.78) return round2(41.49 + 9.96 * Math.ceil((value - 663.88) / 331.94));
  if (value <= 33193.92) return round2(220.74 + 16.6 * Math.ceil((value - 6638.78) / 1659.7));
  return round2(486.29 + 6.64 * Math.ceil((value - 33193.92) / 3319.39));
}

/** § 11 ods. 1: one thirteenth of the base when the matter has no monetary value. */
export function nonMonetaryRate(base: number): number {
  return round2(base / 13);
}

/** § 16 ods. 3: the overhead flat fee (režijný paušál) added to every act — 1/100 of the base. */
export function overheadPerAct(base: number): number {
  return round2(base / 100);
}

export interface TariffInput {
  /** Value of the matter in EUR; omit for a matter that has none. */
  value?: number;
  acts: number;
  /** Acts billed at half rate (§ 13a ods. 1 / § 14 ods. 2 — e.g. simple filings). */
  halfRateActs?: number;
  base: number;
  /** § 13 ods. 3 and § 10 ods. 2: lets the lawyer raise up to 3× or lower to ½ by agreement. */
  multiplier?: number;
}

export interface TariffResult {
  ratePerAct: number;
  fullActsTotal: number;
  halfActsTotal: number;
  overhead: number;
  total: number;
}

export function tariffFee(input: TariffInput): TariffResult {
  const multiplier = input.multiplier ?? 1;
  if (multiplier < 0.5 || multiplier > 3) throw new Error("multiplier must be between 0.5 and 3");
  const base = input.value !== undefined ? basicRateByValue(input.value) : nonMonetaryRate(input.base);
  const ratePerAct = round2(base * multiplier);
  const half = input.halfRateActs ?? 0;
  const fullActsTotal = round2(ratePerAct * input.acts);
  const halfActsTotal = round2((ratePerAct / 2) * half);
  const overhead = round2(overheadPerAct(input.base) * (input.acts + half));
  return { ratePerAct, fullActsTotal, halfActsTotal, overhead, total: round2(fullActsTotal + halfActsTotal + overhead) };
}

/**
 * Court fee for a claim with a monetary value — položka 1 písm. a) sadzobníka, 6 % of the
 * value, at least 25 € and at most 25 000 € (50 000 € in commercial matters) since the
 * 1 April 2024 amendment. Filing electronically halves the fee, by at most 50 €.
 * [OVERIŤ] § 6 ods. 3 and the annex on Slov-Lex.
 */
export function courtFee(value: number, options: { commercial?: boolean; electronic?: boolean } = {}): number {
  if (!(value >= 0)) throw new Error("value must be a non-negative number");
  const cap = options.commercial ? 50_000 : 25_000;
  const fee = Math.min(cap, Math.max(25, round2(value * 0.06)));
  if (!options.electronic) return fee;
  return round2(Math.max(fee / 2, fee - 50));
}

/** Format EUR for the locale: `1 586,00 €` in Slovak, `€1,586.00` in English. */
export function formatEur(amount: number, locale: "sk" | "en"): string {
  return new Intl.NumberFormat(locale === "sk" ? "sk-SK" : "en-IE", { style: "currency", currency: "EUR" }).format(amount);
}
