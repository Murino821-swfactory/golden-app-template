"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { PublishBar } from "@/components/studio/publish-bar";
import { usePublishReceipt } from "@/components/studio/use-publish-receipt";
import { growthCopy } from "@/lib/growth/copy";
import { ideaContent, mondayOf, shiftWeek, weekPlan } from "@/lib/growth/plan";
import { couponStore } from "@/lib/growth/store";
import { localePath } from "@/lib/locale-routing";
import type { ScenarioContent } from "@/lib/studio/channels";
import { useBrowserValue } from "@/lib/studio/client-store";
import { studioCopy } from "@/lib/studio/copy";
import { cn } from "@/lib/utils";
import { LeadsPanel } from "./leads-panel";
import { PlanPanel } from "./plan-panel";
import { ProfilePanel } from "./profile-panel";
import { ReportPanel } from "./report-panel";

export type GrowthTab = "plan" | "profile" | "report" | "leads";
const TABS: GrowthTab[] = ["plan", "profile", "report", "leads"];

/** Until the browser says otherwise — the published address of this page. */
const FALLBACK_PAGE_URL = "https://apps.tokenwise.sk/newapp/gitpulse-studio/growth";

/**
 * The growth plan: four panels and the studio's publish bar. The plan, the profile kit
 * and the report each hand a piece of content to the bar; the leads panel sends e-mails
 * instead. The week on screen comes from the browser's clock (the page is a static
 * export, so the server cannot know it); until hydration there is no week and no card.
 */
export function Growth() {
  const locale = useLocale();
  const copy = growthCopy(locale);
  const studio = studioCopy(locale);
  const { user, log, queued, onPublished } = usePublishReceipt();
  const [tab, setTab] = useState<GrowthTab>("plan");
  const [picked, setPicked] = useState<ScenarioContent | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const pageUrl = useBrowserValue(() => window.location.origin + window.location.pathname, FALLBACK_PAGE_URL);
  const today = useBrowserValue(() => new Date().toISOString().slice(0, 10), "");
  const coupon = couponStore.use();
  const thisWeek = today ? mondayOf(today) : "";
  const week = thisWeek ? shiftWeek(thisWeek, weekOffset) : "";

  // Nothing picked yet: the first slot of the week on screen is in the bar.
  const content = picked ?? (week ? ideaContent(weekPlan(week)[0]!.idea, copy, { coupon }) : null);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">{copy.kicker}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{copy.intro}</p>
        <p className="mt-2 text-sm font-medium text-primary">{copy.goal}</p>
      </header>

      <div role="tablist" aria-label={copy.title} className="grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-card p-1 sm:flex">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`growth-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`growth-panel-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {copy.tabs[id]}
          </button>
        ))}
      </div>

      <section id="growth-panel-plan" role="tabpanel" aria-labelledby="growth-tab-plan" hidden={tab !== "plan"}>
        <PlanPanel copy={copy} week={week} thisWeek={thisWeek} onWeek={setWeekOffset} log={log} coupon={coupon} pickedRef={content?.ref ?? null} onPick={setPicked} />
      </section>
      <section id="growth-panel-profile" role="tabpanel" aria-labelledby="growth-tab-profile" hidden={tab !== "profile"}>
        <ProfilePanel copy={copy} pickedRef={content?.ref ?? null} onPick={setPicked} />
      </section>
      <section id="growth-panel-report" role="tabpanel" aria-labelledby="growth-tab-report" hidden={tab !== "report"}>
        <ReportPanel copy={copy} week={week} log={log} pickedRef={content?.ref ?? null} onPick={setPicked} />
      </section>
      <section id="growth-panel-leads" role="tabpanel" aria-labelledby="growth-tab-leads" hidden={tab !== "leads"}>
        <LeadsPanel copy={copy} today={today} />
      </section>

      <PublishBar copy={studio} content={content} clip={null} pageUrl={pageUrl} onPublished={onPublished} />

      <p className="text-xs text-muted-foreground">
        {user ? (
          <>
            {queued ? `${studio.publish.queueSaved} ` : ""}
            <Link href={localePath(locale, "/dashboard")} className="text-primary underline-offset-4 hover:underline">
              {studio.publish.queueOpen}
            </Link>
          </>
        ) : (
          <Link href={localePath(locale, "/login")} className="text-primary underline-offset-4 hover:underline">
            {studio.publish.queueSignIn}
          </Link>
        )}
        {" · "}
        <Link href={localePath(locale, "/studio")} className="text-primary underline-offset-4 hover:underline">
          {studio.dashboard.studioLink}
        </Link>
      </p>
    </div>
  );
}
