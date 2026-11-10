"use client";

import { useLocale } from "next-intl";
import { useOwnerRole } from "@/hooks/use-owner-role";
import { CAMPAIGN_REPORT_URL } from "@/lib/growth/campaigns";
import { growthCopy } from "@/lib/growth/copy";

/** The owner's door to the campaign report (T-403). Renders nothing for anyone else: the
 * report is the founder's internal reading, and the artifact opens only in his claude.ai. */
export function CampaignLink() {
  const locale = useLocale();
  const { status } = useOwnerRole();
  if (!status) return null;
  const copy = growthCopy(locale).campaigns;
  return (
    <a
      href={CAMPAIGN_REPORT_URL}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 transition-colors hover:bg-primary/15"
      data-testid="campaign-link"
    >
      <span className="block font-semibold text-primary">{copy.link} ↗</span>
      <span className="block text-sm text-muted-foreground">{copy.hint}</span>
    </a>
  );
}
