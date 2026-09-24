"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { COUNTRIES, ENTITY_NAMES, parseStoredIds } from "@/lib/data/countries";
import { inLocale } from "@/lib/data/localized";
import { COUNTRY_CODES, ENTITY_KINDS, type CountryCode, type EntityKind } from "@/lib/data/tax";
import { cn } from "@/lib/utils";
import { Checklist } from "./checklist";
import { COPY } from "./copy";
import { TaxComparison } from "./tax-comparison";

/**
 * BizLaunch CEE's signed-in workspace (OTH-90): a registration checklist per country and
 * legal form, and a tax & levy comparison across all five countries.
 *
 * Ticked steps live in `localStorage`, per signed-in user and per checklist. Firestore is
 * not an option here: the deployed rules bind `demos/{slug}/**` to the prototype's
 * requester, so any other visitor's write would be refused.
 */

type Tab = "checklist" | "tax";
type Done = Record<string, string[]>;

const storageKey = (uid: string, country: CountryCode, entity: EntityKind) =>
  `bizlaunch:v1:${uid}:${country}:${entity}`;

function loadDone(uid: string): Done {
  const done: Done = {};
  for (const country of COUNTRY_CODES) {
    for (const entity of ENTITY_KINDS) {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(storageKey(uid, country, entity));
      } catch {
        // Storage blocked (private mode, in-app browser): start empty, ticks last this visit.
      }
      done[`${country}:${entity}`] = parseStoredIds(raw);
    }
  }
  return done;
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex gap-1 rounded-lg bg-muted p-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-10 flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
              active ? "bg-foreground text-background" : "text-foreground hover:bg-background/60"
            )}
          >
            {option.label}
            {option.hint && (
              <span className="block text-xs font-normal">{option.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function BizLaunchWorkspace() {
  const locale = useLocale();
  const { user } = useAuth();
  const uid = user?.uid ?? "anonymous";

  const [tab, setTab] = useState<Tab>("checklist");
  const [country, setCountry] = useState<CountryCode>("SK");
  const [entity, setEntity] = useState<EntityKind>("company");
  const [revenue, setRevenue] = useState(60_000);
  const [done, setDone] = useState<Done>(() => loadDone(uid));

  const checklistKey = `${country}:${entity}`;

  function toggleStep(stepId: string) {
    const current = done[checklistKey] ?? [];
    const next = current.includes(stepId)
      ? current.filter((id) => id !== stepId)
      : [...current, stepId];
    setDone({ ...done, [checklistKey]: next });
    try {
      localStorage.setItem(storageKey(uid, country, entity), JSON.stringify(next));
    } catch {
      // Not persisted; the tick still shows for this visit.
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "checklist", label: inLocale(COPY.tabChecklist, locale) },
    { id: "tax", label: inLocale(COPY.tabTax, locale) },
  ];

  return (
    <section className="space-y-6" data-testid="bizlaunch-workspace">
      <div role="tablist" aria-label={inLocale(COPY.tools, locale)} className="flex gap-6 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 pb-3 text-sm font-medium transition-colors sm:text-base",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
              tab === t.id ? "border-foreground font-semibold" : "border-transparent hover:border-foreground/40"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[3fr_2fr]">
        <Segmented
          label={inLocale(COPY.country, locale)}
          value={country}
          onChange={setCountry}
          options={COUNTRY_CODES.map((code) => ({
            value: code,
            label: `${COUNTRIES[code].flag} ${code}`,
          }))}
        />
        <Segmented
          label={inLocale(COPY.entity, locale)}
          value={entity}
          onChange={setEntity}
          options={ENTITY_KINDS.map((kind) => ({
            value: kind,
            label: inLocale(COPY[kind], locale),
            hint: ENTITY_NAMES[country][kind],
          }))}
        />
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "checklist" ? (
          <>
            <h2 className="mb-4 text-lg font-semibold">
              {inLocale(COUNTRIES[country].name, locale)}: {ENTITY_NAMES[country][entity]}
            </h2>
            <Checklist
              country={country}
              entity={entity}
              locale={locale}
              done={done[checklistKey] ?? []}
              onToggle={toggleStep}
            />
          </>
        ) : (
          <TaxComparison
            entity={entity}
            selected={country}
            locale={locale}
            revenue={revenue}
            onRevenueChange={setRevenue}
          />
        )}
      </div>
    </section>
  );
}
