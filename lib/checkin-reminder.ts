/**
 * checkin-reminder.ts — a daily reminder without a push server: a recurring calendar event
 * the visitor adds to the calendar they already use. Pure string building, no DOM.
 *
 * Times are FLOATING (no time zone): "20:30" means half past eight wherever the calendar
 * is, which is what a daily reminder should mean. Web push for installed home-screen apps
 * is the follow-up (sw-factory TASKLIST), not a replacement for this.
 */

export interface ReminderInput {
  /** "HH:MM", 24-hour. */
  time: string;
  /** The first day, "YYYY-MM-DD" (today). */
  from: string;
  title: string;
  description: string;
  url: string;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(time: string): boolean {
  return TIME_RE.test(time);
}

/** "2026-10-13" + "20:30" → "20261013T203000". */
function stamp(day: string, time: string): string {
  return `${day.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

function plusMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h! * 60 + m! + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Google Calendar's event template, recurring daily. Floating times land in the
 * calendar's own zone. */
export function googleCalendarUrl(input: ReminderInput): string {
  const end = plusMinutes(input.time, 10);
  const endDay = end < input.time ? nextDay(input.from) : input.from;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    details: `${input.description}\n${input.url}`,
    dates: `${stamp(input.from, input.time)}/${stamp(endDay, end)}`,
    recur: "RRULE:FREQ=DAILY",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function nextDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + 1));
  return date.toISOString().slice(0, 10);
}

/** RFC 5545 text: backslashes, commas, semicolons and newlines escaped. */
function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded with CRLF + space (RFC 5545 §3.1). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    out.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

/** An .ics file with one daily-recurring event and an alarm at the event's time. */
export function reminderIcs(input: ReminderInput): string {
  const end = plusMinutes(input.time, 10);
  const endDay = end < input.time ? nextDay(input.from) : input.from;
  const host = (() => {
    try {
      return new URL(input.url).host || "unbroken";
    } catch {
      return "unbroken";
    }
  })();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Unbroken//Daily check-in//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:unbroken-daily-checkin@${host}`,
    `DTSTAMP:${stamp(input.from, "00:00")}Z`,
    `DTSTART:${stamp(input.from, input.time)}`,
    `DTEND:${stamp(endDay, end)}`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${icsText(input.title)}`,
    `DESCRIPTION:${icsText(input.description)}`,
    `URL:${input.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(input.title)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
