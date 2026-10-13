/** format.ts — numbers and dates the way the language on screen writes them. Pure. */
import type { WorkspaceLocale } from "./model";

const tag = (locale: WorkspaceLocale) => (locale === "sk" ? "sk-SK" : "en-GB");

export function formatMoney(amount: number, locale: WorkspaceLocale, fractionDigits = 0): string {
  return new Intl.NumberFormat(tag(locale), { style: "currency", currency: "EUR", maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits }).format(amount);
}

export function formatNumber(value: number, locale: WorkspaceLocale, fractionDigits = 0): string {
  return new Intl.NumberFormat(tag(locale), { maximumFractionDigits: fractionDigits }).format(value);
}

export function formatPercent(value: number, locale: WorkspaceLocale): string {
  return `${new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 1 }).format(value)} %`;
}

export function formatDate(iso: string, locale: WorkspaceLocale): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return new Intl.DateTimeFormat(tag(locale), { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function formatShortDate(iso: string, locale: WorkspaceLocale): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return new Intl.DateTimeFormat(tag(locale), { day: "numeric", month: "short" }).format(d);
}

export function formatTime(iso: string, locale: WorkspaceLocale): string {
  return new Intl.DateTimeFormat(tag(locale), { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: WorkspaceLocale): string {
  return new Intl.DateTimeFormat(tag(locale), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatMonth(month: string, locale: WorkspaceLocale): string {
  return new Intl.DateTimeFormat(tag(locale), { month: "short", year: "2-digit" }).format(new Date(`${month}-01T12:00:00`));
}

export function formatWeekday(iso: string, locale: WorkspaceLocale): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return new Intl.DateTimeFormat(tag(locale), { weekday: "long", day: "numeric", month: "long" }).format(d);
}
