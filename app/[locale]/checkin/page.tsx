import type { Metadata } from "next";
import { DailyCheckin } from "@/components/features/daily-checkin";
import { COPY } from "@/lib/checkin-copy";
import { config } from "@/lib/prototype-config";

// Public on purpose: the log lives in the visitor's browser, so there is nothing to sign
// in for. One build ships one locale (en).
const copy = COPY.en;

export const metadata: Metadata = {
  title: `${copy.pageTitle} — ${config.appName}`,
  description: copy.pageIntro,
};

export default function CheckinPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{copy.pageTitle}</h1>
        <p className="text-muted-foreground sm:text-lg">{copy.pageIntro}</p>
      </header>
      <DailyCheckin />
    </div>
  );
}
