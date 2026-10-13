/**
 * Days of rest in Slovakia (dni pracovného pokoja, zákon č. 241/1993 Z. z.) for the years the
 * demo calendar covers. A statutory period that ends on a Saturday, Sunday or one of these
 * days ends on the next working day (CSP § 121 ods. 5, and the same rule in the Criminal and
 * Administrative procedure codes).
 *
 * [OVERIŤ každý rok] 2024–2026 amendments: 1 September is a state holiday but no longer a day
 * of rest (since 2024); 17 November likewise; for 2026 only, 8 May and 15 September are
 * working days. Easter dates: Good Friday 3.4.2026 / 26.3.2027, Easter Monday 6.4.2026 /
 * 29.3.2027. A production system reads this calendar from a maintained source, not a file.
 */
export const SK_DAYS_OF_REST: Record<number, string[]> = {
  2026: [
    "2026-01-01", "2026-01-06", "2026-04-03", "2026-04-06", "2026-05-01", "2026-07-05",
    "2026-08-29", "2026-11-01", "2026-12-24", "2026-12-25", "2026-12-26",
  ],
  2027: [
    "2027-01-01", "2027-01-06", "2027-03-26", "2027-03-29", "2027-05-01", "2027-05-08",
    "2027-07-05", "2027-08-29", "2027-09-15", "2027-11-01", "2027-12-24", "2027-12-25",
    "2027-12-26",
  ],
};

const SET = new Set(Object.values(SK_DAYS_OF_REST).flat());

export function isDayOfRest(isoDate: string): boolean {
  return SET.has(isoDate);
}

/** Saturday, Sunday or a day of rest. Works for any year; unknown years have no holidays. */
export function isNonWorkingDay(isoDate: string): boolean {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6 || isDayOfRest(isoDate);
}

export function calendarKnownFor(year: number): boolean {
  return year in SK_DAYS_OF_REST;
}
