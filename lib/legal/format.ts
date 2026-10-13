import type { Locale } from "./types";

const DATE_LOCALE: Record<Locale, string> = { sk: "sk-SK", en: "en-GB" };

export function formatDate(isoDate: string, locale: Locale, style: "short" | "long" | "weekday" = "short"): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const opts: Intl.DateTimeFormatOptions =
    style === "long"
      ? { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
      : style === "weekday"
        ? { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" }
        : { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" };
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], opts).format(d);
}

export function formatMonth(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")} min`;
}

export function formatNumber(n: number, locale: Locale, digits = 0): string {
  return new Intl.NumberFormat(DATE_LOCALE[locale], { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

export function percent(n: number, locale: Locale): string {
  return `${formatNumber(Math.round(n * 100), locale)} %`;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((p) => p && !/\.$/.test(p))
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
