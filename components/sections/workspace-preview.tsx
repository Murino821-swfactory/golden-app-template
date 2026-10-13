"use client";

import { AlarmClock, Briefcase, Gavel, Receipt } from "lucide-react";

/**
 * The hero's product visual: a still of the workspace overview, drawn from fixed copy so the
 * static export and the browser agree on every character (no dates computed at render).
 * Decorative for assistive tech — the headline says what it shows.
 */
export function WorkspacePreview({ locale }: { locale: string }) {
  const sk = locale === "sk";
  const stats = [
    { icon: Briefcase, label: sk ? "Otvorené spisy" : "Open matters", value: "11" },
    { icon: AlarmClock, label: sk ? "Lehoty do 7 dní" : "Deadlines in 7 days", value: "4", hint: sk ? "1 po termíne" : "1 overdue", danger: true },
    { icon: Gavel, label: sk ? "Pojednávania" : "Hearings", value: "3" },
    { icon: Receipt, label: sk ? "Nefakturované" : "Unbilled", value: "4 920 €" },
  ];
  const agenda = sk
    ? [
        { when: "dnes 11:00", kind: "Stretnutie", title: "Green Energy — prevod obchodného podielu", tone: "neutral" },
        { when: "zajtra 14:00", kind: "Konzultácia", title: "Delta Pharm — GDPR audit, prezentácia zistení", tone: "neutral" },
        { when: "št 09:00", kind: "Pojednávanie", title: "Kováč — vrátenie zálohy · Okresný súd Trnava, č. 14", tone: "accent" },
        { when: "pi", kind: "Lehota", title: "Replika k vyjadreniu žalovaného · 2026/0028", tone: "danger" },
      ]
    : [
        { when: "today 11:00", kind: "Meeting", title: "Green Energy — share transfer", tone: "neutral" },
        { when: "tomorrow 14:00", kind: "Consultation", title: "Delta Pharm — GDPR audit findings", tone: "neutral" },
        { when: "Thu 09:00", kind: "Hearing", title: "Kováč — deposit refund · District Court Trnava, room 14", tone: "accent" },
        { when: "Fri", kind: "Deadline", title: "Reply to the defendant's statement · 2026/0028", tone: "danger" },
      ];
  return (
    <div data-workspace-preview aria-hidden className="w-full max-w-xl select-none rounded-2xl border border-border bg-background/80 p-3 shadow-2xl shadow-black/40 backdrop-blur sm:p-4">
      <div className="mb-3 flex items-center justify-between text-[0.65rem] uppercase tracking-widest text-muted-foreground">
        <span>{sk ? "Prehľad · Hronec & Partners" : "Overview · Hronec & Partners"}</span>
        <span>{sk ? "utorok 13. októbra" : "Tuesday 13 October"}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-2">
            <s.icon className="size-3.5 text-muted-foreground" aria-hidden />
            <p className={`mt-1 font-heading text-base font-semibold tabular-nums sm:text-lg ${s.danger ? "text-destructive" : ""}`}>{s.value}</p>
            <p className="truncate text-[0.6rem] text-muted-foreground">{s.hint ?? s.label}</p>
          </div>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {agenda.map((a) => (
          <li key={a.title} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
            <span className="w-16 shrink-0 truncate tabular-nums text-muted-foreground sm:w-20">{a.when}</span>
            <span className="min-w-0 flex-1 truncate">{a.title}</span>
            <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[0.6rem] ${a.tone === "accent" ? "border-primary bg-primary text-primary-foreground" : a.tone === "danger" ? "border-destructive/60 text-destructive" : "border-border text-muted-foreground"}`}>{a.kind}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
