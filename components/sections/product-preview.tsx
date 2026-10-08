"use client";

import { useTranslations } from "next-intl";
import { useContent, useEntityFields } from "@/hooks/use-content";
import { formatValue } from "@/lib/records";

/**
 * The app itself, in the hero: the model-written sample records drawn the way the grid
 * draws them ("show, don't tell" — spec 2026-09-29 §7). Static — a landing section never
 * loads Firebase — and it renders nothing without a grid and samples.
 */
export function ProductPreview() {
  const t = useTranslations("landing");
  const tg = useTranslations("dataGrid");
  const content = useContent();
  const fields = useEntityFields();
  const samples = content.dataGrid?.sampleRecords;
  if (!samples?.length || fields.length === 0) return null;

  const shown = fields.slice(0, 4);
  const yesNo = { yes: tg("yes"), no: tg("no") };

  return (
    <figure
      data-product-preview
      aria-label={t("previewLabel")}
      className="w-full rounded-2xl border border-border bg-card p-3 text-left shadow-sm sm:p-4"
    >
      <div className="mb-3 flex items-center gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-muted-foreground/40" />
        <span className="size-2.5 rounded-full bg-muted-foreground/40" />
        <span className="size-2.5 rounded-full bg-muted-foreground/40" />
        <span className="ml-2 text-xs font-medium text-muted-foreground">{content.dataGrid?.entityLabel}</span>
      </div>
      <ul className="space-y-2">
        {samples.map((sample, i) => (
          <li key={i} className="rounded-lg border border-border bg-background/60 px-3 py-2">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:text-sm">
              {shown.map((field) => (
                <div key={field.key} className="min-w-0">
                  <dt className="truncate text-muted-foreground">{field.label}</dt>
                  <dd className="truncate font-medium">{formatValue(field, sample[field.key], yesNo)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </figure>
  );
}
