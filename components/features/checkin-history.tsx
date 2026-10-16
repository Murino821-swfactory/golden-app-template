"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthSummary, moveMonth } from "@/lib/checkin-history";
import { DAILY_COPY } from "@/lib/checkin-daily-copy";
import { COPY, type CheckinLocale } from "@/lib/checkin-copy";
import type { CheckinLog, DayKey } from "@/lib/checkin-engine";

export function CheckinHistory({ log, today, locale, onSelect }: {
  log: CheckinLog; today: DayKey; locale: CheckinLocale; onSelect(day: DayKey): void;
}) {
  const c = DAILY_COPY[locale];
  const [picked, setPicked] = useState<string | null>(null);
  const [view, setView] = useState<"days" | "months">("days");
  const month = picked ?? today.slice(0, 7);
  const summary = monthSummary(log, month, today);
  const label = (key: string) => new Intl.DateTimeFormat(COPY[locale].intl, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T12:00:00Z`));
  return <section data-testid="checkin-history" className="space-y-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
    <h2 className="text-base font-semibold">{c.stats}</h2>
    <div className="flex items-center justify-between gap-2">
      <Button variant="outline" size="icon" aria-label={c.previous} onClick={() => setPicked(moveMonth(month, -1))}><ChevronLeft /></Button>
      <label className="min-w-0 text-sm"><span className="sr-only">{c.month}</span><input type="month" aria-label={c.month} value={month} max={today.slice(0, 7)}
        className="max-w-full rounded border bg-background px-2 py-2 [color-scheme:dark]"
        onChange={(e) => { if (/^\d{4}-\d{2}$/.test(e.target.value) && e.target.value <= today.slice(0, 7)) setPicked(e.target.value); }} /></label>
      <Button variant="outline" size="icon" aria-label={c.next} disabled={month >= today.slice(0, 7)} onClick={() => setPicked(moveMonth(month, 1))}><ChevronRight /></Button>
    </div>
    <div className="grid grid-cols-3 gap-3">
      {[[c.active, summary.active], [c.complete, summary.complete], [c.rate, `${summary.rate}%`]].map(([title, value]) =>
        <div key={title}><p className="text-xl font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{title}</p></div>)}
    </div>
    <p className="text-xs text-muted-foreground">{c.denominator}</p>
    <div className="flex gap-2">{(["days", "months"] as const).map((tab) => <Button key={tab} variant={view === tab ? "default" : "outline"} aria-pressed={view === tab} onClick={() => setView(tab)}>{c[tab]}</Button>)}</div>
    <div className="max-h-80 overflow-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{label(month)}</caption>
        <thead><tr><th className="py-2">{view === "days" ? c.date : c.month}</th><th>{view === "days" ? c.progress : c.rate}</th><th>{view === "days" ? c.note : c.active}</th></tr></thead>
        <tbody>{view === "days" ? [...summary.days].reverse().map((day) => <tr key={day.day} className="border-t border-border">
          <td><button className="min-h-11 text-primary underline" onClick={() => { onSelect(day.day); document.getElementById("daily-form")?.scrollIntoView(); }}>{Number(day.day.slice(-2))}.</button></td>
          <td className="whitespace-nowrap tabular-nums">{day.count}/5</td><td className="max-w-36 break-words py-2">{day.note || c.noNote}</td>
        </tr>) : Array.from({ length: 12 }, (_, i) => monthSummary(log, moveMonth(month, -i), today)).map((m) => <tr key={m.month} className="border-t border-border">
          <td><button className="min-h-11 text-primary underline" onClick={() => { setPicked(m.month); setView("days"); }}>{label(m.month)}</button></td>
          <td className="tabular-nums">{m.rate}%</td><td className="tabular-nums">{m.active}/{m.days.length}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
