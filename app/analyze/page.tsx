import type { Metadata } from "next";
import { CvMatcher } from "@/components/features/cv-matcher";
import { COPY } from "@/lib/cv-matcher-copy";
import { config } from "@/lib/prototype-config";

// Public on purpose: the analysis runs in the browser and stores nothing, so a visitor
// can try the product without signing in first. One build ships one locale (en).
const copy = COPY.en;

export const metadata: Metadata = {
  title: `${copy.pageTitle} — ${config.appName}`,
  description: copy.pageIntro,
};

export default function AnalyzePage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-2xl space-y-3 print:hidden">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{copy.pageTitle}</h1>
        <p className="text-muted-foreground sm:text-lg">{copy.pageIntro}</p>
      </header>
      <CvMatcher />
    </div>
  );
}
