"use client";

import { COUNTRIES } from "@/lib/data/countries";
import { inLocale } from "@/lib/data/localized";
import {
  COUNTRY_CODES,
  REVENUE_MAX,
  REVENUE_MIN,
  REVENUE_STEP,
  TAX_HIGHLIGHTS,
  estimateTax,
  type CountryCode,
  type EntityKind,
} from "@/lib/data/tax";
import { cn } from "@/lib/utils";
import { COPY, formatEur, formatPercent } from "./copy";

interface TaxComparisonProps {
  entity: EntityKind;
  selected: CountryCode;
  locale: string;
  revenue: number;
  onRevenueChange: (revenue: number) => void;
}

export function TaxComparison({
  entity,
  selected,
  locale,
  revenue,
  onRevenueChange,
}: TaxComparisonProps) {
  const rows = COUNTRY_CODES.map((country) => ({
    country,
    estimate: estimateTax(country, entity, revenue),
  }));
  const filled = ((revenue - REVENUE_MIN) / (REVENUE_MAX - REVENUE_MIN)) * 100;
  const bestNet = Math.max(...rows.map((r) => (r.estimate.eligible ? r.estimate.netEur : -Infinity)));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="revenue" className="text-sm">
            {inLocale(COPY.revenue, locale)}
          </label>
          <output
            htmlFor="revenue"
            className="text-2xl font-semibold tabular-nums sm:text-3xl"
            data-testid="revenue-value"
          >
            {formatEur(revenue, locale)}
          </output>
        </div>
        <input
          id="revenue"
          type="range"
          min={REVENUE_MIN}
          max={REVENUE_MAX}
          step={REVENUE_STEP}
          value={revenue}
          onChange={(e) => onRevenueChange(Number(e.target.value))}
          aria-valuetext={formatEur(revenue, locale)}
          style={{
            background: `linear-gradient(to right, var(--foreground) ${filled}%, var(--muted) ${filled}%)`,
          }}
          className={cn(
            "h-2 w-full cursor-pointer appearance-none rounded-full",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-4 focus-visible:ring-offset-background",
            "[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-foreground",
            "[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-foreground"
          )}
        />
        <div className="flex justify-between text-xs tabular-nums">
          <span>{formatEur(REVENUE_MIN, locale)}</span>
          <span>{formatEur(REVENUE_MAX, locale)}</span>
        </div>
      </div>

      <ul className="space-y-3">
        {rows.map(({ country, estimate }) => {
          const meta = COUNTRIES[country];
          const isSelected = country === selected;
          const isBest = estimate.eligible && estimate.netEur === bestNet;
          return (
            <li
              key={country}
              data-testid={`tax-row-${country}`}
              className={cn(
                "space-y-3 rounded-lg border bg-background p-4",
                isSelected && "border-foreground ring-1 ring-foreground"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    <span aria-hidden className="mr-2">
                      {meta.flag}
                    </span>
                    {inLocale(meta.name, locale)}
                    {isBest && (
                      <span className="ml-2 inline-block rounded-full border border-foreground px-2 py-0.5 align-middle text-xs font-medium">
                        {inLocale(COPY.lowest, locale)}
                      </span>
                    )}
                  </p>
                  <p className="text-sm">
                    {estimate.eligible ? inLocale(estimate.regime, locale) : inLocale(estimate.reason, locale)}
                  </p>
                </div>
                {estimate.eligible && (
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-semibold tabular-nums">
                      {formatPercent(estimate.effectiveRate, locale)}
                    </p>
                    <p className="text-xs">{inLocale(COPY.effectiveRate, locale)}</p>
                  </div>
                )}
              </div>

              {estimate.eligible && (
                <>
                  <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className="h-full bg-foreground motion-safe:transition-[width] motion-safe:duration-200"
                      style={{ width: `${(1 - estimate.effectiveRate) * 100}%` }}
                    />
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt>{inLocale(COPY.youKeep, locale)}</dt>
                      <dd className="text-base font-semibold tabular-nums">{formatEur(estimate.netEur, locale)}</dd>
                    </div>
                    <div className="text-right">
                      <dt>{inLocale(COPY.taxes, locale)}</dt>
                      <dd className="font-medium tabular-nums">
                        {formatEur(estimate.taxAndLeviesEur, locale)}
                      </dd>
                    </div>
                  </dl>
                </>
              )}

              <details className="group text-sm">
                <summary className="cursor-pointer rounded-sm underline decoration-foreground/50 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
                  {inLocale(COPY.specifics, locale)}
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
                  {TAX_HIGHLIGHTS[country][entity].map((item) => (
                    <li key={item.en}>{inLocale(item, locale)}</li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>

      <p className="text-xs leading-relaxed">{inLocale(COPY.disclaimer, locale)}</p>
    </div>
  );
}
